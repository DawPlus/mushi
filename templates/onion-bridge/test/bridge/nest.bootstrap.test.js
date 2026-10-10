import assert from "node:assert/strict";
import test from "node:test";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { BridgeModule } from "../../dist/bridge/bridge.module.js";
import { BridgeService } from "../../dist/bridge/bridge.service.js";
import { ControlModule } from "../../dist/control/control.module.js";

test("BridgeModule boots and exposes BridgeService", async () => {
	const app = await NestFactory.createApplicationContext(BridgeModule, {
		logger: false,
	});
	const bridge = app.get(BridgeService);
	assert.equal(typeof bridge.init, "function");
	assert.equal(typeof bridge.handleMcp, "function");
	await app.close();
});

test("ControlModule boots as Nest shell", async () => {
	const app = await NestFactory.createApplicationContext(ControlModule, {
		logger: false,
	});
	assert.ok(app);
	await app.close();
});
