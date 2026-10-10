import { validateDeviceJobLease, type DeviceJobLease } from './device-job-contract.js'

/** Reduce internal DB records to the minimum device-facing lease payload. */
export function projectDeviceLease(
  row: { id: string; device_id: string; lease_id: string | null; lease_until: Date | null; expires_at: Date; command: string; status: string },
  verifiedDeviceId: string,
  now = Date.now(),
): DeviceJobLease | null {
  if (row.status !== 'leased' || !row.lease_id || !row.lease_until) return null
  const until = Math.min(row.lease_until.getTime(), row.expires_at.getTime())
  if (!Number.isFinite(until) || until <= now || until > now + 60_000) return null
  return validateDeviceJobLease({
    deviceId: row.device_id, jobId: row.id, leaseId: row.lease_id,
    command: row.command, expiresAt: new Date(until).toISOString(),
  }, verifiedDeviceId, now)
}
