import { Logger } from '@nestjs/common'

const logger = new Logger('CliJobAudit')
export type CliAuditEvent = 'job_created' | 'job_reused' | 'job_cancelled'

/** Event names and server time only. No commands, job IDs, request IDs or owner IDs. */
export function auditCliJob(event: CliAuditEvent): void {
  logger.log(JSON.stringify({ event, at: new Date().toISOString() }))
}
