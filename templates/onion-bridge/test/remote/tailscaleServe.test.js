import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildTailscaleServePlan } from "../../dist/remote/tailscaleServe.js";

async function tempDir() {
	return fs.mkdtemp(path.join(os.tmpdir(), "onion-remote-"));
}

test("buildTailscaleServePlan warns when control auth is not ready", async () => {
	const rootDir = await tempDir();
	await fs.writeFile(
		path.join(rootDir, "web.json"),
		JSON.stringify({
			controlPort: 3847,
			controlAuthMode: "local",
			projects: [],
		}),
		"utf8",
	);

	const plan = await buildTailscaleServePlan({ rootDir });
	assert.equal(plan.controlPort, 3847);
	assert.equal(plan.controlAuthMode, "local");
	assert.equal(plan.controlAuthReady, false);
	assert.match(plan.webServeCommand, /127\.0\.0\.1:3847/);
	assert.match(plan.notes[0], /WARNING/i);
});

test("buildTailscaleServePlan marks token mode ready", async () => {
	const rootDir = await tempDir();
	await fs.writeFile(
		path.join(rootDir, "web.json"),
		JSON.stringify({
			controlPort: 3901,
			controlAuthMode: "token",
			controlToken: "remote-secret",
			projects: [],
		}),
		"utf8",
	);

	const plan = await buildTailscaleServePlan({ rootDir });
	assert.equal(plan.controlPort, 3901);
	assert.equal(plan.controlAuthReady, true);
	assert.equal(
		plan.webServeCommand,
		"tailscale serve --bg http://127.0.0.1:3901",
	);
	assert.doesNotMatch(plan.notes.join("\n"), /WARNING: control auth/);
});
