import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { ConflictException, BadRequestException } from '@nestjs/common'

export type DevState = { state: 'idle' | 'running' | 'error'; url: string | null; command: string | null; logs: string[] }
type Entry = { child: ChildProcess; state: DevState }
const entries = new Map<string, Entry>()
const empty = (): DevState => ({ state: 'idle', url: null, command: null, logs: [] })
const localUrl = (text: string) => text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').match(/https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]):\d+[^\s]*/)?.[0]?.replace('0.0.0.0', 'localhost') ?? null
const snapshot = (entry?: Entry): DevState => entry ? { ...entry.state, logs: [...entry.state.logs] } : empty()

export function devStatus(directory: string): DevState {
  return snapshot(entries.get(directory))
}
export async function devStart(directory: string): Promise<DevState> {
  const current = entries.get(directory)
  if (current?.state.state === 'running') throw new ConflictException('DEV already running')
  const pkg = JSON.parse(await fs.readFile(path.join(directory, 'package.json'), 'utf8')) as { scripts?: Record<string, string> }
  const script = pkg.scripts?.dev ? 'dev' : pkg.scripts?.start ? 'start' : null
  if (!script) throw new BadRequestException('No dev or start script')
  const fileExists = async (file: string) => Boolean(await fs.stat(path.join(directory, file)).catch(() => null))
  const manager = await fileExists('pnpm-lock.yaml') ? 'pnpm' : await fileExists('bun.lock') || await fileExists('bun.lockb') ? 'bun' : await fileExists('yarn.lock') ? 'yarn' : 'npm'
  const args = manager === 'npm' ? ['run', script] : [script]
  const state: DevState = { state: 'running', url: null, command: `${manager} ${args.join(' ')}`, logs: [] }
  const child = spawn(manager, args, { cwd: directory, shell: false, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] })
  const entry: Entry = { child, state }
  entries.set(directory, entry)
  const write = (chunk: Buffer) => {
    const value = chunk.toString()
    const url = localUrl(value)
    if (url) state.url = url
    state.logs.push(...value.split(/\r?\n/).filter(Boolean).map(line => line.slice(0, 500)))
    if (state.logs.length > 50) state.logs.splice(0, state.logs.length - 50)
  }
  child.stdout?.on('data', write)
  child.stderr?.on('data', write)
  child.on('exit', code => {
    if (entries.get(directory) !== entry) return
    state.state = code === 0 ? 'idle' : 'error'
    if (code === 0) entries.delete(directory)
  })
  child.on('error', () => {
    if (entries.get(directory) === entry) { state.state = 'error'; state.logs.push('Process could not start') }
  })
  await new Promise<void>((resolve, reject) => {
    child.once('spawn', () => resolve())
    child.once('error', () => reject(new BadRequestException('DEV process failed to start')))
  })
  return snapshot(entry)
}
export async function devStop(directory: string): Promise<DevState> {
  const entry = entries.get(directory)
  if (!entry) return empty()
  try {
    if (entry.child.pid && process.platform !== 'win32') process.kill(-entry.child.pid, 'SIGTERM')
    else entry.child.kill('SIGTERM')
  } catch { entry.child.kill('SIGTERM') }
  await Promise.race([
    new Promise<void>(resolve => entry.child.once('exit', () => resolve())),
    new Promise<void>(resolve => setTimeout(resolve, 2000)),
  ])
  if (entry.child.exitCode === null && entry.child.signalCode === null) {
    try {
      if (entry.child.pid && process.platform !== 'win32') process.kill(-entry.child.pid, 'SIGKILL')
      else entry.child.kill('SIGKILL')
    } catch { /* already exited */ }
  }
  entries.delete(directory)
  return empty()
}
