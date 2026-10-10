export type ManagedService = { id: string; label: string; launchdLabel: string }
export type ServiceAction = 'start' | 'stop' | 'restart'

/** Exact, locally configured launchd labels only. Never accept a shell command from the browser. */
export function resolveServiceAction(services: readonly ManagedService[], id: string, action: string) {
  if (!['start', 'stop', 'restart'].includes(action)) throw new Error('Unsupported service action')
  const service = services.find(entry => entry.id === id)
  if (!service || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(service.launchdLabel)) throw new Error('Service not registered')
  return { service, action: action as ServiceAction, requiresConfirmation: true }
}
