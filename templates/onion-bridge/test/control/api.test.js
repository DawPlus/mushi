import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createControlApp } from "../../dist/control/api.js";
import { createProcessManager } from "../../dist/control/processManager.js";
import { saveWebSettings } from "../../dist/control/settings.js";

async function withServer(app, run) {
	const server = await new Promise((resolve, reject) => {
		const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
		instance.once("error", reject);
	});
	const { port } = server.address();
	try {
		await run(`http://127.0.0.1:${port}`);
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
}

function baseAppOptions(overrides = {}) {
	return {
		detectRunning: async () => new Map(),
		...overrides,
	};
}

function fakeChild(pid = 99) {
	const child = new EventEmitter();
	child.pid = pid;
	child.stdout = new EventEmitter();
	child.stderr = new EventEmitter();
	child.kill = () => {
		queueMicrotask(() => child.emit("exit", 0, null));
		return true;
	};
	return child;
}

test("GET /api/status returns empty multi-project payload when idle", async () => {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "onion-api-"));
	const app = createControlApp({
		rootDir: dir,
		detectRunning: async () => new Map(),
		processManager: createProcessManager({
			spawnImpl: () => {
				throw new Error("should not spawn");
			},
			bridgeEntry: "/fake/onionBridge.js",
			nodeBin: "/fake/node",
		}),
		listProfileProjects: async () => [],
		readGlobalSetup: async () => undefined,
	});

	await withServer(app, async (base) => {
		const body = await (await fetch(`${base}/api/status`)).json();
		assert.deepEqual(body.projects, []);
		assert.equal(body.activeCount, 0);
		assert.equal(body.apiKey, undefined);
	});
});

test("POST /api/start allows one project and rejects a second concurrent start", async () => {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "onion-api-"));
	const projectA = path.join(dir, "a");
	const projectB = path.join(dir, "b");
	await fs.mkdir(projectA);
	await fs.mkdir(projectB);

	const children = new Map();
	const spawned = [];

	const app = createControlApp({
		rootDir: dir,
		detectRunning: async () => new Map(),
		processManager: createProcessManager({
			spawnImpl: (_cmd, args) => {
				spawned.push(args);
				const child = fakeChild(spawned.length);
				children.set(args[1], child);
				queueMicrotask(() => child.emit("spawn"));
				return child;
			},
			bridgeEntry: "/fake/onionBridge.js",
			nodeBin: "/fake/node",
		}),
		listProfileProjects: async () => [
			{ path: projectA, name: "a", profile: "web-a", source: "profile" },
			{ path: projectB, name: "b", profile: "web-b", source: "profile" },
		],
		readGlobalSetup: async () => ({
			tunnelBin: "/bin/tunnel-client",
			apiKey: "sk-test",
		}),
	});

	await withServer(app, async (base) => {
		const startARes = await fetch(`${base}/api/start`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ workspace: projectA }),
		});
		const startA = await startARes.json();
		assert.equal(startARes.status, 200);
		assert.equal(startA.state, "running");
		assert.equal(startA.profile, "web-a");
		assert.deepEqual(spawned[0], ["/fake/onionBridge.js", "web-a"]);

		const startBRes = await fetch(`${base}/api/start`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ workspace: projectB }),
		});
		const startB = await startBRes.json();
		assert.equal(startBRes.status, 409);
		assert.match(String(startB.error), /1개/);

		const status = await (await fetch(`${base}/api/status`)).json();
		assert.equal(status.activeCount, 1);

		const stopA = await (
			await fetch(`${base}/api/stop`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ workspace: projectA }),
			})
		).json();
		assert.equal(stopA.state, "idle");

		const startBOk = await (
			await fetch(`${base}/api/start`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ workspace: projectB }),
			})
		).json();
		assert.equal(startBOk.state, "running");
		assert.equal(startBOk.profile, "web-b");
	});
});

