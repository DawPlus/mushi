// @ts-nocheck
import crypto from "node:crypto";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const DIR = path.join(os.homedir(), ".onion-bridge");
const GLOBAL_FILE = path.join(DIR, "config.json");
const PROFILES_DIR = path.join(DIR, "profiles");
const BASE_PORT = 3737;

function assertProfileName(name) {
	if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
		throw new Error(
			"Profile name may contain only letters, numbers, dot, underscore, and dash.",
		);
	}
}

export async function readGlobalSetup() {
	try {
		return JSON.parse(await fs.readFile(GLOBAL_FILE, "utf8"));
	} catch {
		return undefined;
	}
}

export async function readProfile(name) {
	assertProfileName(name);
	try {
		return JSON.parse(
			await fs.readFile(path.join(PROFILES_DIR, `${name}.json`), "utf8"),
		);
	} catch {
		if (name !== "default") return undefined;
		const legacy = await readGlobalSetup();
		if (!legacy?.tunnelId) return undefined;
		return {
			workspace: process.cwd(),
			port: legacy.port || BASE_PORT,
			tunnelId: legacy.tunnelId,
			token: legacy.token || crypto.randomBytes(32).toString("hex"),
		};
	}
}

export async function listProfiles() {
	const profiles = new Set();
	try {
		const files = await fs.readdir(PROFILES_DIR);
		for (const file of files) {
			if (file.endsWith(".json")) profiles.add(file.slice(0, -5));
		}
	} catch {
		// No named profiles yet.
	}
	const legacy = await readGlobalSetup();
	if (legacy?.tunnelId) profiles.add("default");
	return [...profiles].sort();
}

export async function writeGlobalSetup({ tunnelBin, apiKey }) {
	const current = (await readGlobalSetup()) || {};
	const next = {
		tunnelBin: tunnelBin ?? current.tunnelBin,
		apiKey: apiKey ?? current.apiKey,
	};
	if (!next.tunnelBin || !next.apiKey) {
		throw new Error("Shared tunnel setup is incomplete.");
	}
	await fs.mkdir(DIR, { recursive: true });
	await fs.writeFile(GLOBAL_FILE, JSON.stringify(next, null, 2), {
		encoding: "utf8",
		mode: 0o600,
	});
	return next;
}

export async function writeProfile(name, profile) {
	assertProfileName(name);
	await fs.mkdir(PROFILES_DIR, { recursive: true });
	await fs.writeFile(
		path.join(PROFILES_DIR, `${name}.json`),
		JSON.stringify(profile, null, 2),
		{ encoding: "utf8", mode: 0o600 },
	);
	return profile;
}

export async function allocateProfilePort() {
	return allocatePort();
}

export async function runSetup(name = "default") {
	assertProfileName(name);

	const global = await readGlobalSetup();
	const current = await readProfile(name);
	const defaultProfile = name === "default" ? current : await readProfile("default");
	const rl = readline.createInterface({ input, output });

	console.log(`\n🧅 Onion Bridge setup: ${name}`);
	console.log("Press Enter to keep/use the shown value.\n");

	let tunnelBin = global?.tunnelBin;
	let apiKey = global?.apiKey;

	if (!tunnelBin) tunnelBin = await ask(rl, "tunnel-client path");
	if (!apiKey) apiKey = await ask(rl, "OpenAI API key", undefined, true);

	const workspace = await ask(
		rl,
		"workspace",
		current?.workspace || process.cwd(),
	);
	const inheritedTunnelId = current?.tunnelId || defaultProfile?.tunnelId;
	const tunnelId = await ask(
		rl,
		name === "default"
			? "OpenAI Tunnel ID"
			: "OpenAI Tunnel ID (Enter = default)",
		inheritedTunnelId,
	);

	rl.close();

	if (!tunnelBin || !apiKey) {
		throw new Error("Shared tunnel setup is incomplete.");
	}
	if (!workspace || !tunnelId) {
		throw new Error("Profile setup is incomplete.");
	}
	if (!tunnelId.startsWith("tunnel_")) {
		throw new Error("Tunnel ID must start with tunnel_.");
	}
	if (!apiKey.startsWith("sk-")) {
		throw new Error("OpenAI API key must start with sk-.");
	}

	await fs.access(tunnelBin).catch(() => {
		throw new Error("tunnel-client executable does not exist.");
	});

	const workspacePath = path.resolve(workspace);
	const stat = await fs.stat(workspacePath).catch(() => undefined);
	if (!stat?.isDirectory()) {
		throw new Error("Workspace directory does not exist.");
	}

	const port = current?.port || (await allocatePort());

	await fs.mkdir(PROFILES_DIR, { recursive: true });
	await fs.writeFile(
		GLOBAL_FILE,
		JSON.stringify({ tunnelBin, apiKey }, null, 2),
		{ encoding: "utf8", mode: 0o600 },
	);

	const profile = {
		workspace: workspacePath,
		port,
		tunnelId,
		token: current?.token || crypto.randomBytes(32).toString("hex"),
	};
	await fs.writeFile(
		path.join(PROFILES_DIR, `${name}.json`),
		JSON.stringify(profile, null, 2),
		{ encoding: "utf8", mode: 0o600 },
	);

	console.log(`\nSaved profile: ${name}`);
	console.log(`Workspace: ${workspacePath}`);
	console.log(`Tunnel: ${tunnelId}`);
	console.log(`Port: ${port} (auto)`);
	console.log("Bearer token: generated automatically\n");
	return profile;
}

async function allocatePort() {
	const used = new Set();

	try {
		const files = await fs.readdir(PROFILES_DIR);
		for (const file of files) {
			if (!file.endsWith(".json")) continue;
			try {
				const profile = JSON.parse(
					await fs.readFile(path.join(PROFILES_DIR, file), "utf8"),
				);
				if (Number.isInteger(profile.port)) used.add(profile.port);
			} catch {
				// Ignore malformed unrelated profiles here; load will fail when used.
			}
		}
	} catch {
		// No profiles directory yet.
	}

	for (let port = BASE_PORT; port < BASE_PORT + 1000; port += 1) {
		if (used.has(port)) continue;
		if (await portAvailable(port)) return port;
	}
	throw new Error("No free local MCP port found.");
}

function portAvailable(port) {
	return new Promise((resolve) => {
		const server = net.createServer();
		server.unref();
		server.once("error", () => resolve(false));
		server.listen(port, "127.0.0.1", () => {
			server.close(() => resolve(true));
		});
	});
}

async function ask(rl, label, current, secret = false) {
	const hint = current ? (secret ? " [********]" : ` [${current}]`) : "";
	const value = (await rl.question(`${label}${hint}: `)).trim();
	return value || current;
}
