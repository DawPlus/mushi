import { validateRemoteRegistry, type RemoteRegistration } from './remote-registration'

/** Remote deployment compatibility preflight. Never loads executable code from a URL. */
export type RemoteManifest = {
  id: string
  contractVersion: number
  release: string
  reactMajor: number
  reactDomMajor: number
  entry: string
}

export function validateRemoteManifest(value: unknown, registration: RemoteRegistration): RemoteManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid remote manifest')
  const data = value as Record<string, unknown>
  if (Object.keys(data).some(key => !['id', 'contractVersion', 'release', 'reactMajor', 'reactDomMajor', 'entry'].includes(key))) {
    throw new Error('Unknown remote manifest field')
  }
  if (data.id !== registration.id || data.contractVersion !== registration.contractVersion ||
      data.reactMajor !== 19 || data.reactDomMajor !== 19 ||
      data.entry !== registration.entry ||
      typeof data.release !== 'string' || !/^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?$/.test(data.release)) {
    throw new Error('Incompatible remote deployment')
  }
  return data as RemoteManifest
}

export function preflightRemoteDeployments(registrations: readonly unknown[], allowedOrigins: readonly string[],
  manifests: Readonly<Record<string, unknown>>) {
  const trusted = validateRemoteRegistry(registrations, allowedOrigins)
  return trusted.map(item => {
    try { return { registration: item, compatible: true as const, manifest: validateRemoteManifest(manifests[item.id], item) } }
    catch { return { registration: item, compatible: false as const, manifest: null } }
  })
}
