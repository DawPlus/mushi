import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { homedir, userInfo } from 'node:os'
import { join } from 'node:path'

const exec = promisify(execFile)
const label = 'local.mushi.mac-agent'
const domain = () => 'gui/' + userInfo().uid
const plist = () => join(homedir(), 'Library', 'LaunchAgents', label + '.plist')
const localhost = (address?: string) => address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'

/** Never execute client-supplied commands, labels, arguments, or file paths. */
export function isLocalAgentRequest(remote?: string, local?: string) {
  return localhost(remote) && localhost(local)
}
export async function agentLaunchStatus() {
  if (!existsSync(plist())) return { installed: false, running: false }
  try {
    const { stdout } = await exec('/bin/launchctl', ['print', domain() + '/' + label], { timeout: 4000, maxBuffer: 65536 })
    return { installed: true, running: /\bstate = running\b/.test(stdout) }
  } catch {
    return { installed: true, running: false }
  }
}
export async function setAgentLaunchRunning(enabled: boolean) {
  if (!existsSync(plist())) throw new Error('LaunchAgent is not installed')
  const current = await agentLaunchStatus()
  if (current.running === enabled) return current
  await exec('/bin/launchctl', enabled
    ? ['bootstrap', domain(), plist()]
    : ['bootout', domain(), plist()], { timeout: 8000, maxBuffer: 65536 })
  return agentLaunchStatus()
}
