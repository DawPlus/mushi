import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
	DEFAULT_CONTROL_PORT,
	isMaskedSecretInput,
	loadWebSettings,
	maskSecret,
	saveWebSettings,
	toPublicSetupSettings,
	updateProjectFlags,
} from "../../dist/control/settings.js";

async function tempDir() {
	return fs.mkdtemp(path.join(os.tmpdir(), "onion-web-settings-"));
}

test("loadWebSettings returns defaults when file missing", async () => {
	const dir = await tempDir();
	const settings = await loadWebSettings({ rootDir: dir });
	assert.deepEqual(settings.projects, []);
	assert.equal(settings.defaultProfile, "default");
	assert.equal(settings.controlPort, DEFAULT_CONTROL_PORT);
	assert.equal(settings.controlAuthMode, "local");
	assert.equal(settings.controlToken, null);
});

test("saveWebSettings persists project entries and omits secrets", async () => {
	const dir = await tempDir();
	await saveWebSettings(
		{
			projects: [
				"/tmp/a",
				{ path: "/tmp/b", profileName: "web-b" },
			],
			defaultProfile: "acorns",
			controlPort: 3900,
			apiKey: "sk-should-not-persist",
			token: "secret-token",
		},
		{ rootDir: dir },
	);

	const raw = JSON.parse(await fs.readFile(path.join(dir, "web.json"), "utf8"));
	assert.deepEqual(raw.projects, [
		"/tmp/a",
		{ path: "/tmp/b", profileName: "web-b" },
	]);
	assert.equal(raw.apiKey, undefined);
	assert.equal(raw.token, undefined);
	assert.equal(raw.controlAuthMode, "local");
});

test("saveWebSettings persists control auth mode and token", async () => {
	const dir = await tempDir();
	await saveWebSettings(
		{
			controlAuthMode: "token",
			controlToken: "control-secret",
		},
		{ rootDir: dir },
	);
	const raw = JSON.parse(await fs.readFile(path.join(dir, "web.json"), "utf8"));
	assert.equal(raw.controlAuthMode, "token");
	assert.equal(raw.controlToken, "control-secret");

	const publicSettings = (
		await import("../../dist/control/settings.js")
	).toPublicSetupSettings({
		web: await loadWebSettings({ rootDir: dir }),
	});
	assert.equal(publicSettings.controlAuthMode, "token");
	assert.equal(publicSettings.controlTokenPresent, true);
	assert.equal(publicSettings.controlToken, undefined);
	assert.match(publicSettings.controlTokenMasked, /•/);
});

test("maskSecret and public settings never expose full secrets", () => {
	const masked = maskSecret("sk-secret-value-1234");
	assert.equal(masked.present, true);
	assert.match(masked.masked, /•/);
	assert.equal(masked.masked.includes("sk-secret-value-1234"), false);

	const publicSettings = toPublicSetupSettings({
		web: {
			projects: ["/tmp/a"],
			projectEntries: [{ path: "/tmp/a", profileName: null }],
			defaultProfile: "default",
			controlPort: 3847,
		},
		globalSetup: {
			tunnelBin: "/bin/tunnel-client",
			apiKey: "sk-secret-value-1234",
		},
		defaultProfile: {
			tunnelId: "tunnel_abc",
			token: "super-secret-token",
		},
	});

	assert.equal(publicSettings.apiKey, undefined);
	assert.equal(publicSettings.token, undefined);
	assert.equal(publicSettings.apiKeyPresent, true);
	assert.equal(publicSettings.tokenPresent, true);
	assert.equal(publicSettings.tunnelBin, "/bin/tunnel-client");
	assert.equal(publicSettings.tunnelId, "tunnel_abc");
	assert.equal(isMaskedSecretInput(publicSettings.apiKeyMasked, publicSettings.apiKeyMasked), true);
	assert.equal(isMaskedSecretInput("sk-new-key", publicSettings.apiKeyMasked), false);
});

test("updateProjectFlags persists favorites and hidden paths", async () => {
	const dir = await tempDir();
	const project = path.resolve("/tmp/fav-project");

	await updateProjectFlags(dir, { path: project, favorite: true });
	let settings = await loadWebSettings({ rootDir: dir });
	assert.deepEqual(settings.favorites, [project]);
	assert.deepEqual(settings.hidden, []);

	await updateProjectFlags(dir, { path: project, hidden: true });
	settings = await loadWebSettings({ rootDir: dir });
	assert.deepEqual(settings.hidden, [project]);
	assert.deepEqual(settings.favorites, []);

	await updateProjectFlags(dir, { path: project, hidden: false, favorite: true });
	settings = await loadWebSettings({ rootDir: dir });
	assert.deepEqual(settings.hidden, []);
	assert.deepEqual(settings.favorites, [project]);
});
