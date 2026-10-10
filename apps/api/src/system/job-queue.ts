import { randomUUID } from 'node:crypto'
import { resolveReadOnlyCommand } from './cli-policy.js'
import { runReadOnlyCommand, type CommandResult } from './cli-runner.js'

export type LocalJob = {
  id: string
  command: string
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  createdAt: string
  completedAt?: string
  output?: string
  cancelledAt?: string
  expiresAt?: string
  ownerId?: string
  requestId?: string
}

/** In-memory local prototype. Do not expose to a public HTTP route. */
export class LocalJobQueue {
  private readonly jobs: LocalJob[] = []
  private running = false
  constructor(private readonly execute: (command: string) => Promise<CommandResult> = runReadOnlyCommand) {}

  enqueue(command: string, options: { ownerId?: string; requestId?: string; ttlMs?: number } = {}): LocalJob {
    resolveReadOnlyCommand(command)
    const { ownerId, requestId, ttlMs = 300_000 } = options
    if (!Number.isInteger(ttlMs) || ttlMs < 1_000 || ttlMs > 3_600_000) throw new Error('Invalid job TTL')
    if (ownerId !== undefined && !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(ownerId)) throw new Error('Invalid owner')
    if (requestId !== undefined && !/^[a-zA-Z0-9_-]{8,80}$/.test(requestId)) throw new Error('Invalid request ID')
    const prior = requestId && this.jobs.find(job => job.ownerId === ownerId && job.requestId === requestId)
    if (prior) {
      if (prior.command !== command) throw new Error('Idempotency key conflict')
      return { ...prior }
    }
    // Retain bounded history, never discard unfinished jobs.
    while (this.jobs.length >= 100) {
      const index = this.jobs.findIndex(job => ['succeeded', 'failed', 'cancelled'].includes(job.status))
      if (index < 0) throw new Error('Job history is full')
      this.jobs.splice(index, 1)
    }
    if (this.jobs.filter(job => job.status === 'pending').length >= 20) throw new Error('Queue full')
    const now = Date.now()
    const job: LocalJob = { id: randomUUID(), command, status: 'pending', createdAt: new Date(now).toISOString(), expiresAt: new Date(now + ttlMs).toISOString(), ...(ownerId ? { ownerId } : {}), ...(requestId ? { requestId } : {}) }
    this.jobs.push(job)
    return { ...job }
  }

  list(ownerId?: string): LocalJob[] { return this.jobs.filter(job => ownerId === undefined || job.ownerId === ownerId).map(job => ({ ...job })) }

  get(id: string, ownerId?: string): LocalJob | null {
    const job = this.jobs.find(entry => entry.id === id && (ownerId === undefined || entry.ownerId === ownerId))
    return job ? { ...job } : null
  }

  /** Only pending jobs can be cancelled; running commands cannot be interrupted by this API. */
  cancel(id: string, ownerId?: string): LocalJob | null {
    const job = this.jobs.find(entry => entry.id === id && (ownerId === undefined || entry.ownerId === ownerId))
    if (!job || job.status !== 'pending') return null
    job.status = 'cancelled'
    job.cancelledAt = new Date().toISOString()
    job.completedAt = job.cancelledAt
    return { ...job }
  }

  expirePending(now = Date.now()): number {
    let count = 0
    for (const job of this.jobs) {
      if (job.status === 'pending' && job.expiresAt && Date.parse(job.expiresAt) <= now) {
        job.status = 'cancelled'
        job.completedAt = new Date(now).toISOString()
        count++
      }
    }
    return count
  }

  async processNext(): Promise<LocalJob | null> {
    this.expirePending()
    if (this.running) return null
    const job = this.jobs.find(entry => entry.status === 'pending')
    if (!job) return null
    this.running = true
    job.status = 'running'
    try {
      const result = await this.execute(job.command)
      job.status = result.status
      // Only the approved version commands are stored; never persist arbitrary process output.
      job.output = /^v\d[\w.+-]*$|^git version \d[\w.+-]*(?:\s+\([^\r\n]{1,80}\))?$/.test(result.output)
        ? result.output.slice(0, 256) : '출력 확인 불가'
    } catch {
      job.status = 'failed'
      job.output = '작업 실패'
    } finally {
      job.completedAt = new Date().toISOString()
      this.running = false
    }
    return { ...job }
  }
}
