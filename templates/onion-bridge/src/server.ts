import "reflect-metadata";
import express from "express";
import { NestFactory } from "@nestjs/core";
import { BridgeModule } from "./bridge/bridge.module.js";
import { BridgeService } from "./bridge/bridge.service.js";

export async function startBridge(
	profileName = "default",
	workspaceOverride?: string,
) {
	const app = await NestFactory.create(BridgeModule, {
		logger: ["error", "warn"],
	});
	app.use(express.json({ limit: "5mb" }));

	const bridge = app.get(BridgeService);
	const config = await bridge.init(profileName, workspaceOverride);

	await app.listen(config.port, "127.0.0.1");
	bridge.afterListen(() => {
		void app.close().then(() => process.exit(0));
	});

	return app;
}
