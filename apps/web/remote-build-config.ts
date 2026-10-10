import { validateRemoteRegistry, type RemoteRegistration } from './src/features/system/remote-registration.ts'

/** Trusted deployment-controlled Vite build inputs. No browser or owner API data is used. */
export function parseBuildRemotes(raw: string | undefined, origins: string | undefined): RemoteRegistration[] {
  if (!raw) return []
  if (!origins) throw new Error('Remote origins must be allowlisted')
  let value: unknown
  try { value = JSON.parse(raw) } catch { throw new Error('Invalid remote build registry JSON') }
  if (!Array.isArray(value) || value.length > 12) throw new Error('Invalid remote build registry')
  const trusted = origins.split(',').map(x => x.trim()).filter(Boolean)
  if (!trusted.every(origin => {
    try { const url = new URL(origin); return url.protocol === 'https:' && url.origin === origin } catch { return false }
  })) throw new Error('Invalid allowed remote origin')
  return validateRemoteRegistry(value, trusted)
}

export function federationRemotes(items: readonly RemoteRegistration[]) {
  return Object.fromEntries(items.map(item => [item.id, { type: 'module' as const, name: item.id, entry: item.entry }]))
}
