import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ALLOWED_COMMANDS, isAllowedCommand, readText, resolveInside, walkFiles } from './workspace.js'

const text = (value: string) => ({ content: [{ type: 'text' as const, text: value }] })
const errorText = (value: string) => ({
  content: [{ type: 'text' as const, text: value }],
  isError: true,
})

const FS_ERROR_MESSAGES: Record<string, string> = {
  ENOENT: 'Path not found.',
  EACCES: 'Permission denied.',
  EPERM: 'Permission denied.',
  EISDIR: 'Path is a directory.',
  ENOTDIR: 'Path is not a directory.',
  EEXIST: 'Path already exists.',
  ENOTEMPTY: 'Directory is not empty.',
  EROFS: 'Read-only filesystem.',
}

/** True when text may disclose absolute paths, errno dumps, or secret-like values. */
function looksSensitive(message: string): boolean {
  if (/[/\\](?:Users|home|private|var|tmp|Folders|System|Windows)[/\\]/i.test(message)) return true
  if (/(?:^|[\s`'"(])\/(?:[A-Za-z0-9._-]+\/)+/.test(message)) return true
  if (/[A-Za-z]:\\/.test(message)) return true
  if (/\b(?:ENOENT|EACCES|EPERM|EISDIR|ENOTDIR|EEXIST|ENOTEMPTY)\b/.test(message)) return true
  if (/no such file or directory/i.test(message)) return true
  if (/\b(?:MUSHI_BRIDGE|ONION_BRIDGE|API_ACCESS_TOKEN|Bearer\s+\S+|sk-[A-Za-z0-9]+)\b/.test(message)) {
    return true
  }
  return false
}

/** Map thrown tool exceptions to stable MCP error text; never serialize paths or internals. */
export function sanitizeToolError(error: unknown): string {
  if (!(error instanceof Error)) return 'Tool operation failed.'

  const code = (error as NodeJS.ErrnoException).code
  if (typeof code === 'string' && code in FS_ERROR_MESSAGES) {
    return FS_ERROR_MESSAGES[code]
  }
  if (typeof code === 'string' && /^E[A-Z0-9]+$/.test(code)) {
    return 'Filesystem operation failed.'
  }

  const message = error.message?.trim()
  if (!message || looksSensitive(message)) return 'Tool operation failed.'
  return message
}

function withSafeToolErrors<Args extends unknown[], Result>(
  handler: (...args: Args) => Result | Promise<Result>,
): (...args: Args) => Promise<Result | ReturnType<typeof errorText>> {
  return async (...args: Args) => {
    try {
      return await handler(...args)
    } catch (error) {
      return errorText(sanitizeToolError(error))
    }
  }
}

const MAX_COMMAND_OUTPUT = 80_000
const MAX_PROCESS_OUTPUT = 120_000

/** Allowlisted keys required to locate/run tools; never inherit server secrets. */
const SAFE_CHILD_ENV_KEYS = new Set([
  'PATH',
  'PATHEXT',
  'HOME',
  'USER',
  'LOGNAME',
  'SHELL',
  'TMPDIR',
  'TEMP',
  'TMP',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'TERM',
  'COLORTERM',
  'TZ',
  'SYSTEMROOT',
  'SYSTEMDRIVE',
  'COMSPEC',
  'WINDIR',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
  'HOMEDRIVE',
  'HOMEPATH',
  'NUMBER_OF_PROCESSORS',
  'OS',
  'PROCESSOR_ARCHITECTURE',
])

export function buildSanitizedChildEnv(source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const key of SAFE_CHILD_ENV_KEYS) {
    const value = source[key]
    if (value !== undefined) env[key] = value
  }
  return env
}

export type ManagedProcess = {
  id: string
  command: string
  args: string[]
  cwd: string
  child: ChildProcess
  status: 'running' | 'exited'
  exitCode: number | null
  signal: NodeJS.Signals | null
  stdout: string
  stderr: string
  startedAt: string
}

/** Workspace-scoped managed processes; cleared on deactivate / workspace switch. */
export class ManagedProcessRegistry {
  private readonly processes = new Map<string, ManagedProcess>()

  get size(): number {
    return this.processes.size
  }

  get(id: string): ManagedProcess | undefined {
    return this.processes.get(id)
  }

  list(): ManagedProcess[] {
    return [...this.processes.values()]
  }

  set(entry: ManagedProcess): void {
    this.processes.set(entry.id, entry)
  }

  delete(id: string): void {
    this.processes.delete(id)
  }

  /** Test helper: spawn a long-running child under the registry. */
  startForTest(command: string, args: string[], cwd: string): ManagedProcess {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true,
      env: buildSanitizedChildEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const entry: ManagedProcess = {
      id: `proc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      command,
      args,
      cwd,
      child,
      status: 'running',
      exitCode: null,
      signal: null,
      stdout: '',
      stderr: '',
      startedAt: new Date().toISOString(),
    }
    child.on('close', (code, signal) => {
      entry.status = 'exited'
      entry.exitCode = code
      entry.signal = signal
    })
    this.processes.set(entry.id, entry)
    return entry
  }

  /** Stop one managed process; resolves only after the child is dead/closed (or final bound). */
  async stop(id: string): Promise<ManagedProcess | undefined> {
    const entry = this.processes.get(id)
    if (!entry) return undefined
    await stopManagedProcess(entry)
    return entry
  }

  async stopAll(): Promise<void> {
    const entries = [...this.processes.values()]
    await Promise.all(entries.map((entry) => stopManagedProcess(entry)))
    this.processes.clear()
  }
}

const STOP_TERM_WAIT_MS = 1000
const STOP_KILL_WAIT_MS = 1000

function isManagedPidAlive(pid: number | undefined): boolean {
  if (pid === undefined) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/** SIGTERM → bounded wait → SIGKILL if still live → await close/error with final bound. */
export function terminateChild(child: ChildProcess): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }

    if (child.exitCode !== null || child.signalCode !== null) {
      finish()
      return
    }

    child.once('close', finish)
    child.once('error', finish)

    try {
      child.kill('SIGTERM')
    } catch {
      finish()
      return
    }

    setTimeout(() => {
      if (settled) return
      if (isManagedPidAlive(child.pid)) {
        try {
          child.kill('SIGKILL')
        } catch {
          finish()
          return
        }
      }
      setTimeout(finish, STOP_KILL_WAIT_MS).unref?.()
    }, STOP_TERM_WAIT_MS).unref?.()
  })
}

