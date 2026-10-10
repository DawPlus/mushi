import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { BridgeService } from "./bridge.service.js";

@Controller()
export class BridgeController {
	constructor(private readonly bridge: BridgeService) {}

	@Get("health")
	health() {
		return this.bridge.healthPayload();
	}

	@Post("mcp")
	async mcp(@Req() req: Request, @Res() res: Response): Promise<void> {
		await this.bridge.handleMcp(req, res);
	}
}
