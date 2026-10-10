import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { BridgeController } from "./bridge.controller.js";
import { BridgeService } from "./bridge.service.js";

@Module({
	imports: [AuthModule],
	controllers: [BridgeController],
	providers: [BridgeService],
	exports: [BridgeService],
})
export class BridgeModule {}