test("settings endpoints mask secrets and preserve apiKey when masked value is sent back", async () => {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "onion-api-"));
	const project = path.join(dir, "proj");
	await fs.mkdir(project);
	await saveWebSettings({ projects: [project] }, { rootDir: dir });

	let storedGlobal = {
		tunnelBin: "/bin/tunnel-client",
		apiKey: "sk-secret-value-1234",
	};
	let storedProfile = {
		workspace: project,
		port: 3737,
		tunnelId: "tunnel_existing",
		token: "token-secret",
	};
	const writes = [];

	const app = createControlApp({
		rootDir: dir,
		detectRunning: async () => new Map(),
		processManager: createProcessManager({
			spawnImpl: () => {
				throw new Error("unused");
			},
			bridgeEntry: "/fake/onionBridge.js",
			nodeBin: "/fake/node",
		}),
		listProfileProjects: async () => [],
		readGlobalSetup: async () => storedGlobal,
		readProfile: async () => storedProfile,
		writeGlobalSetup: async (next) => {
			writes.push(["global", next]);
			storedGlobal = { ...storedGlobal, ...next };
			return storedGlobal;
		},
		writeProfile: async (name, profile) => {
			writes.push(["profile", name, profile]);
			storedProfile = { ...storedProfile, ...profile };
			return storedProfile;
		},
	});

	await withServer(app, async (base) => {
		const get = await (await fetch(`${base}/api/settings`)).json();
		assert.equal(get.apiKey, undefined);
		assert.equal(get.token, undefined);
		assert.equal(get.apiKeyPresent, true);
		assert.match(get.apiKeyMasked, /•/);
		assert.equal(get.tunnelBin, "/bin/tunnel-client");
		assert.equal(get.tunnelId, "tunnel_existing");

		const put = await fetch(`${base}/api/settings`, {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				projects: [project],
				defaultProfile: "default",
				controlPort: 3847,
				tunnelBin: "/opt/tunnel-client",
				apiKey: get.apiKeyMasked,
				tunnelId: "tunnel_existing",
			}),
		});
		assert.equal(put.status, 200);
		const body = await put.json();
		assert.equal(body.apiKey, undefined);
		assert.equal(body.token, undefined);
		assert.equal(body.tunnelBin, "/opt/tunnel-client");
		assert.equal(storedGlobal.apiKey, "sk-secret-value-1234");
		assert.equal(writes[0][0], "global");
		assert.equal(writes[0][1].apiKey, "sk-secret-value-1234");
	});
});

test("workspace root expands package.json children only and remove deletes the root", async () => {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "onion-api-"));
	const root = path.join(dir, "workspace");
	const childA = path.join(root, "alpha");
	const childB = path.join(root, "beta");
	const docs = path.join(root, "docs");
	await fs.mkdir(childA, { recursive: true });
	await fs.mkdir(childB, { recursive: true });
	await fs.mkdir(docs, { recursive: true });
	await fs.writeFile(path.join(childA, "package.json"), "{}");
	await fs.writeFile(path.join(childB, "package.json"), "{}");

	const app = createControlApp({
		rootDir: dir,
		detectRunning: async () => new Map(),
		processManager: createProcessManager({
			spawnImpl: () => {
				throw new Error("unused");
			},
			bridgeEntry: "/fake/onionBridge.js",
			nodeBin: "/fake/node",
		}),
		listProfileProjects: async () => [
			{ path: root, name: "workspace", profile: "default", source: "profile" },
			{ path: docs, name: "docs", profile: "docs", source: "profile" },
		],
		readGlobalSetup: async () => undefined,
		readProfile: async () => undefined,
	});

	await withServer(app, async (base) => {
		const added = await (
			await fetch(`${base}/api/projects`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ path: root }),
			})
		).json();
		assert.equal(added.roots.length, 1);
		assert.equal(added.projects.length, 2);
		assert.deepEqual(
			added.projects.map((item) => item.name).sort(),
			["alpha", "beta"],
		);

		const removed = await (
			await fetch(`${base}/api/projects/remove`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ path: childA }),
			})
		).json();
		assert.equal(removed.removedRoot, root);
		assert.deepEqual(removed.roots, []);
		assert.deepEqual(removed.projects, []);
	});
});

