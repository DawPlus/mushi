import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { createProcessManager } from "../../dist/control/processManager.js";

function fakeChild({ pid = 4242 } = {}) {
	const child = new EventEmitter();
	child.pid = pid;
	child.killed = false;
	child.stdout = new EventEmitter();
	child.stderr = new EventEmitter();
	child.kill = () => {
		child.killed = true;
		queueMicrotask(() => child.emit("exit", 0, null));
		return true;
	};
	return child;
}

test("processManager can run multiple projects at once", async () => {
	const spawned = [];
	const children = [fakeChild({ pid: 1 }), fakeChild({ pid: 2 })];
	let index = 0;
	const manager = createProcessManager({
		spawnImpl: (_command, args, options) => {
			spawned.push({ args, options });
			const child = children[index];
			index += 1;
			queueMicrotask(() => child.emit("spawn"));
			return child;
		},
		bridgeEntry: "/fake/onionBridge.js",
		nodeBin: "/fake/node",
	});

	await manager.start({
		workspace: "/tmp/a",
		profile: "web-a",
		useProfileArg: true,
	});
	await manager.start({
		workspace: "/tmp/b",
		profile: "web-b",
		useProfileArg: true,
	});

	const status = manager.getStatus();
	assert.equal(status.activeCount, 2);
	assert.equal(status.projects.length, 2);
	assert.deepEqual(spawned[0].args, ["/fake/onionBridge.js", "web-a"]);
	assert.deepEqual(spawned[1].args, ["/fake/onionBridge.js", "web-b"]);
});

test("processManager stop only affects the requested project", async () => {
	const childA = fakeChild({ pid: 11 });
	const childB = fakeChild({ pid: 22 });
	const manager = createProcessManager({
		spawnImpl: (_command, args) => {
			const child = args.includes("web-a") ? childA : childB;
			queueMicrotask(() => child.emit("spawn"));
			return child;
		},
		bridgeEntry: "/fake/onionBridge.js",
		nodeBin: "/fake/node",
	});

	await manager.start({
		workspace: "/tmp/a",
		profile: "web-a",
		useProfileArg: true,
	});
	await manager.start({
		workspace: "/tmp/b",
		profile: "web-b",
		useProfileArg: true,
	});

	await manager.stop("/tmp/a");
	const status = manager.getStatus();
	assert.equal(status.activeCount, 1);
	assert.equal(status.projects[0].workspace, "/tmp/b");
	assert.equal(status.projects[0].state, "running");
});

test("processManager rejects a second start for the same project", async () => {
	const child = fakeChild();
	const manager = createProcessManager({
		spawnImpl: () => {
			queueMicrotask(() => child.emit("spawn"));
			return child;
		},
		bridgeEntry: "/fake/onionBridge.js",
		nodeBin: "/fake/node",
	});

	await manager.start({
		workspace: "/tmp/a",
		profile: "web-a",
		useProfileArg: true,
	});
	await assert.rejects(
		() =>
			manager.start({
				workspace: "/tmp/a",
				profile: "web-a",
				useProfileArg: true,
			}),
		/already active/i,
	);
});
