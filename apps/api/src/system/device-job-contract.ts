import { resolveReadOnlyCommand, type ReadOnlyCommand } from './cli-policy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const LEASE = /^[a-zA-Z0-9_-]{16,80}$/

export type DeviceJobLease = {
  deviceId: string
  jobId: string
  leaseId: string
  command: ReadOnlyCommand
  expiresAt: string
}

/** Validate a potential delivery payload. This is NOT authentication or permission to execute. */
export function validateDeviceJobLease(payload: unknown, pairedDeviceId: string, now = Date.now()): DeviceJobLease | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const job = payload as Record<string, unknown>
  if (Object.keys(job).some(key => !['deviceId', 'jobId', 'leaseId', 'command', 'expiresAt'].includes(key))) return null
  if (!UUID.test(pairedDeviceId) || job.deviceId !== pairedDeviceId || typeof job.jobId !== 'string' || !UUID.test(job.jobId)) return null
  if (typeof job.leaseId !== 'string' || !LEASE.test(job.leaseId)) return null
  if (typeof job.command !== 'string') return null
  try { resolveReadOnlyCommand(job.command) } catch { return null }
  if (typeof job.expiresAt !== 'string') return null
  const until = Date.parse(job.expiresAt)
  if (!Number.isFinite(until) || new Date(until).toISOString() !== job.expiresAt || until <= now || until > now + 60_000) return null
  return { deviceId: pairedDeviceId, jobId: job.jobId, leaseId: job.leaseId, command: job.command as ReadOnlyCommand, expiresAt: job.expiresAt }
}
