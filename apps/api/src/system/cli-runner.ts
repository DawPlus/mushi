import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { resolveReadOnlyCommand } from './cli-policy.js'

const exec = promisify(execFile)
export type CommandResult = { command: string; status: 'succeeded' | 'failed'; output: string }

/** Local-only execution; never accepts executable names, arguments, or shell input. */
export async function runReadOnlyCommand(command: string): Promise<CommandResult> {
  const spec = resolveReadOnlyCommand(command)
  try {
    const executable = command === 'node-version' ? process.execPath : '/usr/bin/git'
    const { stdout } = await exec(executable, [...spec.args], {
      timeout: spec.timeoutMs, maxBuffer: spec.maxBuffer, shell: false,
      env: { PATH: '/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin' },
    })
    return { command, status: 'succeeded', output: stdout.trim().slice(0, spec.maxBuffer) }
  } catch {
    // Do not return stderr, full command-line, process environment or error stack.
    return { command, status: 'failed', output: '명령 실행에 실패했습니다.' }
  }
}
