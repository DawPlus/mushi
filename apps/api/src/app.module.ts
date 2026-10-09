import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AuthController } from './auth/auth.controller.js'
import { OwnerController } from './auth/owner.controller.js'
import { ApiTokenGuard } from './auth/api-token.guard.js'
import { HealthController } from './health.controller.js'

@Module({
  controllers: [HealthController, AuthController, OwnerController],
  providers: [{ provide: APP_GUARD, useClass: ApiTokenGuard }],
})
export class AppModule {}