test("GET /api/projects marks externally running bridges as active", async () => {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "onion-api-"));
	const root = path.join(dir, "workspace");
	const project = path.join(root, "project01");
	await fs.mkdir(project, { recursive: true });
	await fs.writeFile(path.join(project, "package.json"), "{}");

	const app = createControlApp({
		rootDir: dir,
		detectRunning: async () =>
			new Map([
				[
					project,
					{
						state: "running",
						workspace: project,
						profile: "project01",
						tunnelProfile: "onion-project01",
						pid: 777,
						port: 3737,
						error: null,
						managed: false,
						active: true,
					},
				],
			]),
		processManager: createProcessManager({
			spawnImpl: () => {
				throw new Error("unused");
			},
			bridgeEntry: "/fake/onionBridge.js",
			nodeBin: "/fake/node",
		}),
		listProfileProjects: async () => [
			{
				path: project,
				name: "project01",
				profile: "project01",
				source: "profile",
			},
		],
		readGlobalSetup: async () => undefined,
		readProfile: async () => undefined,
	});

	await withServer(app, async (base) => {
		await fetch(`${base}/api/projects`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ path: root }),
		});
		const body = await (await fetch(`${base}/api/projects`)).json();
		const item = body.projects.find((entry) => entry.path === project);
		assert.ok(item);
		assert.equal(item.state, "running");
		assert.equal(item.active, true);
		assert.equal(item.pid, 777);
		assert.equal(item.managed, false);
		assert.equal(item.profile, "project01");
	});
});

test("POST /api/browse-folder returns unsupported when picker unavailable", async () => {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "onion-api-"));
	const app = createControlApp({
		rootDir: dir,
		detectRunning: async () => new Map(),
		processManager: createProcessManager({
			spawnImpl: () => {
				throw new Error("unused");
			},
			bridgeEntry: "/fake/onionBridge.js",
			nodeBin: "/fake/node",
		}),
		listProfileProjects: async () => [],
		browseFolder: () => ({
			unsupported: true,
			error: "Native folder picker is unavailable on this platform.",
		}),
	});

	await withServer(app, async (base) => {
		const res = await fetch(`${base}/api/browse-folder`, { method: "POST" });
		assert.equal(res.status, 501);
		const body = await res.json();
		assert.equal(body.unsupported, true);
	});
});

test("POST /api/projects/flags toggles favorite and hidden on projects", async () => {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "onion-api-"));
	const root = path.join(dir, "workspace");
	const project = path.join(root, "pkg");
	await fs.mkdir(project, { recursive: true });
	await fs.writeFile(path.join(project, "package.json"), "{}");
	await saveWebSettings({ projects: [root] }, { rootDir: dir });

	const app = createControlApp({
		rootDir: dir,
		detectRunning: async () => new Map(),
		processManager: createProcessManager({
			spawnImpl: () => {
				throw new Error("unused");
			},
			bridgeEntry: "/fake/onionBridge.js",
			nodeBin: "/fake/node",
		}),
		listProfileProjects: async () => [],
	});

	await withServer(app, async (base) => {
		let res = await fetch(`${base}/api/projects/flags`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ path: project, favorite: true }),
		});
		assert.equal(res.status, 200);
		let body = await res.json();
		let item = body.projects.find((entry) => entry.path === project);
		assert.ok(item);
		assert.equal(item.favorite, true);
		assert.equal(item.hidden, false);

		res = await fetch(`${base}/api/projects/flags`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ path: project, hidden: true }),
		});
		body = await res.json();
		item = body.projects.find((entry) => entry.path === project);
		assert.equal(item.hidden, true);
		assert.equal(item.favorite, false);
	});
});
