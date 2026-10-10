// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readGlobalSetup, readProfile, runSetup } from "./setup.js";

export const DEFAULT_PROFILE = "default";

export function tunnelProfilePath(profile = DEFAULT_PROFILE) {
	const base =
		process.platform === "win32"
			? (process.env.APPDATA ?? path.join(os.homedir(), ".config"))
			: path.join(os.homedir(), ".config");
	return path.join(base, "tunnel-client", `onion-${profile}.yaml`);
}

function resolveAuthMode(profile, global) {
	const raw =
		process.env.ONION_BRIDGE_AUTH_MODE ||
		profile?.authMode ||
		global?.authMode ||
		"token";
	const mode = String(raw).toLowerCase();
	if (mode === "none" || mode === "token") return mode;
	if (mode === "oauth") {
		throw new Error(
			'MCP auth mode "oauth" was removed. Use token (default) or none.',
		);
	}
	throw new Error(`Unsupported auth mode "${raw}". Use none or token.`);
}

export async function loadConfig(profileName = DEFAULT_PROFILE, workspaceOverride) {
	const profile =
		(await readProfile(profileName)) ?? (await runSetup(profileName));
	const global = await readGlobalSetup();

	const port = Number(process.env.ONION_BRIDGE_PORT || profile.port);
	const token = process.env.ONION_BRIDGE_TOKEN || profile.token;
	const tunnelProfile = `onion-${profileName}`;
	const healthPort = profile.healthPort || nextHealthPort(port);
	const authMode = resolveAuthMode(profile, global);

	await writeTunnelProfile({
		profile: tunnelProfile,
		tunnelId: profile.tunnelId,
		token,
		port,
		healthPort,
		authMode,
	});
	process.env.OPENAI_API_KEY = global.apiKey;

	return {
		name: profileName,
		workspace: path.resolve(workspaceOverride || profile.workspace),
		port,
		token,
		tunnelProfile,
		tunnelBin: process.env.ONION_BRIDGE_TUNNEL_BIN || global.tunnelBin,
		auth: {
			mode: authMode,
			token,
		},
	};
}

function nextHealthPort(port) {
	const candidate = port + 4000;
	if (candidate <= 65535) return candidate;
	return port - 1000;
}

export async function writeTunnelProfile({
	profile,
	tunnelId,
	token,
	port,
	healthPort,
	authMode = "token",
}) {
	const file = tunnelProfilePath(profile.replace(/^onion-/, ""));
	await fs.mkdir(path.dirname(file), { recursive: true });
	const includeStaticBearer = authMode !== "none";
	const extraHeaders = includeStaticBearer
		? `
  extra_headers:
    Authorization: "Bearer ${token}"`
		: "";
	const yaml = `config_version: 1

control_plane:
  base_url: "https://api.openai.com"
  tunnel_id: "${tunnelId}"
  api_key: "env:OPENAI_API_KEY"

health:
  listen_addr: "127.0.0.1:${healthPort}"

admin_ui:
  open_browser: false

log:
  level: error
  format: json

mcp:
  server_urls:
    - channel: main
      url: "http://127.0.0.1:${port}/mcp"${extraHeaders}
`;
	await fs.writeFile(file, yaml, { encoding: "utf8", mode: 0o600 });
}
