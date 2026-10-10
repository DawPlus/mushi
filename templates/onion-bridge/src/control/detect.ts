// @ts-nocheck
import { spawnSync } from "node:child_process";
import path from "node:path";
import { listProfiles, readProfile } from "../setup.js";

async function defaultFetch(url, init) {
	return fetch(url, init);
}

export async function probeBridgeHealth(
	port,
	{ fetchImpl = defaultFetch, timeoutMs = 400 } = {},
) {
	if (!Number.isInteger(port) || port <= 0) return null;
	try {
		const res = await fetchImpl(`http://127.0.0.1:${port}/health`, {
			signal: AbortSignal.timeout(timeoutMs),
		});
		if (!res.ok) return null;
		const body = await res.json();
		if (!body || body.status !== "ok") return null;
		return body;
	} catch {
		return null;
	}
}

export function findListenPid(port) {
	if (!Number.isInteger(port) || port <= 0) return null;
	const result = spawnSync(
		"lsof",
		["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"],
		{ encoding: "utf8" },
	);
	if (result.status !== 0) return null;
	const pid = Number(String(result.stdout || "").trim().split(/\s+/)[0]);
	return Number.isInteger(pid) && pid > 0 ? pid : null;
}

export async function detectRunningBridges({
	listProfilesFn = listProfiles,
	readProfileFn = readProfile,
	fetchImpl = defaultFetch,
	findPid = findListenPid,
} = {}) {
	const byWorkspace = new Map();
	const names = await listProfilesFn();

	for (const name of names) {
		const profile = await readProfileFn(name);
		if (!profile || !Number.isInteger(profile.port)) continue;

		const health = await probeBridgeHealth(profile.port, { fetchImpl });
		if (!health) continue;

		const workspace = path.resolve(health.workspace || profile.workspace || "");
		if (!workspace) continue;

		const profileName = health.profile || name;
		const pid =
			Number.isInteger(health.pid) && health.pid > 0
				? health.pid
				: findPid(profile.port);

		byWorkspace.set(workspace, {
			state: "running",
			workspace,
			profile: profileName,
			tunnelProfile: `onion-${profileName}`,
			pid,
			port: health.port || profile.port,
			error: null,
			recentLogs: [],
			managed: false,
			active: true,
		});
	}

	return byWorkspace;
}

export async function stopExternalBridge({ pid, port, findPid = findListenPid }) {
	const targetPid =
		(Number.isInteger(pid) && pid > 0 ? pid : null) ||
		(Number.isInteger(port) ? findPid(port) : null);
	if (!targetPid) {
		throw new Error("실행 중인 브릿지 PID를 찾지 못했습니다.");
	}
	try {
		process.kill(targetPid, "SIGTERM");
	} catch (error) {
		throw new Error(
			error instanceof Error ? error.message : `PID ${targetPid} 종료 실패`,
		);
	}
	return { pid: targetPid };
}
