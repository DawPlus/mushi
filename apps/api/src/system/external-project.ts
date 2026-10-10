/** Static registry contract only. No fetching arbitrary external URLs. */
export type ExternalProject = { id: string; label: string; remoteEntry: string; enabled: boolean }

const IDENTIFIER = /^[a-z][a-z0-9-]{1,39}$/
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

export function validateExternalProject(value: unknown): ExternalProject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid project')
  const item = value as Record<string, unknown>
  if (typeof item.id !== 'string' || !IDENTIFIER.test(item.id)) throw new Error('Invalid project ID')
  if (typeof item.label !== 'string' || !item.label.trim() || item.label.length > 60) throw new Error('Invalid project label')
  if (typeof item.enabled !== 'boolean') throw new Error('Invalid enabled state')
  if (typeof item.remoteEntry !== 'string') throw new Error('Invalid project URL')
  let url: URL
  try { url = new URL(item.remoteEntry) } catch { throw new Error('Invalid project URL') }
  if (url.username || url.password || url.search || url.hash) throw new Error('Invalid project URL')
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname))) throw new Error('Project URL must use HTTPS or loopback HTTP')
  return { id: item.id, label: item.label.trim(), remoteEntry: url.href, enabled: item.enabled }
}
