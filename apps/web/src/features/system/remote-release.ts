import { validateRemoteManifest, type RemoteManifest } from './remote-compatibility'
import type { RemoteRegistration } from './remote-registration'

/** A deterministic, host-controlled release decision. Never fetches or executes a Remote. */
export function selectRemoteRelease(
  registration: RemoteRegistration,
  current: unknown,
  rollback: unknown,
): { status: 'current' | 'rollback' | 'unavailable'; manifest: RemoteManifest | null } {
  try {
    return { status: 'current', manifest: validateRemoteManifest(current, registration) }
  } catch {
    try {
      // Rollback entry must match the approved, pinned deployment entry.
      return { status: 'rollback', manifest: validateRemoteManifest(rollback, registration) }
    } catch {
      return { status: 'unavailable', manifest: null }
    }
  }
}
