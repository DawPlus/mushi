import { Module } from '@nestjs/common'
import { BridgeController } from './bridge.controller.js'
import { OwnerBridgeController } from './owner-bridge.controller.js'
import { BridgeService, bridgeService } from './bridge.service.js'
import {
  BridgeManagerService,
  bridgeManagerService,
} from './bridge-manager.service.js'

@Module({
  controllers: [BridgeController, OwnerBridgeController],
  providers: [
    { provide: BridgeService, useValue: bridgeService },
    { provide: BridgeManagerService, useValue: bridgeManagerService },
  ],
  exports: [BridgeService, BridgeManagerService],
})
export class BridgeModule {}
