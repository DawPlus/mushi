import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
	clearWebPid,
	isPidRunning,
	readWebPid,
	writeWebPid,
} from "../../dist/runtime/lifecycle.js";

test("write/read/clear web pid file", async () => {
	const prevHome = process.env.HOME;
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), "onion-life-"));
	process.env.HOME = dir;
	try {
		await writeWebPid(12345);
		assert.equal(await readWebPid(), 12345);
		const raw = await fs.readFile(
			path.join(dir, ".onion-bridge", "web.pid"),
			"utf8",
		);
		assert.equal(raw.trim(), "12345");
		await clearWebPid();
		assert.equal(await readWebPid(), null);
	} finally {
		if (prevHome === undefined) delete process.env.HOME;
		else process.env.HOME = prevHome;
	}
});

test("isPidRunning detects current process", () => {
	assert.equal(isPidRunning(process.pid), true);
	assert.equal(isPidRunning(999_999_999), false);
});
