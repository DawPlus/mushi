import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { BridgeService, bridgeService } from './bridge.service.js'
import { devStart, devStatus, devStop } from './dev-manager.js'
import { onionProfiles } from './onion-profiles.js'
import { tunnelStart, tunnelStop, tunnelStatus } from './onion-runner.js'

const DEFAULT_LOG_LIMIT = 50
const SAFE_LABEL_REGEX = /^[a-zA-Z0-9_-]{1,64}$/

export type BridgeOwnerStatus = {
  state: 'idle' | 'running' | 'error'
  configuredLabels: string[]
  workspaces: string[]
  activeLabel: string | null
  workspace: string | null
  startedAt: string | null
  stoppedAt: string | null
  lastError: string | null
  recentLogs: string[]
}

export type BridgeManagerOptions = {
  bridgeService?: BridgeService
  workspacesConfig?: string
  logLimit?: number
}

/**
 * Parses MUSHI_BRIDGE_WORKSPACES JSON fail-closed.
 * Accepts only safe public labels mapped to non-empty path strings.
 */
export function parseBridgeWorkspaces(raw?: string): Record<string, string> {
  const source = raw ?? process.env.MUSHI_BRIDGE_WORKSPACES
  if (typeof source !== 'string' || !source.trim()) return {}

  try {
    const parsed = JSON.parse(source)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) continue
      if (!SAFE_LABEL_REGEX.test(key)) continue
      if (typeof value !== 'string' || !value.trim()) continue
      result[key] = value.trim()
    }
    return result
  } catch {
    return {}
  }
}

/** Redacts absolute filesystem paths and sensitive credentials from logs/diagnostics. */
function sanitizeDiagnostic(input: unknown): string {
  if (input === null || input === undefined) return ''
  const str = input instanceof Error ? input.message : String(input)

  return str
    // Redact tokens and long hex/base64-like keys
    .replace(/(?:Bearer\s+)[^\s]+/gi, 'Bearer [REDACTED]')
    .replace(/[a-f0-9]{32,}/gi, '[REDACTED_SECRET]')
    // Redact POSIX and Windows absolute paths
    .replace(/(?:\/[a-zA-Z0-9_.-]+){2,}/g, '[path]')
    .replace(/[a-zA-Z]:\\[a-zA-Z0-9_.-\\]+/g, '[path]')
}

@Injectable()
export class BridgeManagerService {
  private readonly bridge: BridgeService
  private readonly workspacesConfig?: string
  private readonly logLimit: number

  private state: 'idle' | 'running' | 'error' = 'idle'
  private activeLabel: string | null = null
  private startedAt: string | null = null
  private stoppedAt: string | null = null
  private lastError: string | null = null
  private readonly recentLogs: string[] = []
  private transitionLock: Promise<void> = Promise.resolve()

  constructor(options: BridgeManagerOptions = {}) {
    this.bridge = options.bridgeService ?? bridgeService
    this.workspacesConfig = options.workspacesConfig
    this.logLimit = options.logLimit ?? DEFAULT_LOG_LIMIT
  }

  private getConfiguredWorkspaces(): Record<string, string> {
    return parseBridgeWorkspaces(this.workspacesConfig)
  }

  private pushLog(message: string): void {
    const entry = `[${new Date().toISOString()}] ${sanitizeDiagnostic(message)}`
    this.recentLogs.push(entry)
    while (this.recentLogs.length > this.logLimit) {
      this.recentLogs.shift()
    }
  }

  private async withTransitionLock<T>(action: () => Promise<T>): Promise<T> {
    const previous = this.transitionLock
    let resolveLock!: () => void
    this.transitionLock = new Promise<void>((resolve) => {
      resolveLock = resolve
    })
    try {
      await previous
      return await action()
    } finally {
      resolveLock()
    }
  }

