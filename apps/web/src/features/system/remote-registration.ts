/** Build-time trusted external remote registration contract, not a dynamic URL loader. */
export type RemoteRegistration = {
  id: string
  label: string
  route: string
  entry: string
  exposedModule: string
  contractVersion: 1
}

const identifier = /^[a-z][a-z0-9-]{1,39}$/
const moduleName = /^\.\/[a-zA-Z][a-zA-Z0-9_/-]{0,79}$/
const reserved = new Set(['/', '/monitor', '/bridge', '/terminal', '/agents', '/automation', '/projects', '/services'])

export function validateRemoteRegistration(value: unknown, allowedOrigins: readonly string[]): RemoteRegistration {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid remote registration')
  const data = value as Record<string, unknown>
  if (Object.keys(data).some(key => !['id', 'label', 'route', 'entry', 'exposedModule', 'contractVersion'].includes(key))) {
    throw new Error('Unknown remote registration field')
  }
  if (typeof data.id !== 'string' || !identifier.test(data.id) ||
    typeof data.label !== 'string' || !data.label.trim() || data.label.length > 80 ||
    typeof data.route !== 'string' || data.route !== '/ext/' + data.id ||
    reserved.has(data.route) ||
    typeof data.entry !== 'string' ||
    typeof data.exposedModule !== 'string' || !moduleName.test(data.exposedModule) ||
    data.contractVersion !== 1) throw new Error('Invalid remote registration')
  let url: URL
  try { url = new URL(data.entry) } catch { throw new Error('Invalid remote entry URL') }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
    !url.pathname.endsWith('/remoteEntry.js') || !allowedOrigins.includes(url.origin)) {
    throw new Error('Untrusted remote entry URL')
  }
  return {
    id: data.id, label: data.label.trim(), route: data.route, entry: url.href,
    exposedModule: data.exposedModule, contractVersion: 1,
  }
}

export function validateRemoteRegistry(registrations: readonly unknown[], allowedOrigins: readonly string[]) {
  const seen = new Set<string>()
  return registrations.map(value => {
    const remote = validateRemoteRegistration(value, allowedOrigins)
    if (seen.has(remote.id)) throw new Error('Duplicate remote ID')
    seen.add(remote.id)
    return remote
  })
}
