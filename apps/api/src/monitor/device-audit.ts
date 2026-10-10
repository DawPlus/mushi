import { Logger } from '@nestjs/common'

const logger = new Logger('DeviceAudit')
export type DeviceAuditEvent = 'auth_denied' | 'heartbeat_accepted' | 'heartbeat_invalid' | 'heartbeat_rejected' | 'storage_failure'

/** Deliberately exclude device IDs, IPs, bearer credentials and request bodies. */
export function auditDevice(event: DeviceAuditEvent): void {
  const message = JSON.stringify({ event, at: new Date().toISOString() })
  if (event === 'heartbeat_accepted') logger.log(message)
  else logger.warn(message)
}