  getStatus(): BridgeOwnerStatus {
    const configured = this.getConfiguredWorkspaces()
    const labels = Object.keys(configured).sort()

    return {
      state: this.state,
      configuredLabels: labels,
      workspaces: labels,
      activeLabel: this.activeLabel,
      workspace: this.activeLabel,
      startedAt: this.startedAt,
      stoppedAt: this.stoppedAt,
      lastError: this.lastError ? sanitizeDiagnostic(this.lastError) : null,
      recentLogs: [...this.recentLogs],
    }
  }

  /** Browse only folders underneath the configured Mac workspace root. Never return absolute paths. */
  private async browseRoot(): Promise<string> {
    return fs.realpath(process.env.MUSHI_BRIDGE_BROWSE_ROOT || path.join(os.homedir(), 'workspace'))
  }

  private async resolveDirectory(relative: string): Promise<string> {
    if (typeof relative !== 'string' || relative.includes('\\') || relative.includes('\0') || path.isAbsolute(relative)) {
      throw new BadRequestException('Invalid directory')
    }
    const root = await this.browseRoot()
    const target = await fs.realpath(path.resolve(root, relative)).catch(() => {
      throw new NotFoundException('Folder not found')
    })
    if (target !== root && !target.startsWith(root + path.sep)) {
      throw new BadRequestException('Folder outside permitted workspace root')
    }
    if (!(await fs.stat(target)).isDirectory()) throw new BadRequestException('Not a directory')
    return target
  }

  async browse(directory = ''): Promise<{ directory: string; folders: string[] }> {
    const target = await this.resolveDirectory(directory)
    const root = await this.browseRoot()
    const names = await fs.readdir(target, { withFileTypes: true })
    const folders: string[] = []
    for (const entry of names) {
      if (entry.name.startsWith('.')) continue
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
      const child = path.join(target, entry.name)
      const actual = await fs.realpath(child).catch(() => null)
      if (actual && (actual === root || actual.startsWith(root + path.sep)) &&
          (await fs.stat(actual).catch(() => null))?.isDirectory()) folders.push(entry.name)
    }
    return { directory: path.relative(root, target), folders: folders.sort((a, b) => a.localeCompare(b)) }
  }

  /** Open the macOS host's native folder picker; only accept paths under the permitted root. */
  async pickWorkspace(): Promise<{ cancelled: boolean; directory: string | null }> {
    if (process.platform !== 'darwin') {
      throw new BadRequestException('Native folder selection requires macOS')
    }
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const run = promisify(execFile)
    try {
      const { stdout } = await run('osascript', [
        '-e', 'POSIX path of (choose folder with prompt "Select a Mushi workspace folder")',
      ], { timeout: 120000 })
      const selected = stdout.trim()
      const root = await this.browseRoot()
      const canonical = await fs.realpath(selected)
      if (canonical !== root && !canonical.startsWith(root + path.sep)) {
        throw new BadRequestException('Selected folder is outside the permitted workspace root')
      }
      const directory = path.relative(root, canonical)
      await this.resolveDirectory(directory)
      return { cancelled: false, directory }
    } catch (error) {
      if (error instanceof BadRequestException) throw error
      const message = String((error as Error)?.message ?? '')
      if (/User canceled|User cancelled|(-128)/i.test(message)) {
        return { cancelled: true, directory: null }
      }
      throw new BadRequestException('Native folder picker unavailable on the Mac host')
    }
  }

