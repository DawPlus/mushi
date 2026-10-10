import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { BadRequestException, ConflictException } from '@nestjs/common'
import { onionProfiles, ensureOnionProjectProfile } from './onion-profiles.js'

type TunnelEntry = { child: ChildProcess; profile: string; state: 'running' | 'error'; logs: string[] }
const running = new Map<string, TunnelEntry>()
const run = promisify(execFile)
const sanitize = (line: string) => line
  .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
  .replace(/(?:sk-[A-Za-z0-9_-]{12,}|[a-fA-F0-9]{40,})/g, '[REDACTED]')
  .slice(0, 500)

export function tunnelStatus(directory: string) {
  const entry = running.get(directory)
  return entry ? { state: entry.state, profile: entry.profile, managed: true, logs: [...entry.logs] } : null
}

/** Best-effort stop for Onion listeners bound to a known profile port. */
async function stopListenerOnPort(port: number): Promise<boolean> {
  if (!Number.isInteger(port) || port < 1 || port > 65535) return false
  try {
    const { stdout } = await run('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], {
      timeout: 2000,
      encoding: 'utf8',
    })
    const pids = [...new Set(
      stdout
        .split(/\s+/)
        .map(value => Number(value.trim()))
        .filter(pid => Number.isInteger(pid) && pid > 0),
    )]
    if (pids.length === 0) return false
    for (const pid of pids) {
      try { process.kill(pid, 'SIGTERM') } catch { /* already gone */ }
    }
    await new Promise<void>(resolve => setTimeout(resolve, 400))
    for (const pid of pids) {
      try {
        process.kill(pid, 0)
        process.kill(pid, 'SIGKILL')
      } catch { /* already gone */ }
    }
    return true
  } catch {
    return false
  }
}

export async function tunnelStart(directory: string) {
  if (running.size > 0) throw new ConflictException('One Onion tunnel at a time')
  const profiles = await onionProfiles()
  if (profiles.some(p => p.running)) throw new ConflictException('An original Onion tunnel is already running')
  let profile = profiles.find(p => p.workspace === directory)
  if (!profile) {
    await ensureOnionProjectProfile(directory)
    profile = (await onionProfiles()).find(p => p.workspace === directory)
  }
  if (!profile) throw new BadRequestException('Could not prepare Onion profile')
  const entry = process.env.MUSHI_ONION_CLI_ENTRY || path.join(os.homedir(), 'workspace', 'Onion-Bridge', 'dist', 'cli.js')
  if (!(await fs.stat(entry).catch(() => null))?.isFile()) throw new BadRequestException('Original Onion Bridge CLI unavailable')
  const child = spawn(process.execPath, [entry, profile.name], {
    cwd: path.dirname(entry), shell: false, detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const item: TunnelEntry = { child, profile: profile.name, state: 'running', logs: [] }
  running.set(directory, item)
  const append = (chunk: Buffer) => {
    item.logs.push(...chunk.toString().split(/\r?\n/).filter(Boolean).map(sanitize))
    if (item.logs.length > 50) item.logs.splice(0, item.logs.length - 50)
  }
  child.stdout?.on('data', append)
  child.stderr?.on('data', append)
  child.once('exit', () => { if (running.get(directory) === item) running.delete(directory) })
  child.once('error', () => { if (running.get(directory) === item) running.delete(directory) })
  await new Promise<void>((resolve, reject) => {
    child.once('spawn', () => resolve())
    child.once('error', () => reject(new BadRequestException('Could not start Onion Bridge')))
  })
  return { state: 'running', profile: profile.name }
}

export async function tunnelStop(directory: string) {
  const item = running.get(directory)
  if (item) {
    try {
      if (item.child.pid && process.platform !== 'win32') process.kill(-item.child.pid, 'SIGTERM')
      else item.child.kill('SIGTERM')
    } catch { item.child.kill('SIGTERM') }
    await Promise.race([
      new Promise<void>(resolve => item.child.once('exit', () => resolve())),
      new Promise<void>(resolve => setTimeout(resolve, 2000)),
    ])
    if (item.child.exitCode === null && item.child.signalCode === null) {
      try {
        if (item.child.pid && process.platform !== 'win32') process.kill(-item.child.pid, 'SIGKILL')
        else item.child.kill('SIGKILL')
      } catch { /* already exited */ }
    }
    running.delete(directory)
  }

  const profile = (await onionProfiles()).find(entry => entry.workspace === directory && entry.running)
  if (profile) {
    const stopped = await stopListenerOnPort(profile.port)
    if (!stopped && !item) {
      throw new ConflictException('Could not stop the Onion listener on the profile port')
    }
    return { state: 'idle' }
  }

  if (!item) throw new ConflictException('This Onion process is not managed by Mushi')
  return { state: 'idle' }
}
