import { spawn, execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const children = []
let stopping = false

function alreadyRunning() {
  try {
    return execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8' })
      .split('\n').some(line => {
        const match = line.trim().match(/^(\d+)\s+(.+)$/)
        return match && Number(match[1]) !== process.pid &&
          match[2].includes(resolve(root, 'agent/checkin.mjs')) &&
          /\s--watch(?:\s|$)/.test(match[2])
      })
  } catch {
    // Avoid starting a duplicate collector when process inspection fails.
    return true
  }
}

function start(name, command, args) {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', detached: true })
  children.push(child)
  child.on('error', error => { console.error(`[${name}] ${error.message}`); stop(1) })
  child.on('exit', code => {
    if (!stopping) {
      console.error(`[${name}] exited (${code ?? 'signal'})`)
      stop(code || 1)
    }
  })
}

function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue
    try { process.kill(-child.pid, 'SIGTERM') } catch {}
  }
  process.exitCode = code
  // Wait for child processes to exit instead of orphaning the collector.
  setTimeout(() => process.exit(code), 2500).unref()
}

process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())

const externalAgent = alreadyRunning()
if (externalAgent) console.log('[mushi] Existing Mac Agent detected (or process check unavailable); skipping duplicate.')
start('api', 'pnpm', ['dev:api'])
start('web', 'pnpm', ['dev:web'])
if (!externalAgent) start('agent', process.execPath, ['agent/checkin.mjs', '--watch'])
