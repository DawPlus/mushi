import assert from "node:assert/strict";
import test from "node:test";
import {
	detectRunningBridges,
	probeBridgeHealth,
	stopExternalBridge,
} from "../../dist/control/detect.js";

test("probeBridgeHealth returns null when port is down", async () => {
	const result = await probeBridgeHealth(1, {
		fetchImpl: async () => {
			throw new Error("ECONNREFUSED");
		},
	});
	assert.equal(result, null);
});

test("detectRunningBridges maps healthy profile ports to workspaces", async () => {
	const detected = await detectRunningBridges({
		listProfilesFn: async () => ["project01"],
		readProfileFn: async () => ({
			workspace: "/tmp/project01",
			port: 3737,
			tunnelId: "tunnel_x",
			token: "t",
		}),
		fetchImpl: async () => ({
			ok: true,
			json: async () => ({
				status: "ok",
				profile: "project01",
				workspace: "/tmp/project01",
				pid: 4242,
				port: 3737,
			}),
		}),
		findPid: () => null,
	});

	assert.equal(detected.size, 1);
	const item = detected.get("/tmp/project01");
	assert.equal(item.state, "running");
	assert.equal(item.profile, "project01");
	assert.equal(item.pid, 4242);
	assert.equal(item.managed, false);
});

test("stopExternalBridge sends SIGTERM to pid", async () => {
	const killed = [];
	const originalKill = process.kill;
	process.kill = (pid, signal) => {
		killed.push({ pid, signal });
		return true;
	};
	try {
		const result = await stopExternalBridge({ pid: 99, port: 3737 });
		assert.equal(result.pid, 99);
		assert.deepEqual(killed, [{ pid: 99, signal: "SIGTERM" }]);
	} finally {
		process.kill = originalKill;
	}
});
