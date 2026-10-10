import { MacAgentControlController } from './monitor/mac-agent-control.controller.js'
import { HeartbeatController } from './monitor/heartbeat.controller.js'
import { OwnerHeartbeatController } from './monitor/owner-heartbeat.controller.js'
import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AuthController } from './auth/auth.controller.js'
import { OwnerController } from './auth/owner.controller.js'
import { ApiTokenGuard } from './auth/api-token.guard.js'
import { BurstLimitGuard } from './auth/burst-limit.guard.js'
import { BridgeModule } from './bridge/bridge.module.js'
import { HealthController } from './health.controller.js'
import { OwnerJobsController } from './system/owner-jobs.controller.js'
import { OwnerProjectsController } from './system/owner-projects.controller.js'
import { OwnerCodyncController } from './system/owner-codync.controller.js'

@Module({
  imports: [BridgeModule],
  controllers: [MacAgentControlController, HealthController, AuthController, OwnerController, HeartbeatController, OwnerHeartbeatController, OwnerJobsController, OwnerProjectsController, OwnerCodyncController],
  providers: [{ provide: APP_GUARD, useClass: BurstLimitGuard }, { provide: APP_GUARD, useClass: ApiTokenGuard }],
})
export class AppModule {}
