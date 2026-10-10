import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

type Profile = { name: string; workspace: string; port: number; running: boolean }

/** Read-only compatibility with original Onion Bridge profiles. Never return credentials. */
export async function onionProfiles(): Promise<Profile[]> {
  const root = path.join(os.homedir(), '.onion-bridge', 'profiles')
  const files = await fs.readdir(root).catch(() => [] as string[])
  const profiles = await Promise.all(files.filter(name => /^[a-zA-Z0-9._-]+\.json$/.test(name)).slice(0, 100).map(async file => {
    try {
      const data = JSON.parse(await fs.readFile(path.join(root, file), 'utf8')) as Record<string, unknown>
      if (typeof data.workspace !== 'string' || typeof data.port !== 'number' ||
        !Number.isInteger(data.port) || data.port < 1 || data.port > 65535) return null
      const workspace = await fs.realpath(data.workspace)
      let running = false
      try {
        const response = await fetch(`http://127.0.0.1:${data.port}/health`, { signal: AbortSignal.timeout(400) })
        if (response.ok) {
          const health = await response.json() as Record<string, unknown>
          running = health.status === 'ok' && (health.workspace === workspace || health.workspace === undefined)
        }
      } catch { /* not running */ }
      return { name: file.slice(0, -5), workspace, port: data.port, running }
    } catch { return null }
  }))
  return profiles.filter((item): item is Profile => item !== null)
}

/** Reuse installed Onion Bridge profile generation. */
export async function ensureOnionProjectProfile(workspace: string): Promise<{ name: string; created: boolean }> {
  const existing = (await onionProfiles()).find(item => item.workspace === workspace)
  if (existing) return { name: existing.name, created: false }
  const defaultFile = path.join(os.homedir(), '.onion-bridge', 'profiles', 'default.json')
  const original = JSON.parse(await fs.readFile(defaultFile, 'utf8')) as Record<string, unknown>
  if (typeof original.tunnelId !== 'string' || !original.tunnelId.startsWith('tunnel_')) throw new Error('Default Onion tunnel ID missing')
  const cli = process.env.MUSHI_ONION_CLI_ENTRY || path.join(os.homedir(), 'workspace', 'Onion-Bridge', 'dist', 'cli.js')
  const installed = path.join(path.dirname(cli), 'control', 'projects.js')
  if (!(await fs.stat(installed).catch(() => null))?.isFile()) throw new Error('Onion profile creator missing')
  const { pathToFileURL } = await import('node:url')
  const implementation = await import(pathToFileURL(installed).href)
  if (typeof implementation.ensureProjectProfile !== 'function') throw new Error('Onion profile creator unavailable')
  const result = await implementation.ensureProjectProfile({ workspace, tunnelId: original.tunnelId })
  return { name: result.name, created: result.created }
}