  private async flags(): Promise<Record<string, { favorite?: boolean; hidden?: boolean }>> {
    const result: Record<string, { favorite?: boolean; hidden?: boolean }> = {}
    const root = await this.browseRoot()
    // Read original Onion preferences without altering them.
    try {
      const source = JSON.parse(await fs.readFile(path.join(os.homedir(), '.onion-bridge', 'web.json'), 'utf8')) as Record<string, unknown>
      for (const [property, flag] of [['favorites', 'favorite'], ['hidden', 'hidden']] as const) {
        const paths = source[property]
        if (!Array.isArray(paths)) continue
        for (const item of paths) {
          if (typeof item !== 'string') continue
          const relative = path.relative(root, path.resolve(item))
          if (!relative || relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) continue
          result[relative] = { ...result[relative], [flag]: true }
        }
      }
    } catch { /* original preferences optional */ }
    try {
      const parsed: unknown = JSON.parse(await fs.readFile(path.join(os.homedir(), '.mushi', 'bridge-flags.json'), 'utf8'))
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [key, value] of Object.entries(parsed)) {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            const settings = value as Record<string, unknown>
            result[key] = {
              ...result[key],
              ...(typeof settings.favorite === 'boolean' ? { favorite: settings.favorite } : {}),
              ...(typeof settings.hidden === 'boolean' ? { hidden: settings.hidden } : {}),
            }
          }
        }
      }
    } catch { /* no overrides yet */ }
    return result
  }

  async projects(directory: string) {
    const root = await this.resolveDirectory(directory)
    const entries = await fs.readdir(root, { withFileTypes: true })
    const flags = await this.flags()
    const profiles = await onionProfiles()
    const projects = []
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') ||
        ['node_modules', 'dist', 'build', 'coverage'].includes(entry.name)) continue
      const joined = path.join(root, entry.name)
      const target = await fs.realpath(joined).catch(() => null)
      if (!target) continue
      if (!(await fs.stat(path.join(target, 'package.json')).catch(() => null))?.isFile()) continue
      const key = path.relative(await this.browseRoot(), target)
      const flag = flags[key] ?? {}
      const profile = profiles.find(item => item.workspace === target)
      projects.push({
        id: key, name: entry.name, favorite: flag.favorite === true, hidden: flag.hidden === true,
        tunnel: tunnelStatus(target)?.state === 'running' || (this.bridge.isActive() && this.bridge.getActiveWorkspace() === target) || profile?.running ? 'running' : 'idle',
        profile: profile?.name ?? null,
        tunnelPort: profile?.running ? profile.port : null,
        external: Boolean(profile?.running && !tunnelStatus(target)),
        managedTunnel: Boolean(tunnelStatus(target)),
        tunnelLogs: tunnelStatus(target)?.logs ?? [],
        dev: devStatus(target),
      })
    }
    return { projects: projects.sort((a, b) =>
      Number(b.tunnel === 'running') - Number(a.tunnel === 'running') ||
      Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name)) }
  }

  async setProjectFlag(id: string, flag: 'favorite' | 'hidden', value: boolean) {
    const target = await this.resolveDirectory(id)
    if (!(await fs.stat(path.join(target, 'package.json')).catch(() => null))?.isFile()) {
      throw new BadRequestException('Not a project')
    }
    const root = await this.browseRoot()
    const key = path.relative(root, target)
    const flags = await this.flags()
    flags[key] = { ...flags[key], [flag]: value }
    const folder = path.join(os.homedir(), '.mushi')
    await fs.mkdir(folder, { recursive: true, mode: 0o700 })
    await fs.writeFile(path.join(folder, 'bridge-flags.json'), JSON.stringify(flags), { mode: 0o600 })
    return { ok: true }
  }

  async configuration() {
    const profiles = await onionProfiles()
    const cli = process.env.MUSHI_ONION_CLI_ENTRY || path.join(os.homedir(), 'workspace', 'Onion-Bridge', 'dist', 'cli.js')
    const defaultFile = path.join(os.homedir(), '.onion-bridge', 'profiles', 'default.json')
    const defaults = JSON.parse(await fs.readFile(defaultFile, 'utf8').catch(() => '{}')) as Record<string, unknown>
    return {
      cliReady: Boolean((await fs.stat(cli).catch(() => null))?.isFile()),
      defaultTunnelReady: typeof defaults.tunnelId === 'string' && defaults.tunnelId.startsWith('tunnel_'),
      profiles: profiles.map(p => ({ name: p.name, running: p.running, port: p.port })),
    }
  }

  async tunnelAction(directory: string, action: 'start' | 'stop') {
    const target = await this.resolveDirectory(directory)
    if (!(await fs.stat(path.join(target, 'package.json')).catch(() => null))?.isFile()) throw new BadRequestException('Not a project')
    return action === 'start' ? tunnelStart(target) : tunnelStop(target)
  }

  async devAction(directory: string, action: 'start' | 'stop') {
    const target = await this.resolveDirectory(directory)
    if (!(await fs.stat(path.join(target, 'package.json')).catch(() => null))?.isFile()) throw new BadRequestException('Not a project')
    return action === 'start' ? devStart(target) : devStop(target)
  }

  async startDirectory(directory: string): Promise<BridgeOwnerStatus> {
    return this.withTransitionLock(async () => {
      if (this.state === 'running' || this.bridge.isActive() || this.activeLabel !== null) {
        throw new ConflictException('Bridge workspace already active')
      }
      const target = await this.resolveDirectory(directory)
      if ((await onionProfiles()).some(profile => profile.workspace === target && profile.running)) {
        throw new ConflictException('Original Onion Bridge is already running for this project')
      }
      try {
        await this.bridge.activate(target)
        this.state = 'running'
        this.activeLabel = path.basename(target)
        this.startedAt = new Date().toISOString()
        this.stoppedAt = null
        this.lastError = null
        this.pushLog('Activated selected workspace')
        return this.getStatus()
      } catch (error) {
        this.state = 'error'
        this.lastError = sanitizeDiagnostic(error)
        throw new BadRequestException('Failed to activate workspace')
      }
    })
  }

  async start(workspaceLabel: string): Promise<BridgeOwnerStatus> {
    return this.withTransitionLock(async () => {
      if (this.state === 'running' || this.bridge.isActive() || this.activeLabel !== null) {
        throw new ConflictException(
          'Bridge workspace already active. Stop the current workspace first.',
        )
      }

      const configured = this.getConfiguredWorkspaces()
      const targetPath = configured[workspaceLabel]
      if (!targetPath) {
        throw new NotFoundException('Workspace not found')
      }

      let canonical: string
      try {
        canonical = await fs.realpath(targetPath)
      } catch (err: unknown) {
        const error = err as { code?: string }
        if (error?.code === 'ENOENT') {
          throw new NotFoundException('Workspace directory does not exist')
        }
        throw new BadRequestException('Workspace directory cannot be accessed')
      }

      try {
        const stat = await fs.stat(canonical)
        if (!stat.isDirectory()) {
          throw new BadRequestException('Workspace target is not a directory')
        }
      } catch (err: unknown) {
        if (err instanceof BadRequestException) throw err
        throw new BadRequestException('Workspace directory cannot be accessed')
      }

      try {
        await this.bridge.activate(canonical)
        this.state = 'running'
        this.activeLabel = workspaceLabel
        this.startedAt = new Date().toISOString()
        this.stoppedAt = null
        this.lastError = null
        this.pushLog(`Activated workspace '${workspaceLabel}'`)
        return this.getStatus()
      } catch (err: unknown) {
        this.state = 'error'
        this.activeLabel = null
        const sanitized = sanitizeDiagnostic(err)
        this.lastError = sanitized
        this.pushLog(`Failed to activate workspace '${workspaceLabel}': ${sanitized}`)
        throw new BadRequestException('Failed to activate workspace')
      }
    })
  }

  async stop(): Promise<BridgeOwnerStatus> {
    return this.withTransitionLock(async () => {
      const prevLabel = this.activeLabel
      const wasActive = this.state === 'running' || this.bridge.isActive()

      await this.bridge.deactivate()

      this.state = 'idle'
      this.activeLabel = null
      this.stoppedAt = new Date().toISOString()

      if (wasActive) {
        this.pushLog(
          prevLabel
            ? `Deactivated workspace '${prevLabel}'`
            : 'Deactivated workspace',
        )
      }

      return this.getStatus()
    })
  }
}

/** Process-local singleton instance. */
export const bridgeManagerService = new BridgeManagerService()
