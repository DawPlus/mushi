import { Public } from '../auth/public.decorator.js'
import { Controller, Get, Headers, Param, Query, BadRequestException, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common'
import { verifyOwnerBearer } from './owner-auth.js'
import { createHeartbeatStore } from './heartbeat-store.js'
import { heartbeatView } from './heartbeat-status.js'

@Public()
@Controller('owner/devices')
export class OwnerHeartbeatController {
  @Get(':deviceId/metrics-history')
  async history(
    @Param('deviceId') deviceId: string,
    @Headers('authorization') authorization: string | undefined,
    @Query('hours') rawHours?: string,
  ) {
    const ownerId = await verifyOwnerBearer(authorization, {
      url: process.env.SUPABASE_URL,
      publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
      ownerId: process.env.MONITOR_OWNER_ID,
    })
    if (!ownerId || deviceId !== process.env.MONITOR_DEVICE_ID) throw new UnauthorizedException()
    if (rawHours !== undefined && !['1', '6', '24', '72', '168'].includes(rawHours)) throw new BadRequestException('Invalid history range')
    if (!process.env.MONITOR_DATABASE_URL) throw new ServiceUnavailableException('Storage unavailable')
    const hours = Number(rawHours ?? '24')
    const store = createHeartbeatStore(process.env.MONITOR_DATABASE_URL)
    try {
      return { samples: await store.history({ deviceId, ownerId }, new Date(Date.now() - hours * 3600000), 500), hours }
    } finally { await store.close() }
  }

  @Get(':deviceId/heartbeat')
  async lastHeartbeat(
    @Param('deviceId') deviceId: string,
    @Headers('authorization') authorization: string | undefined,
  ) {
    const ownerId = await verifyOwnerBearer(authorization, {
      url: process.env.SUPABASE_URL,
      publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
      ownerId: process.env.MONITOR_OWNER_ID,
    })
    if (!ownerId || deviceId !== process.env.MONITOR_DEVICE_ID) throw new UnauthorizedException()
    const url = process.env.MONITOR_DATABASE_URL
    if (!url) throw new ServiceUnavailableException('Storage unavailable')
    const store = createHeartbeatStore(url)
    try {
      const value = await store.lastSeen({ deviceId, ownerId })
      return heartbeatView(value)
    } finally { await store.close() }
  }
}
