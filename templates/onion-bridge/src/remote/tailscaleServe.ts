import { spawnSync } from "node:child_process";
import {
	DEFAULT_CONTROL_PORT,
	loadWebSettings,
} from "../control/settings.js";
import { listProfiles, readProfile } from "../setup.js";

export type RemoteServePlan = {
	controlPort: number;
	controlAuthMode: string;
	controlAuthReady: boolean;
	profiles: Array<{
		name: string;
		port: number;
		workspace: string | null;
	}>;
	webServeCommand: string;
	mcpServeCommands: string[];
	statusCommand: string;
	resetCommand: string;
	notes: string[];
};

export async function buildTailscaleServePlan({
	rootDir,
}: {
	rootDir?: string;
} = {}): Promise<RemoteServePlan> {
	const web = await loadWebSettings({ rootDir });
	const controlPort = web.controlPort || DEFAULT_CONTROL_PORT;
	const controlAuthMode = web.controlAuthMode || "local";
	const controlAuthReady =
		controlAuthMode === "token" && Boolean(web.controlToken);

	const names = await listProfiles();
	const profiles = [];
	for (const name of names) {
		const profile = await readProfile(name);
		if (!profile?.port) continue;
		profiles.push({
			name,
			port: Number(profile.port),
			workspace: profile.workspace ? String(profile.workspace) : null,
		});
	}
	profiles.sort((a, b) => a.name.localeCompare(b.name));

	const mcpServeCommands = profiles.map((profile, index) => {
		const httpsPort = 8443 + index;
		return `# profile "${profile.name}" (local MCP ${profile.port}) → tailnet https://<magicdns>:${httpsPort}/mcp\ntailscale serve --bg --https=${httpsPort} http://127.0.0.1:${profile.port}`;
	});

	const notes = [
		"Onion keeps listening on 127.0.0.1 only. Tailscale Serve proxies into localhost.",
		"Prefer tailnet-only Serve. Do not enable Funnel unless you accept public exposure + auth.",
		"Web dashboard requires control auth mode=token before remote use.",
		"ChatGPT via OpenAI Secure MCP Tunnel is a separate path; Tailscale does not replace it.",
	];

	if (!controlAuthReady) {
		notes.unshift(
			"WARNING: control auth is not ready (need Settings controlAuthMode=token + controlToken). Remote web access will be open to anyone on your tailnet who can reach Serve.",
		);
	}

	return {
		controlPort,
		controlAuthMode,
		controlAuthReady,
		profiles,
		webServeCommand: `tailscale serve --bg http://127.0.0.1:${controlPort}`,
		mcpServeCommands,
		statusCommand: "tailscale serve status",
		resetCommand: "tailscale serve reset",
		notes,
	};
}

export async function printTailscaleServePlan(
	options: { rootDir?: string } = {},
): Promise<RemoteServePlan> {
	const plan = await buildTailscaleServePlan(options);

	console.log(`Onion remote access (Tailscale Serve → localhost)

Prereq:
  - Home PC: Tailscale running + logged in
  - Client phone/laptop: same tailnet
  - Home PC processes: onion web  (+ onion / onion start <profile> for MCP)
  - Control auth: mode=token + control token (Settings or ONION_CONTROL_*)

Current:
  controlPort: ${plan.controlPort}
  controlAuthMode: ${plan.controlAuthMode}
  controlAuthReady: ${plan.controlAuthReady ? "yes" : "NO"}
  mcp profiles: ${
		plan.profiles.length
			? plan.profiles.map((p) => `${p.name}:${p.port}`).join(", ")
			: "(none)"
	}

# 1) Expose web UI on https://<machine>.<tailnet>.ts.net/
${plan.webServeCommand}

# 2) Expose MCP (optional; one HTTPS port per profile)
${
	plan.mcpServeCommands.length
		? plan.mcpServeCommands.join("\n\n")
		: "# (no profiles with ports found)"
}

# 3) Show URL / handlers
${plan.statusCommand}

# Stop serving
${plan.resetCommand}

Notes:
${plan.notes.map((line) => `  - ${line}`).join("\n")}

Docs: docs/REMOTE_ACCESS.md
`);

	return plan;
}

const SERVE_TIMEOUT_MS = 15_000;

function runTailscale(
	args: string[],
	timeoutMs = SERVE_TIMEOUT_MS,
): {
	status: number | null;
	stdout: string;
	stderr: string;
	error?: NodeJS.ErrnoException;
	timedOut: boolean;
} {
	const result = spawnSync("tailscale", args, {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
		timeout: timeoutMs,
	});
	const timedOut =
		Boolean(result.error) &&
		(result.error as NodeJS.ErrnoException).code === "ETIMEDOUT";
	return {
		status: result.status,
		stdout: String(result.stdout || ""),
		stderr: String(result.stderr || ""),
		error: result.error as NodeJS.ErrnoException | undefined,
		timedOut,
	};
}

function extractServeEnableUrl(text: string): string | null {
	const match = text.match(/https:\/\/login\.tailscale\.com\/f\/serve\?[^\s]+/);
	return match?.[0] || null;
}

export async function applyWebTailscaleServe(
	options: { rootDir?: string } = {},
): Promise<RemoteServePlan> {
	const plan = await buildTailscaleServePlan(options);
	const port = String(plan.controlPort);

	if (!plan.controlAuthReady) {
		console.warn(
			"[onionServe] WARNING: control auth is not ready (token mode + control token). Anyone on your tailnet who can open the Serve URL can hit the dashboard.",
		);
	}

	console.log(
		`[onionServe] starting Tailscale Serve → http://127.0.0.1:${plan.controlPort}`,
	);
	// Prefer port form + --yes so the CLI does not wait on an interactive prompt.
	const serve = runTailscale(["serve", "--bg", "--yes", port]);
	if (serve.error?.code === "ENOENT") {
		throw new Error(
			"tailscale CLI not found. Install Tailscale and ensure `tailscale` is on PATH.",
		);
	}

	const combined = `${serve.stdout}\n${serve.stderr}`.trim();
	const enableUrl = extractServeEnableUrl(combined);

	if (enableUrl || /Serve is not enabled on your tailnet/i.test(combined)) {
		console.log(`
[onionServe] Tailscale Serve is not enabled for this tailnet yet.

1) Open this URL in a browser (admin account):
   ${enableUrl || "https://login.tailscale.com/admin/acls"}
2) Enable Serve for this node / tailnet.
3) Retry: pnpm serve

Keep \`onion web\` / \`pnpm web\` running on the home PC.
`);
		throw new Error("Tailscale Serve is not enabled on the tailnet yet.");
	}

	if (serve.timedOut) {
		throw new Error(
			`tailscale serve timed out after ${SERVE_TIMEOUT_MS / 1000}s.\n${combined || "(no output)"}\nIf Serve was just enabled, retry: pnpm serve`,
		);
	}
	if (serve.status !== 0) {
		if (/No such file or directory/i.test(combined) || /Tailscale\.app/i.test(combined)) {
			throw new Error(
				`${combined}\nInstall/open the Tailscale macOS app so the CLI works, then retry: pnpm serve`,
			);
		}
		throw new Error(combined || "tailscale serve failed.");
	}
	if (combined) console.log(combined);

	const status = runTailscale(["serve", "status"], 10_000);
	console.log("\n[onionServe] status:");
	console.log((status.stdout || status.stderr || "").trim() || "(no status output)");
	console.log(
		"\nOpen the https://… URL above from a device on the same tailnet, then unlock with your Control token.",
	);
	console.log("Stop later with: tailscale serve reset");
	return plan;
}
