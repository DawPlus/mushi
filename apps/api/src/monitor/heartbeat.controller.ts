import { Public } from '../auth/public.decorator.js'
import { Controller, Get, Headers, Param, Post, Body, UnauthorizedException, BadRequestException, ConflictException, ServiceUnavailableException } from '@nestjs/common'
import { verifyDeviceBearer } from './device-auth.js'
import { createHeartbeatStore, HeartbeatRejectedError } from './heartbeat-store.js'
import { heartbeatView } from './heartbeat-status.js'
import { parseMacSnapshot } from './mac-snapshot.js'
import { parseBridgeState } from './bridge-state.js'
import { validObservedAt } from './replay-policy.js'
import { auditDevice } from './device-audit.js'

type HeartbeatRequest = { agentVersion?: unknown; observedAt?: unknown; metrics?: unknown; bridge?: unknown }
const config = () => ({
  deviceId: process.env.MONITOR_DEVICE_ID,
  ownerId: process.env.MONITOR_OWNER_ID,
  token: process.env.MONITOR_DEVICE_TOKEN,
  previousToken: process.env.MONITOR_DEVICE_PREVIOUS_TOKEN,
  previousTokenValidUntil: process.env.MONITOR_DEVICE_PREVIOUS_TOKEN_VALID_UNTIL,
  revoked: process.env.MONITOR_DEVICE_REVOKED,
})

@Public()
@Controller('devices')
export class HeartbeatController {
  private async device(authorization: string | undefined, deviceId: string) {
    const authenticated = verifyDeviceBearer(authorization, deviceId, config())
    if (!authenticated) { auditDevice('auth_denied'); throw new UnauthorizedException() }
    return authenticated
  }

  @Post(':deviceId/heartbeat')
  async heartbeat(
    @Param('deviceId') deviceId: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: HeartbeatRequest | undefined,
  ) {
    const device = await this.device(authorization, deviceId)
    const version = body?.agentVersion
    if (version !== undefined && (typeof version !== 'string' || version.length > 64 || !/^[a-zA-Z0-9._-]+$/.test(version))) {
      auditDevice('heartbeat_invalid')
      throw new BadRequestException('Invalid agent version')
    }
    const observedAt = body?.observedAt
    if (!validObservedAt(observedAt)) {
      auditDevice('heartbeat_invalid')
      throw new BadRequestException('Invalid heartbeat timestamp')
    }
    const metrics = body?.metrics === undefined ? null : parseMacSnapshot(body.metrics)
    if (body?.metrics !== undefined && !metrics) { auditDevice('heartbeat_invalid'); throw new BadRequestException('Invalid Mac metrics') }
    const bridge = body?.bridge === undefined ? null : parseBridgeState(body.bridge)
    if (body?.bridge !== undefined && !bridge) { auditDevice('heartbeat_invalid'); throw new BadRequestException('Invalid Bridge state') }
    const url = process.env.MONITOR_DATABASE_URL
    if (!url) { auditDevice('storage_failure'); throw new ServiceUnavailableException('Storage unavailable') }
    const store = createHeartbeatStore(url)
    try {
      const value = await store.record(device, version ?? null, metrics, bridge, observedAt)
      auditDevice('heartbeat_accepted')
      return value
    } catch (error) {
      if (error instanceof HeartbeatRejectedError) { auditDevice('heartbeat_rejected'); throw new ConflictException('Heartbeat rejected') }
      auditDevice('storage_failure')
      throw error
    } finally { await store.close() }
  }

  @Get(':deviceId/heartbeat')
  async lastHeartbeat(
    @Param('deviceId') deviceId: string,
    @Headers('authorization') authorization: string | undefined,
  ) {
    const device = await this.device(authorization, deviceId)
    const url = process.env.MONITOR_DATABASE_URL
    if (!url) throw new ServiceUnavailableException('Storage unavailable')
    const store = createHeartbeatStore(url)
    try {
      const value = await store.lastSeen(device)
      return heartbeatView(value)
    } finally { await store.close() }
  }
}

