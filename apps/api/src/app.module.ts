import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AuthController } from './auth/auth.controller.js'
import { OwnerController } from './auth/owner.controller.js'
import { ApiTokenGuard } from './auth/api-token.guard.js'
import { BurstLimitGuard } from './auth/burst-limit.guard.js'
import { NotesModule } from './notes/notes.module.js'
import { BookmarksModule } from './bookmarks/bookmarks.module.js'
import { HealthController } from './health.controller.js'
import { GithubTrendingController } from './news/news.controller.js'
import { HeartbeatController } from './monitor/heartbeat.controller.js'
import { OwnerHeartbeatController } from './monitor/owner-heartbeat.controller.js'
import { OwnerProjectsController } from './system/owner-projects.controller.js'
import { OwnerPublicDataController } from './public-data/owner-public-data.controller.js'
import { OpportunitiesController } from './opportunities/opportunities.controller.js'

@Module({
  imports: [NotesModule, BookmarksModule],
  controllers: [
    GithubTrendingController, HealthController, AuthController, OwnerController,
    HeartbeatController, OwnerHeartbeatController, OwnerProjectsController,
    OwnerPublicDataController, OpportunitiesController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: BurstLimitGuard },
    { provide: APP_GUARD, useClass: ApiTokenGuard },
  ],
})
export class AppModule {}
