import postgres from 'postgres'
import { randomUUID } from 'node:crypto'
import { resolveReadOnlyCommand } from './cli-policy.js'

type Identity = { ownerId: string; deviceId: string }
type JobRow = { id: string; owner_id: string; device_id: string; request_id: string; command: string; status: string; lease_id: string | null; lease_until: Date | null; expires_at: Date }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const REQUEST = /^[a-zA-Z0-9_-]{8,80}$/
function validIdentity(identity: Identity) {
  if (!UUID.test(identity.ownerId) || !UUID.test(identity.deviceId)) throw new Error('Verified owner/device required')
}
/** Repository is deliberately not wired to HTTP or agent command execution. */
export function createDurableJobStore(url: string) {
  if (!url) throw new Error('DATABASE_URL required')
  const sql = postgres(url, { max: 2, idle_timeout: 10, connect_timeout: 5, prepare: false })
  return {
    async create(identity: Identity, command: string, requestId: string) {
      validIdentity(identity)
      resolveReadOnlyCommand(command)
      if (!REQUEST.test(requestId)) throw new Error('Invalid request ID')
      return sql.begin(async tx => {
        const rows = await tx<JobRow[]>`
          INSERT INTO terminal.device_jobs (owner_id, device_id, request_id, command)
          VALUES (${identity.ownerId}, ${identity.deviceId}, ${requestId}, ${command})
          ON CONFLICT (owner_id, request_id) DO NOTHING
          RETURNING *
        `
        const existing = rows[0] ? null : (await tx<JobRow[]>`
          SELECT * FROM terminal.device_jobs WHERE owner_id = ${identity.ownerId} AND request_id = ${requestId}
        `)[0]
        const job = rows[0] ?? existing
        if (!job || job.command !== command || job.device_id !== identity.deviceId) throw new Error('Idempotency key conflict')
        if (rows[0]) await tx`INSERT INTO terminal.device_job_events (job_id, event) VALUES (${job.id}, 'created')`
        return job
      })
    },
    async list(identity: Identity, limit = 50) {
      validIdentity(identity)
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid limit')
      return sql<JobRow[]>`
        SELECT * FROM terminal.device_jobs
        WHERE owner_id = ${identity.ownerId} AND device_id = ${identity.deviceId}
        ORDER BY created_at DESC LIMIT ${limit}
      `
    },
    async get(identity: Identity, jobId: string) {
      validIdentity(identity)
      if (!UUID.test(jobId)) throw new Error('Invalid job ID')
      const rows = await sql<JobRow[]>`
        SELECT * FROM terminal.device_jobs
        WHERE id = ${jobId} AND owner_id = ${identity.ownerId} AND device_id = ${identity.deviceId}
        LIMIT 1
      `
      return rows[0] ?? null
    },
    async cancel(identity: Identity, jobId: string) {
      validIdentity(identity)
      if (!UUID.test(jobId)) throw new Error('Invalid job ID')
      return sql.begin(async tx => {
        const rows = await tx<JobRow[]>`
          UPDATE terminal.device_jobs SET status = 'cancelled', completed_at = now()
          WHERE id = ${jobId} AND owner_id = ${identity.ownerId} AND device_id = ${identity.deviceId}
            AND status = 'pending' AND expires_at > now()
          RETURNING *
        `
        if (rows[0]) await tx`INSERT INTO terminal.device_job_events (job_id, event) VALUES (${jobId}, 'cancelled')`
        return rows[0] ?? null
      })
    },
    async claim(identity: Identity) {
      validIdentity(identity)
      return sql.begin(async tx => {
        const rows = await tx<JobRow[]>`
          SELECT * FROM terminal.device_jobs
          WHERE owner_id = ${identity.ownerId} AND device_id = ${identity.deviceId}
            AND status = 'pending' AND expires_at > now()
          ORDER BY created_at ASC FOR UPDATE SKIP LOCKED LIMIT 1
        `
        const row = rows[0]
        if (!row) return null
        const leaseId = randomUUID()
        const updated = await tx<JobRow[]>`
          UPDATE terminal.device_jobs SET status = 'leased', lease_id = ${leaseId},
            lease_until = LEAST(expires_at, now() + interval '45 seconds')
          WHERE id = ${row.id} AND status = 'pending' AND expires_at > now()
          RETURNING *
        `
        if (!updated[0]) return null
        await tx`INSERT INTO terminal.device_job_events (job_id, event) VALUES (${row.id}, 'claimed')`
        return updated[0]
      })
    },
    async acknowledge(identity: Identity, jobId: string, leaseId: string, outcome: 'succeeded' | 'failed') {
      validIdentity(identity)
      if (!UUID.test(jobId) || !UUID.test(leaseId) || !['succeeded', 'failed'].includes(outcome)) throw new Error('Invalid ack')
      return sql.begin(async tx => {
        const rows = await tx<JobRow[]>`
          UPDATE terminal.device_jobs SET status = ${outcome}, completed_at = now(), lease_id = NULL, lease_until = NULL
          WHERE id = ${jobId} AND owner_id = ${identity.ownerId} AND device_id = ${identity.deviceId}
            AND status = 'leased' AND lease_id = ${leaseId} AND lease_until > now() AND expires_at > now()
          RETURNING *
        `
        if (!rows[0]) return null
        await tx`INSERT INTO terminal.device_job_events (job_id, event) VALUES (${jobId}, 'completed')`
        return rows[0]
      })
    },
    async expire() {
      return sql.begin(async tx => {
        const rows = await tx<{ id: string }[]>`
          UPDATE terminal.device_jobs SET status = 'expired', completed_at = now(), lease_id = NULL, lease_until = NULL
          WHERE (status = 'pending' AND expires_at <= now())
             OR (status = 'leased' AND (lease_until IS NULL OR lease_until <= now() OR expires_at <= now()))
          RETURNING id
        `
        for (const row of rows) await tx`INSERT INTO terminal.device_job_events (job_id, event) VALUES (${row.id}, 'expired')`
        return rows.length
      })
    },
    close: () => sql.end(),
  }
}
