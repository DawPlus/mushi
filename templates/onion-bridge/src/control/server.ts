import "reflect-metadata";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { createControlApp } from "./api.js";
import { ControlModule } from "./control.module.js";
import { clearWebPid, writeWebPid } from "../runtime/lifecycle.js";
import { createDevProcessManager } from "./devProcessManager.js";
import { createProcessManager } from "./processManager.js";
import { DEFAULT_CONTROL_PORT, loadWebSettings } from "./settings.js";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);
const bridgeEntry = path.join(packageRoot, "bin", "onionBridge.js");
const webRoot = path.join(packageRoot, "apps", "web");
const webDist = path.join(webRoot, "dist");

async function pathExists(target: string) {
	try {
		await fs.access(target);
		return true;
	} catch {
		return false;
	}
}

async function ensureWebDist() {
	if (await pathExists(path.join(webDist, "index.html"))) return true;
	if (!(await pathExists(path.join(webRoot, "package.json")))) return false;

	if (!(await pathExists(path.join(webRoot, "node_modules")))) {
		console.log("[onionWeb] installing apps/web dependencies...");
		const install = spawnSync("npm", ["install"], {
			cwd: webRoot,
			stdio: "inherit",
			shell: process.platform === "win32",
		});
		if (install.status !== 0) return false;
	}

	console.log("[onionWeb] building apps/web...");
	const build = spawnSync("npm", ["run", "build"], {
		cwd: webRoot,
		stdio: "inherit",
		shell: process.platform === "win32",
	});
	if (build.status !== 0) return false;
	return pathExists(path.join(webDist, "index.html"));
}

export async function startControlServer({ port }: { port?: number } = {}) {
	const settings = await loadWebSettings();
	const listenPort = port || settings.controlPort || DEFAULT_CONTROL_PORT;
	const processManager = createProcessManager({ bridgeEntry } as any);
	const devProcessManager = createDevProcessManager();
	const expressApp = createControlApp({
		processManager,
		devProcessManager,
	} as any);

	const hasWebDist = await ensureWebDist();

	if (hasWebDist) {
		expressApp.use(express.static(webDist));
		expressApp.use((req, res, next) => {
			if (req.method !== "GET" && req.method !== "HEAD") return next();
			if (req.path.startsWith("/api/")) return next();
			res.sendFile(path.join(webDist, "index.html"), (error) => {
				if (error) next(error);
			});
		});
	}

	const nestApp = await NestFactory.create(
		ControlModule,
		new ExpressAdapter(expressApp),
		{ logger: ["error", "warn"] },
	);
	await nestApp.listen(listenPort, "127.0.0.1");
	await writeWebPid(process.pid);

	console.log(`[onionWeb] control API: http://127.0.0.1:${listenPort}/api`);
	console.log(`[onionWeb] pid: ${process.pid}`);
	if (hasWebDist) {
		console.log(`[onionWeb] UI: http://127.0.0.1:${listenPort}/`);
	} else {
		console.log(
			`[onionWeb] UI not available. Run: (cd apps/web && npm install && npm run build)`,
		);
	}

	let stopping = false;
	const stop = async () => {
		if (stopping) return;
		stopping = true;
		try {
			await Promise.all([
				processManager.stopAll(),
				devProcessManager.stopAll(),
			]);
		} catch {
			// Best-effort shutdown.
		}
		await clearWebPid();
		await nestApp.close();
		process.exit(0);
	};

	process.once("SIGINT", () => {
		void stop();
	});
	process.once("SIGTERM", () => {
		void stop();
	});

	return {
		http: nestApp.getHttpServer(),
		port: listenPort,
		processManager,
		devProcessManager,
		nestApp,
	};
}
