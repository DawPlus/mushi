import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { rotateControlSecret } from "../../dist/handoff/rotate.js";
import { loadWebSettings } from "../../dist/control/settings.js";

async function tempDir() {
	return fs.mkdtemp(path.join(os.tmpdir(), "onion-rotate-"));
}

test("rotateControlSecret persists token mode secret and notifies", async () => {
	const rootDir = await tempDir();
	const notes = [];
	const payload = await rotateControlSecret({
		rootDir,
		ensureUp: true,
		generator: { generate: () => "cat7dog" },
		up: async () => {},
		getStatus: async () => ({
			controlPort: 3847,
			web: { running: true, pid: 1, health: "ok" },
			controlAuthMode: "token",
			controlAuthReady: true,
			serve: {
				active: true,
				raw: "https://example.ts.net/",
				url: "https://example.ts.net/",
			},
		}),
		notifier: {
			notify(p) {
				notes.push(p);
			},
		},
	});

	assert.equal(payload.secret, "cat7dog");
	assert.equal(payload.url, "https://example.ts.net/");
	assert.equal(payload.controlAuthMode, "token");
	assert.equal(notes.length, 1);

	const saved = await loadWebSettings({ rootDir });
	assert.equal(saved.controlAuthMode, "token");
	assert.equal(saved.controlToken, "cat7dog");
});