function stopManagedProcess(entry: ManagedProcess): Promise<void> {
  if (entry.status !== 'running') return Promise.resolve()
  return terminateChild(entry.child)
}

function matchesGlob(file: string, glob: string) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  const pattern = escaped.replaceAll('**', '::DOUBLE::').replaceAll('*', '[^/]*').replaceAll('::DOUBLE::', '.*')
  return new RegExp(`^${pattern}$`).test(file)
}

const commandEnum = z.enum([
  'npm',
  'pnpm',
  'npx',
  'node',
  'bun',
  'bunx',
  'yarn',
  'git',
  'codex',
  'grok',
  'agy',
])

const processCommandEnum = z.enum([
  'npm',
  'pnpm',
  'npx',
  'node',
  'bun',
  'bunx',
  'yarn',
  'codex',
  'grok',
  'agy',
])

export function registerTools(server: McpServer, root: string, processes: ManagedProcessRegistry) {
  // Centralize exception → sanitized MCP error for every Bridge tool.
  const registerTool: typeof server.registerTool = ((name, config, handler) =>
    server.registerTool(
      name,
      config,
      withSafeToolErrors(handler as (...args: never[]) => unknown) as typeof handler,
    )) as typeof server.registerTool

  registerTool(
    'get_workspace_info',
    {
      description: 'Return the current Bridge workspace.',
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => text(`Workspace: ${path.basename(root)}`),
  )

  registerTool(
    'list_directory',
    {
      description: 'List files below a workspace-relative directory.',
      inputSchema: {
        path: z.string().optional(),
        depth: z.number().int().min(1).max(3).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ path: input = '.', depth = 1 }) => {
      const base = await resolveInside(root, input)
      const files = await walkFiles(root, input)
      const prefix = base.relative ? `${base.relative}/` : ''
      const visible = new Set<string>()
      for (const file of files) {
        const local = prefix && file.startsWith(prefix) ? file.slice(prefix.length) : file
        const parts = local.split('/')
        visible.add(parts.slice(0, depth).join('/') + (parts.length > depth ? '/' : ''))
      }
      return text([...visible].sort().join('\n') || '(empty)')
    },
  )

  registerTool(
    'search_text',
    {
      description: 'Search literal text across workspace files.',
      inputSchema: {
        query: z.string().min(1),
        include: z.string().optional(),
        max_results: z.number().int().min(1).max(500).optional(),
        context_lines: z.number().int().min(0).max(5).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query, include, max_results = 50, context_lines = 0 }) => {
      const files = await walkFiles(root)
      const results: string[] = []
      for (const file of files) {
        if (results.length >= max_results) break
        if (include && !matchesGlob(file, include)) continue
        let content: string
        try {
          content = (await readText(root, file)).text
        } catch {
          continue
        }
        const lines = content.split(/\r?\n/)
        for (let i = 0; i < lines.length && results.length < max_results; i++) {
          if (!lines[i].includes(query)) continue
          const from = Math.max(0, i - context_lines)
          const to = Math.min(lines.length, i + context_lines + 1)
          results.push(
            `${file}:${i + 1}\n${lines
              .slice(from, to)
              .map((line, n) => `${from + n + 1}│ ${line}`)
              .join('\n')}`,
          )
        }
      }
      return text(results.join('\n\n') || 'No matches.')
    },
  )

  registerTool(
    'read_file',
    {
      description: 'Read a workspace-relative UTF-8 file.',
      inputSchema: {
        path: z.string(),
        start_line: z.number().int().min(1).optional(),
        end_line: z.number().int().min(1).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ path: input, start_line, end_line }) => {
      const file = await readText(root, input)
      const lines = file.text.split(/\r?\n/)
      const start = start_line ?? 1
      const end = Math.min(end_line ?? lines.length, lines.length)
      const body = lines
        .slice(start - 1, end)
        .map((line, i) => `${start + i}│ ${line}`)
        .join('\n')
      return text(
        `<file_content path="${file.relative}" lines="${start}-${end}" total_lines="${lines.length}">\n${body}\n</file_content>`,
      )
    },
  )

  registerTool(
    'run_workspace_command',
    {
      description:
        'Run an allowed development command inside the workspace with shell disabled. Returns exit code, stdout, and stderr.',
      inputSchema: {
        command: commandEnum,
        args: z.array(z.string()).optional(),
        cwd: z.string().optional(),
        timeout_ms: z.number().int().min(1).max(600_000).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ command, args = [], cwd = '.', timeout_ms = 120_000 }) => {
      if (!isAllowedCommand(command) || !ALLOWED_COMMANDS.has(command)) {
        throw new Error('Command is not allowed.')
      }
      const working = await resolveInside(root, cwd)
      const commandText = [command, ...args].join(' ')

      return await new Promise((resolve) => {
        const child = spawn(command, args, {
          cwd: working.absolute,
          shell: false,
          windowsHide: true,
          env: buildSanitizedChildEnv(),
        })

        let stdout = ''
        let stderr = ''
        let settled = false

        const append = (current: string, chunk: Buffer) => {
          if (current.length >= MAX_COMMAND_OUTPUT) return current
          const next = current + chunk.toString()
          return next.length > MAX_COMMAND_OUTPUT
            ? next.slice(0, MAX_COMMAND_OUTPUT) + '\n[output truncated]'
            : next
        }

        child.stdout?.on('data', (chunk: Buffer) => {
          stdout = append(stdout, chunk)
        })
        child.stderr?.on('data', (chunk: Buffer) => {
          stderr = append(stderr, chunk)
        })

        const timer = setTimeout(() => {
          if (settled) return
          settled = true
          void terminateChild(child).finally(() => {
            resolve(
              errorText(
                `Command timed out after ${timeout_ms}ms.\n\nstdout:\n${stdout || '(empty)'}\n\nstderr:\n${stderr || '(empty)'}`,
              ),
            )
          })
        }, timeout_ms)

        child.on('error', (error) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          resolve(errorText(`Failed to start command: ${error.message}`))
        })

        child.on('close', (code, signal) => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          const result =
            `command: ${commandText}\n` +
            `cwd: ${working.relative || '.'}\n` +
            `exit_code: ${code ?? 'null'}\n` +
            `signal: ${signal ?? '-'}\n\n` +
            `stdout:\n${stdout || '(empty)'}\n\n` +
            `stderr:\n${stderr || '(empty)'}`
          resolve(code === 0 ? text(result) : errorText(result))
        })
      })
    },
  )

  registerTool(
    'start_workspace_process',
    {
      description: 'Start a long-running development process in the workspace and return a process_id.',
      inputSchema: {
        command: processCommandEnum,
        args: z.array(z.string()).optional(),
        cwd: z.string().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ command, args = [], cwd = '.' }) => {
      if (!isAllowedCommand(command)) throw new Error('Command is not allowed.')
      const working = await resolveInside(root, cwd)
      const commandText = [command, ...args].join(' ')
      const child = spawn(command, args, {
        cwd: working.absolute,
        shell: false,
        windowsHide: true,
        env: buildSanitizedChildEnv(),
      })

      const processId = `proc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const entry: ManagedProcess = {
        id: processId,
        command,
        args,
        cwd: working.relative || '.',
        child,
        status: 'running',
        exitCode: null,
        signal: null,
        stdout: '',
        stderr: '',
        startedAt: new Date().toISOString(),
      }

      const append = (current: string, chunk: Buffer | string) => {
        const next = current + chunk.toString()
        return next.length > MAX_PROCESS_OUTPUT ? next.slice(next.length - MAX_PROCESS_OUTPUT) : next
      }

      child.stdout?.on('data', (chunk: Buffer) => {
        entry.stdout = append(entry.stdout, chunk)
      })
      child.stderr?.on('data', (chunk: Buffer) => {
        entry.stderr = append(entry.stderr, chunk)
      })
      child.on('close', (code, signal) => {
        entry.status = 'exited'
        entry.exitCode = code
        entry.signal = signal
      })
      child.on('error', (error) => {
        entry.stderr = append(entry.stderr, error.message)
        entry.status = 'exited'
      })

      processes.set(entry)
      return text(
        JSON.stringify({
          process_id: processId,
          pid: child.pid ?? null,
          status: entry.status,
          command: commandText,
          cwd: entry.cwd,
        }),
      )
    },
  )

  registerTool(
    'stop_workspace_process',
    {
      description: 'Stop a process previously started by start_workspace_process.',
      inputSchema: { process_id: z.string().min(1) },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ process_id }) => {
      const entry = await processes.stop(process_id)
      if (!entry) return errorText('Managed process not found.')
      return text(
        JSON.stringify({
          process_id,
          status: entry.status,
          pid: entry.child.pid ?? null,
        }),
      )
    },
  )

  registerTool(
    'workspace_process_status',
    {
      description: 'List managed workspace processes or inspect one process.',
      inputSchema: { process_id: z.string().optional() },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      const process_id = args?.process_id
      const summarize = (entry: ManagedProcess) => ({
        process_id: entry.id,
        pid: entry.child.pid ?? null,
        status: entry.status,
        command: [entry.command, ...entry.args].join(' '),
        cwd: entry.cwd,
        exit_code: entry.exitCode,
        signal: entry.signal,
        started_at: entry.startedAt,
      })

      if (process_id) {
        const entry = processes.get(process_id)
        return entry ? text(JSON.stringify(summarize(entry))) : errorText('Managed process not found.')
      }

      return text(JSON.stringify(processes.list().map(summarize)))
    },
  )

  registerTool(
    'workspace_process_logs',
    {
      description: 'Return recent stdout and stderr for a managed process.',
      inputSchema: {
        process_id: z.string().min(1),
        lines: z.number().int().min(1).max(500).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ process_id, lines = 100 }) => {
      const entry = processes.get(process_id)
      if (!entry) return errorText('Managed process not found.')
      const tail = (value: string) => {
        const parts = value.split(/\r?\n/)
        return parts.slice(Math.max(0, parts.length - lines)).join('\n')
      }
      return text(
        `process_id: ${process_id}\nstatus: ${entry.status}\n\nstdout:\n${tail(entry.stdout) || '(empty)'}\n\nstderr:\n${tail(entry.stderr) || '(empty)'}`,
      )
    },
  )

  registerTool(
    'edit_file',
    {
      description: 'Replace one exact occurrence in an existing file.',
      inputSchema: {
        path: z.string(),
        old_string: z.string(),
        new_string: z.string(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ path: input, old_string, new_string }) => {
      const file = await readText(root, input)
      const first = file.text.indexOf(old_string)
      if (first < 0) throw new Error('old_string was not found.')
      if (file.text.indexOf(old_string, first + old_string.length) >= 0) {
        throw new Error('old_string appears more than once.')
      }
      await fs.writeFile(
        file.absolute,
        file.text.slice(0, first) + new_string + file.text.slice(first + old_string.length),
        'utf8',
      )
      return text(`Updated ${file.relative}.`)
    },
  )

  registerTool(
    'write_file',
    {
      description: 'Create or fully replace a file.',
      inputSchema: { path: z.string(), content: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    },
    async ({ path: input, content }) => {
      const target = await resolveInside(root, input)
      await fs.mkdir(path.dirname(target.absolute), { recursive: true })
      await fs.writeFile(target.absolute, content, 'utf8')
      return text(`Wrote ${target.relative}.`)
    },
  )

  registerTool(
    'create_directory',
    {
      description: 'Create a directory recursively.',
      inputSchema: { path: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ path: input }) => {
      const target = await resolveInside(root, input)
      await fs.mkdir(target.absolute, { recursive: true })
      return text(`Created ${target.relative}/.`)
    },
  )

  registerTool(
    'delete_path',
    {
      description: 'Delete a file or directory.',
      inputSchema: { path: z.string(), recursive: z.boolean().optional() },
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    },
    async ({ path: input, recursive = false }) => {
      const target = await resolveInside(root, input)
      if (!target.relative) throw new Error('Workspace root cannot be deleted.')
      const stat = await fs.stat(target.absolute)
      if (stat.isDirectory() && !recursive) throw new Error('recursive=true is required for directories.')
      await fs.rm(target.absolute, { recursive, force: false })
      return text(`Deleted ${target.relative}.`)
    },
  )
}
