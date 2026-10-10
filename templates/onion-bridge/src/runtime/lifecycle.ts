import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	DEFAULT_CONTROL_PORT,
	loadWebSettings,
} from "../control/settings.js";
import { applyWebTailscaleServe } from "../remote/tailscaleServe.js";

export type LifecycleStatus = {
	controlPort: number;
	web: {
		running: boolean;
		pid: number | null;
		health: "ok" | "down" | "error";
		healthDetail?: string;
	};
	controlAuthMode: string;
	controlAuthReady: boolean;
	serve: {
		active: boolean;
		raw: string;
		url: string | null;
	};
};

function runtimeDir() {
	return path.join(os.homedir(), ".onion-bridge");
}

function webPidFile() {
	return path.join(runtimeDir(), "web.pid");
}

function packageBinEntry() {
	const here = path.dirname(fileURLToPath(import.meta.url));
	// dist/runtime → repo root
	return path.resolve(here, "../../bin/onionBridge.js");
}

export async function readWebPid(): Promise<number | null> {
	try {
		const raw = (await fs.readFile(webPidFile(), "utf8")).trim();
		const pid = Number(raw);
		return Number.isInteger(pid) && pid > 0 ? pid : null;
	} catch {
		return null;
	}
}

export async function writeWebPid(pid: number): Promise<void> {
	await fs.mkdir(runtimeDir(), { recursive: true });
	await fs.writeFile(webPidFile(), `${pid}\n`, {
		encoding: "utf8",
		mode: 0o600,
	});
}

export async function clearWebPid(): Promise<void> {
	try {
		await fs.unlink(webPidFile());
	} catch {
		// ignore
	}
}

export function isPidRunning(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

async function probeHealth(
	port: number,
): Promise<{ health: "ok" | "down" | "error"; detail?: string }> {
	try {
		const res = await fetch(`http://127.0.0.1:${port}/api/health`, {
			signal: AbortSignal.timeout(2000),
		});
		if (!res.ok) return { health: "error", detail: `HTTP ${res.status}` };
		const body = (await res.json()) as { status?: string };
		if (body?.status === "ok") return { health: "ok" };
		return { health: "error", detail: "unexpected health payload" };
	} catch (error) {
		return {
			health: "down",
			detail: error instanceof Error ? error.message : String(error),
		};
	}
}

function readServeStatus(): { active: boolean; raw: string; url: string | null } {
	const result = spawnSync("tailscale", ["serve", "status"], {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
		timeout: 10_000,
	});
	const raw = `${result.stdout || ""}${result.stderr || ""}`.trim();
	if (result.error || result.status !== 0) {
		return {
			active: false,
			raw: raw || result.error?.message || "tailscale serve status failed",
			url: null,
		};
	}
	if (!raw || /No serve config/i.test(raw)) {
		return { active: false, raw: raw || "No serve config", url: null };
	}
	const urlMatch = raw.match(/https:\/\/[^\s)]+/);
	return {
		active: true,
		raw,
		url: urlMatch?.[0] || null,
	};
}

export async function getLifecycleStatus(): Promise<LifecycleStatus> {
	const web = await loadWebSettings();
	const controlPort = web.controlPort || DEFAULT_CONTROL_PORT;
	const pid = await readWebPid();
	const pidAlive = pid != null && isPidRunning(pid);
	if (pid != null && !pidAlive) await clearWebPid();

	const health = await probeHealth(controlPort);
	const running = health.health === "ok" || pidAlive;
	const serve = readServeStatus();

	return {
		controlPort,
		web: {
			running,
			pid: pidAlive ? pid : null,
			health: health.health,
			healthDetail: health.detail,
		},
		controlAuthMode: web.controlAuthMode || "local",
		controlAuthReady:
			(web.controlAuthMode || "local") === "token" && Boolean(web.controlToken),
		serve,
	};
}

