// @ts-nocheck
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const DEFAULT_LOG_LIMIT = 50;

function emptyStatus(workspace = null) {
	return {
		state: "idle",
		workspace,
		profile: null,
		tunnelProfile: null,
		pid: null,
		error: null,
		recentLogs: [],
	};
}

export function createProcessManager({
	spawnImpl = spawn,
	bridgeEntry,
	nodeBin = process.execPath,
	logLimit = DEFAULT_LOG_LIMIT,
} = {}) {
	if (!bridgeEntry) throw new Error("bridgeEntry is required");

	/** @type {Map<string, any>} */
	const entries = new Map();

	function keyFor(workspace) {
		return path.resolve(workspace);
	}

	function pushLog(entry, chunk, stream) {
		const text = String(chunk);
		for (const line of text.split(/\r?\n/)) {
			if (!line) continue;
			entry.recentLogs.push(`[${stream}] ${line}`);
		}
		while (entry.recentLogs.length > logLimit) entry.recentLogs.shift();
	}

	function snapshot(entry) {
		if (!entry) return emptyStatus();
		return {
			state: entry.state,
			workspace: entry.workspace,
			profile: entry.profile,
			tunnelProfile: entry.tunnelProfile,
			pid: entry.child?.pid ?? null,
			error: entry.error,
			recentLogs: [...entry.recentLogs],
		};
	}

	function getStatus(workspace) {
		if (workspace) {
			return snapshot(entries.get(keyFor(workspace)));
		}
		const projects = [...entries.values()]
			.map((entry) => snapshot(entry))
			.sort((a, b) => String(a.workspace).localeCompare(String(b.workspace)));
		return {
			projects,
			activeCount: projects.filter((item) =>
				["starting", "running", "stopping"].includes(item.state),
			).length,
		};
	}

	function attach(entry, nextChild) {
		entry.child = nextChild;
		nextChild.stdout?.on("data", (chunk) => pushLog(entry, chunk, "out"));
		nextChild.stderr?.on("data", (chunk) => pushLog(entry, chunk, "err"));
		nextChild.on("error", (error) => {
			entry.error = error.message;
			entry.state = "error";
			pushLog(entry, error.message, "err");
			entry.child = null;
		});
		nextChild.on("exit", (code, signal) => {
			if (entry.state === "stopping") {
				entry.state = "idle";
				entry.error = null;
				entries.delete(entry.workspace);
				return;
			}
			if (entry.state === "starting" || entry.state === "running") {
				entry.error =
					code === 0 || code === null
						? signal
							? `Onion exited via ${signal}`
							: null
						: `Onion exited with code ${code}`;
				entry.state = entry.error ? "error" : "idle";
				if (!entry.error) entries.delete(entry.workspace);
			}
			entry.child = null;
		});
	}

	async function start({
		workspace,
		profile = "default",
		tunnelProfile,
		useProfileArg = false,
	} = {}) {
		if (!workspace) throw new Error("workspace is required");
		const key = keyFor(workspace);
		const existing = entries.get(key);
		if (
			existing &&
			["starting", "running", "stopping"].includes(existing.state)
		) {
			throw new Error("Onion process already active for this project");
		}

		const resolvedProfile = useProfileArg ? profile : "default";
		const resolvedTunnel = tunnelProfile || `onion-${resolvedProfile}`;
		const entry = {
			workspace: key,
			profile: resolvedProfile,
			tunnelProfile: resolvedTunnel,
			state: "starting",
			error: null,
			recentLogs: existing?.recentLogs ? [...existing.recentLogs] : [],
			child: null,
		};
		entries.set(key, entry);

		const args = useProfileArg ? [bridgeEntry, resolvedProfile] : [bridgeEntry];
		const nextChild = spawnImpl(nodeBin, args, {
			cwd: useProfileArg ? process.cwd() : key,
			stdio: ["ignore", "pipe", "pipe"],
			windowsHide: true,
			env: process.env,
		});
		attach(entry, nextChild);

		await new Promise((resolve, reject) => {
			const onSpawn = () => {
				cleanup();
				entry.state = "running";
				resolve();
			};
			const onError = (error) => {
				cleanup();
				entry.error = error.message;
				entry.state = "error";
				entry.child = null;
				reject(error);
			};
			const cleanup = () => {
				nextChild.off("spawn", onSpawn);
				nextChild.off("error", onError);
			};
			nextChild.once("spawn", onSpawn);
			nextChild.once("error", onError);
		});

		return snapshot(entry);
	}

	async function stop(workspace) {
		if (!workspace) throw new Error("workspace is required");
		const key = keyFor(workspace);
		const entry = entries.get(key);
		if (!entry?.child) {
			entries.delete(key);
			return emptyStatus(key);
		}

		entry.state = "stopping";
		const active = entry.child;
		await new Promise((resolve) => {
			const done = () => {
				active.off("exit", done);
				resolve();
			};
			active.once("exit", done);
			active.kill("SIGTERM");
			setTimeout(() => {
				if (entry.child === active) active.kill("SIGKILL");
			}, 2000).unref?.();
		});

		entries.delete(key);
		return emptyStatus(key);
	}

	async function stopAll() {
		const keys = [...entries.keys()];
		for (const key of keys) {
			try {
				await stop(key);
			} catch {
				// Best-effort shutdown.
			}
		}
	}

	return { start, stop, stopAll, getStatus };
}
