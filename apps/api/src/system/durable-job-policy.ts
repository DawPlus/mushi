/** Pure transition guard for durable CLI jobs. No HTTP dispatch or process execution. */
export type DurableJobState = 'pending' | 'leased' | 'succeeded' | 'failed' | 'cancelled' | 'expired'
export type DurableJob = {
  ownerId: string
  deviceId: string
  state: DurableJobState
  expiresAt: number
  leaseId: string | null
  leaseUntil: number | null
}
export function canClaimJob(job: DurableJob, ownerId: string, deviceId: string, now: number): boolean {
  return job.ownerId === ownerId && job.deviceId === deviceId &&
    job.state === 'pending' && job.expiresAt > now
}
export function canAcknowledgeJob(job: DurableJob, ownerId: string, deviceId: string,
  leaseId: string, now: number): boolean {
  return job.ownerId === ownerId && job.deviceId === deviceId &&
    job.state === 'leased' && job.leaseId !== null && job.leaseId === leaseId &&
    job.leaseUntil !== null && job.leaseUntil > now &&
    job.expiresAt > now
}
/** A leased job is never put back into pending after lease expiry: execution may have happened. */
export function expiredJobState(job: DurableJob, now: number): DurableJobState {
  if (job.state === 'pending' && job.expiresAt <= now) return 'expired'
  if (job.state === 'leased' && (job.leaseUntil === null || job.leaseUntil <= now || job.expiresAt <= now)) return 'expired'
  return job.state
}
