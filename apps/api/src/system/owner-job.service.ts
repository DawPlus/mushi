import { LocalJobQueue, type LocalJob } from './job-queue.js'
import { resolveReadOnlyCommand } from './cli-policy.js'
import { auditCliJob } from './cli-audit.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const REQUEST_ID = /^[a-zA-Z0-9_-]{8,80}$/

/** Owner-scoped job store facade. Caller must verify the Supabase owner JWT first.
 * Wired only to the explicitly verifying owner-only staging controller.
 */
export class OwnerJobService {
  constructor(private readonly queue: LocalJobQueue = new LocalJobQueue()) {}

  create(verifiedOwnerId: string, command: string, requestId: string): LocalJob {
    this.validateOwner(verifiedOwnerId)
    if (!REQUEST_ID.test(requestId)) throw new Error('Invalid request ID')
    resolveReadOnlyCommand(command)
    const existing = this.queue.list(verifiedOwnerId).some(job => job.requestId === requestId)
    const job = this.queue.enqueue(command, { ownerId: verifiedOwnerId, requestId })
    auditCliJob(existing ? 'job_reused' : 'job_created')
    return job
  }

  list(verifiedOwnerId: string): LocalJob[] {
    this.validateOwner(verifiedOwnerId)
    this.queue.expirePending()
    return this.queue.list(verifiedOwnerId)
  }

  get(verifiedOwnerId: string, jobId: string): LocalJob | null {
    this.validateOwner(verifiedOwnerId)
    this.queue.expirePending()
    return UUID.test(jobId) ? this.queue.get(jobId, verifiedOwnerId) : null
  }

  cancel(verifiedOwnerId: string, jobId: string): LocalJob | null {
    this.validateOwner(verifiedOwnerId)
    this.queue.expirePending()
    const cancelled = UUID.test(jobId) ? this.queue.cancel(jobId, verifiedOwnerId) : null
    if (cancelled) auditCliJob('job_cancelled')
    return cancelled
  }

  private validateOwner(ownerId: string): void {
    if (typeof ownerId !== 'string' || !UUID.test(ownerId)) throw new Error('Verified owner required')
  }
}
