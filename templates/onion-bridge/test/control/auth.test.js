import assert from "node:assert/strict";
import express from "express";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
	assertControlAuthorized,
	createControlAuthMiddleware,
	resolveControlAuthConfig,
} from "../../dist/control/auth.js";
import { createControlApp } from "../../dist/control/api.js";

async function tempDir() {
	return fs.mkdtemp(path.join(os.tmpdir(), "onion-control-auth-"));
}

function listen(app) {
	const server = http.createServer(app);
	return new Promise((resolve) => {
		server.listen(0, "127.0.0.1", () => {
			const { port } = server.address();
			resolve({
				server,
				base: `http://127.0.0.1:${port}`,
				close: () =>
					new Promise((r, j) => server.close((err) => (err ? j(err) : r()))),
			});
		});
	});
}

test("resolveControlAuthConfig defaults to local", () => {
	const auth = resolveControlAuthConfig({ env: {} });
	assert.equal(auth.mode, "local");
	assert.equal(auth.token, null);
});

test("assertControlAuthorized allows local mode without bearer", () => {
	const result = assertControlAuthorized(
		{ headers: {} },
		{ mode: "local", token: null },
	);
	assert.equal(result.ok, true);
});

test("assertControlAuthorized rejects missing token in token mode", () => {
	const result = assertControlAuthorized(
		{ headers: {} },
		{ mode: "token", token: "secret" },
	);
	assert.equal(result.ok, false);
	assert.equal(result.status, 401);
});

test("createControlApp local mode keeps /api/projects open", async () => {
	const rootDir = await tempDir();
	const app = createControlApp({
		rootDir,
		processManager: {
			getStatus: () => ({ projects: [], activeCount: 0 }),
			getProject: () => null,
			listRunningWorkspaces: () => [],
		},
		devProcessManager: {
			getStatus: () => ({
				state: "idle",
				workspace: null,
				pid: null,
				command: null,
				url: null,
				error: null,
				recentLogs: [],
			}),
		},
		listProfileProjects: async () => [],
		detectRunning: async () => [],
	});
	const { base, close } = await listen(app);
	try {
		const health = await fetch(`${base}/api/health`);
		assert.equal(health.status, 200);
		const auth = await fetch(`${base}/api/auth`);
		assert.equal(auth.status, 200);
		assert.deepEqual(await auth.json(), {
			mode: "local",
			required: false,
			tokenConfigured: false,
		});
		const projects = await fetch(`${base}/api/projects`);
		assert.equal(projects.status, 200);
	} finally {
		await close();
	}
});

test("createControlApp token mode denies then allows with bearer", async () => {
	const rootDir = await tempDir();
	await fs.writeFile(
		path.join(rootDir, "web.json"),
		JSON.stringify({
			controlAuthMode: "token",
			controlToken: "control-secret",
			projects: [],
		}),
		"utf8",
	);

	const app = createControlApp({
		rootDir,
		processManager: {
			getStatus: () => ({ projects: [], activeCount: 0 }),
			getProject: () => null,
			listRunningWorkspaces: () => [],
		},
		devProcessManager: {
			getStatus: () => ({
				state: "idle",
				workspace: null,
				pid: null,
				command: null,
				url: null,
				error: null,
				recentLogs: [],
			}),
		},
		listProfileProjects: async () => [],
		detectRunning: async () => [],
	});
	const { base, close } = await listen(app);
	try {
		const denied = await fetch(`${base}/api/projects`);
		assert.equal(denied.status, 401);
		assert.match(denied.headers.get("www-authenticate") || "", /Bearer/);

		const auth = await fetch(`${base}/api/auth`);
		assert.equal(auth.status, 200);
		assert.deepEqual(await auth.json(), {
			mode: "token",
			required: true,
			tokenConfigured: true,
		});

		const allowed = await fetch(`${base}/api/projects`, {
			headers: { authorization: "Bearer control-secret" },
		});
		assert.equal(allowed.status, 200);

		const wrong = await fetch(`${base}/api/status`, {
			headers: { authorization: "Bearer nope" },
		});
		assert.equal(wrong.status, 401);
	} finally {
		await close();
	}
});

test("control auth middleware can be unit-mounted", async () => {
	const app = express();
	app.get("/api/health", (_req, res) => res.json({ ok: true }));
	app.use(
		"/api",
		createControlAuthMiddleware(() => ({
			mode: "token",
			token: "abc",
		})),
	);
	app.get("/api/secure", (_req, res) => res.json({ secure: true }));
	const { base, close } = await listen(app);
	try {
		assert.equal((await fetch(`${base}/api/health`)).status, 200);
		assert.equal((await fetch(`${base}/api/secure`)).status, 401);
		assert.equal(
			(
				await fetch(`${base}/api/secure`, {
					headers: { "x-onion-control-token": "abc" },
				})
			).status,
			200,
		);
	} finally {
		await close();
	}
});