export async function printLifecycleStatus(): Promise<LifecycleStatus> {
	const status = await getLifecycleStatus();
	const webLabel = status.web.running
		? `UP (health=${status.web.health}${status.web.pid ? `, pid=${status.web.pid}` : ""})`
		: `DOWN (health=${status.web.health})`;
	const serveLabel = status.serve.active
		? `UP${status.serve.url ? ` — ${status.serve.url}` : ""}`
		: "DOWN";

	console.log(`Onion lifecycle status

  controlPort:     ${status.controlPort}
  web:             ${webLabel}
  controlAuthMode: ${status.controlAuthMode}
  controlAuthReady:${status.controlAuthReady ? " yes" : " NO"}
  tailscale serve: ${serveLabel}
`);
	if (status.serve.active && status.serve.raw) {
		console.log("Serve detail:");
		console.log(status.serve.raw);
		console.log("");
	}
	return status;
}

export async function stopLifecycle(): Promise<void> {
	const status = await getLifecycleStatus();
	const pid = status.web.pid ?? (await readWebPid());

	if (pid && isPidRunning(pid)) {
		console.log(`[onionStop] sending SIGTERM to web pid ${pid}`);
		try {
			process.kill(pid, "SIGTERM");
		} catch (error) {
			console.warn(
				`[onionStop] kill failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
		for (let i = 0; i < 20; i += 1) {
			if (!isPidRunning(pid)) break;
			await new Promise((r) => setTimeout(r, 100));
		}
		if (isPidRunning(pid)) {
			console.warn(`[onionStop] pid ${pid} still alive; sending SIGKILL`);
			try {
				process.kill(pid, "SIGKILL");
			} catch {
				// ignore
			}
		}
	} else {
		console.log("[onionStop] web process not found via pid file");
	}
	await clearWebPid();

	console.log("[onionStop] resetting Tailscale Serve");
	const reset = spawnSync("tailscale", ["serve", "reset"], {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
		timeout: 15_000,
	});
	const resetErr = reset.error as NodeJS.ErrnoException | undefined;
	if (resetErr?.code === "ENOENT") {
		console.warn("[onionStop] tailscale CLI not found; skipped serve reset");
	} else if (reset.status !== 0) {
		const detail = `${reset.stderr || ""}${reset.stdout || ""}`.trim();
		console.warn(`[onionStop] serve reset: ${detail || "failed"}`);
	} else if ((reset.stdout || reset.stderr || "").trim()) {
		console.log((reset.stdout || reset.stderr || "").trim());
	}

	const after = await getLifecycleStatus();
	console.log(
		`[onionStop] done — web=${after.web.running ? "UP" : "DOWN"}, serve=${after.serve.active ? "UP" : "DOWN"}`,
	);
}

async function waitForHealth(port: number, attempts = 40): Promise<boolean> {
	for (let i = 0; i < attempts; i += 1) {
		const health = await probeHealth(port);
		if (health.health === "ok") return true;
		await new Promise((r) => setTimeout(r, 250));
	}
	return false;
}

export async function upLifecycle(): Promise<LifecycleStatus> {
	const settings = await loadWebSettings();
	const controlPort = settings.controlPort || DEFAULT_CONTROL_PORT;
	let status = await getLifecycleStatus();

	if (!status.web.running) {
		const bin = packageBinEntry();
		console.log(`[onionUp] starting web in background: ${bin} web`);
		const child = spawn(process.execPath, [bin, "web"], {
			detached: true,
			stdio: "ignore",
			env: process.env,
		});
		if (!child.pid) {
			throw new Error("Failed to spawn onion web (no pid).");
		}
		child.unref();
		await writeWebPid(child.pid);
		const ok = await waitForHealth(controlPort);
		if (!ok) {
			throw new Error(
				`Web started (pid ${child.pid}) but /api/health on :${controlPort} did not become ready.`,
			);
		}
		console.log(`[onionUp] web ready on http://127.0.0.1:${controlPort}/`);
	} else {
		console.log(
			`[onionUp] web already running on :${controlPort}${status.web.pid ? ` (pid ${status.web.pid})` : ""}`,
		);
		const pid = status.web.pid;
		if (pid) await writeWebPid(pid);
	}

	await applyWebTailscaleServe();
	status = await getLifecycleStatus();
	return status;
}
