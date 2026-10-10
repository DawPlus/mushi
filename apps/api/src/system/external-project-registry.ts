import { validateExternalProject, type ExternalProject } from './external-project.js'

/** Process-local metadata only. No network request, Federation loader or file writes. */
export class ExternalProjectRegistry {
  private readonly projects = new Map<string, Map<string, ExternalProject>>()

  list(ownerId: string): ExternalProject[] {
    return [...(this.projects.get(ownerId)?.values() ?? [])]
  }

  register(ownerId: string, input: unknown, trustedOrigins: readonly string[]): ExternalProject {
    const project = validateExternalProject(input)
    const origin = new URL(project.remoteEntry).origin
    const url = new URL(project.remoteEntry)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (!local && !trustedOrigins.includes(origin)) throw new Error('Untrusted remote origin')
    let items = this.projects.get(ownerId)
    if (!items) { items = new Map(); this.projects.set(ownerId, items) }
    if (!items.has(project.id) && items.size >= 30) throw new Error('Project limit reached')
    // Registration is metadata only. Enabling a remote requires separate reviewed Web configuration.
    const stored = { ...project, enabled: false }
    items.set(stored.id, stored)
    return { ...stored }
  }

  remove(ownerId: string, projectId: string): boolean {
    return this.projects.get(ownerId)?.delete(projectId) ?? false
  }
}
