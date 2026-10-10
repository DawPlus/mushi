import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { authenticateMcpRequest } from "../../dist/auth/authenticate.js";
import { buildWwwAuthenticate } from "../../dist/auth/challenge.js";
import { tunnelProfilePath, writeTunnelProfile } from "../../dist/config.js";

test("token mode accepts matching static bearer", async () => {
	const result = await authenticateMcpRequest({
		authorization: "Bearer secret",
		auth: { mode: "token", token: "secret" },
	});
	assert.equal(result.ok, true);
	assert.equal(result.mode, "token");
});

test("token mode rejects missing/wrong bearer", async () => {
	const result = await authenticateMcpRequest({
		authorization: "Bearer nope",
		auth: { mode: "token", token: "secret" },
	});
	assert.equal(result.ok, false);
	assert.equal(result.status, 401);
	assert.equal(result.error, "invalid_token");
});

test("none mode allows unauthenticated requests", async () => {
	const result = await authenticateMcpRequest({
		auth: { mode: "none" },
	});
	assert.equal(result.ok, true);
	assert.equal(result.mode, "none");
});

test("WWW-Authenticate is a simple Bearer challenge", () => {
	const header = buildWwwAuthenticate({
		error: "invalid_token",
		errorDescription: "Missing or invalid bearer token.",
	});
	assert.match(header, /Bearer realm="onion-bridge"/);
	assert.match(header, /error="invalid_token"/);
	assert.doesNotMatch(header, /resource_metadata/);
});

test("none tunnel profile omits static Authorization header", async () => {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "onion-tunnel-"));
	const prevHome = process.env.HOME;
	const prevAppData = process.env.APPDATA;
	process.env.HOME = dir;
	delete process.env.APPDATA;
	try {
		await writeTunnelProfile({
			profile: "none-test",
			tunnelId: "tun_test",
			token: "should-not-appear",
			port: 3737,
			healthPort: 7737,
			authMode: "none",
		});
		const yaml = await fs.readFile(tunnelProfilePath("none-test"), "utf8");
		assert.doesNotMatch(yaml, /Authorization:/);

		await writeTunnelProfile({
			profile: "token-test",
			tunnelId: "tun_test",
			token: "static-token",
			port: 3738,
			healthPort: 7738,
			authMode: "token",
		});
		const tokenYaml = await fs.readFile(
			tunnelProfilePath("token-test"),
			"utf8",
		);
		assert.match(tokenYaml, /Authorization: "Bearer static-token"/);
	} finally {
		if (prevHome === undefined) delete process.env.HOME;
		else process.env.HOME = prevHome;
		if (prevAppData === undefined) delete process.env.APPDATA;
		else process.env.APPDATA = prevAppData;
	}
});
