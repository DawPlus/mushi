import assert from "node:assert/strict";
import test from "node:test";
import { browseFolderDialog } from "../../dist/control/browse.js";

test("darwin returns selected POSIX path", () => {
	const result = browseFolderDialog({
		platform: "darwin",
		spawnSyncImpl: () => ({
			status: 0,
			stdout: "/Users/me/workspace/\n",
			stderr: "",
		}),
	});
	assert.deepEqual(result, { cancelled: false, path: "/Users/me/workspace" });
});

test("darwin treats cancel as cancelled", () => {
	const result = browseFolderDialog({
		platform: "darwin",
		spawnSyncImpl: () => ({
			status: 1,
			stdout: "",
			stderr: "user canceled",
		}),
	});
	assert.deepEqual(result, { cancelled: true, path: null });
});

test("win32 launches powershell FolderBrowserDialog and returns path", () => {
	let captured;
	const result = browseFolderDialog({
		platform: "win32",
		spawnSyncImpl: (command, args, options) => {
			captured = { command, args, options };
			return {
				status: 0,
				stdout: "C:\\Users\\me\\workspace\\\n",
				stderr: "",
			};
		},
	});
	assert.equal(captured.command, "powershell.exe");
	assert.ok(captured.args.includes("-STA"));
	assert.ok(captured.args.includes("-Command"));
	assert.match(captured.args.at(-1), /FolderBrowserDialog/);
	assert.equal(captured.options.windowsHide, true);
	assert.deepEqual(result, {
		cancelled: false,
		path: "C:\\Users\\me\\workspace",
	});
});

test("win32 cancel returns cancelled", () => {
	const result = browseFolderDialog({
		platform: "win32",
		spawnSyncImpl: () => ({ status: 1, stdout: "", stderr: "" }),
	});
	assert.deepEqual(result, { cancelled: true, path: null });
});

test("win32 missing powershell returns unsupported", () => {
	const result = browseFolderDialog({
		platform: "win32",
		spawnSyncImpl: () => ({
			error: Object.assign(new Error("not found"), { code: "ENOENT" }),
			status: null,
			stdout: "",
			stderr: "",
		}),
	});
	assert.equal(result.unsupported, true);
	assert.match(result.error, /powershell\.exe not found/i);
});

test("linux prefers zenity directory picker", () => {
	let calls = 0;
	const result = browseFolderDialog({
		platform: "linux",
		spawnSyncImpl: (command, args) => {
			calls += 1;
			assert.equal(command, "zenity");
			assert.ok(args.includes("--directory"));
			return { status: 0, stdout: "/home/me/ws\n", stderr: "" };
		},
	});
	assert.equal(calls, 1);
	assert.deepEqual(result, { cancelled: false, path: "/home/me/ws" });
});

test("linux falls back to kdialog when zenity missing", () => {
	const commands = [];
	const result = browseFolderDialog({
		platform: "linux",
		spawnSyncImpl: (command) => {
			commands.push(command);
			if (command === "zenity") {
				return {
					error: Object.assign(new Error("missing"), { code: "ENOENT" }),
					status: null,
					stdout: "",
					stderr: "",
				};
			}
			return { status: 0, stdout: "/home/me/ws\n", stderr: "" };
		},
	});
	assert.deepEqual(commands, ["zenity", "kdialog"]);
	assert.deepEqual(result, { cancelled: false, path: "/home/me/ws" });
});

test("linux without zenity/kdialog returns unsupported", () => {
	const result = browseFolderDialog({
		platform: "linux",
		spawnSyncImpl: () => ({
			error: Object.assign(new Error("missing"), { code: "ENOENT" }),
			status: null,
			stdout: "",
			stderr: "",
		}),
	});
	assert.equal(result.unsupported, true);
});

test("unknown platform returns unsupported", () => {
	const result = browseFolderDialog({ platform: "aix" });
	assert.equal(result.unsupported, true);
	assert.match(result.error, /unavailable on this platform/i);
});
