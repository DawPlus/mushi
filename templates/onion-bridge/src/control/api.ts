// @ts-nocheck
import express, { type Express } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import {
	allocateProfilePort,
	listProfiles,
	readGlobalSetup,
	readProfile,
	writeGlobalSetup,
	writeProfile,
} from "../setup.js";
import { browseFolderDialog } from "./browse.js";
import {
	detectRunningBridges,
	stopExternalBridge,
} from "./detect.js";
import {
	discoverProjectsFromRoots,
	findRootForPath,
} from "./discover.js";
import {
	addProjectPath,
	ensureProjectProfile,
	removeProjectPath,
} from "./projects.js";
import { handleKakaoSkill } from "../kakao/skill.js";
import { loadKakaoConfig } from "../kakao/config.js";
import {
	createControlAuthMiddleware,
	resolveControlAuthConfig,
} from "./auth.js";
import {
	isMaskedSecretInput,
	loadWebSettings,
	saveWebSettings,
	toPublicSetupSettings,
	updateProjectFlags,
} from "./settings.js";

/** Max bridges that may be active at once via the control UI/API. */
export const MAX_CONCURRENT_BRIDGES = 1;

const ACTIVE_STATES = new Set(["starting", "running", "stopping"]);

async function defaultListProfileProjects() {
	const names = await listProfiles();
	const projects = [];
	for (const name of names) {
		const profile = await readProfile(name);
		if (!profile?.workspace) continue;
		projects.push({
			path: path.resolve(profile.workspace),
			name: path.basename(profile.workspace),
			profile: name,
			source: "profile",
			tunnelId: profile.tunnelId || null,
		});
	}
	return projects;
}

/**
 * Count distinct active workspaces (managed + externally detected).
 * @param {{ processManager: any, detectRunning: Function, excludeWorkspace?: string }} opts
 */
export async function countActiveBridges({
	processManager,
	detectRunning,
	excludeWorkspace,
} = {}) {
	const exclude = excludeWorkspace ? path.resolve(excludeWorkspace) : null;
	const keys = new Set();

	const managed = processManager.getStatus().projects || [];
	for (const item of managed) {
		if (!ACTIVE_STATES.has(item.state)) continue;
		const resolved = path.resolve(item.workspace);
		if (exclude && resolved === exclude) continue;
		keys.add(resolved);
	}

	const detected = await detectRunning();
	for (const [workspace] of detected) {
		const resolved = path.resolve(workspace);
		if (exclude && resolved === exclude) continue;
		keys.add(resolved);
	}

	return keys.size;
}

async function existingDirs(paths) {
	const out = [];
	for (const item of paths) {
		const resolved = path.resolve(item);
		const stat = await fs.stat(resolved).catch(() => undefined);
		if (stat?.isDirectory()) out.push(resolved);
	}
	return out;
}

async function collectProjects({
	rootDir,
	listProfileProjects,
	processManager,
	devProcessManager,
	detectRunning = detectRunningBridges,
}) {
	const settings = await loadWebSettings({ rootDir });
	const roots = await existingDirs(settings.projects);
	const discovered = await discoverProjectsFromRoots(roots);
	const fromProfiles = await listProfileProjects();
	const detected = await detectRunning();
	const byPath = new Map();

	for (const project of discovered) {
		byPath.set(project.path, {
			path: project.path,
			name: project.name,
			profile: null,
			source: "discovered",
			root: project.root,
			tunnelId: null,
		});
	}

	for (const project of fromProfiles) {
		const resolved = path.resolve(project.path);
		const current = byPath.get(resolved);
		// Only annotate already-discovered 1-depth packages. Never reintroduce
		// root itself or non-package folders via profiles.
		if (!current) continue;
		byPath.set(resolved, {
			...current,
			profile: project.profile || current.profile || null,
			source: "both",
			tunnelId: project.tunnelId || current.tunnelId || null,
		});
	}

	const favoriteSet = new Set(settings.favorites);
	const hiddenSet = new Set(settings.hidden);

	return [...byPath.values()]
		.sort((a, b) => a.path.localeCompare(b.path))
		.map((project) => {
			const runtime = processManager.getStatus(project.path);
			const dev = devProcessManager?.getStatus(project.path) || {
				state: "idle",
				workspace: project.path,
				pid: null,
				command: null,
				url: null,
				error: null,
				recentLogs: [],
			};
			const managedActive = ["starting", "running", "stopping"].includes(
				runtime.state,
			);
			const external = detected.get(project.path);
			const flags = {
				favorite: favoriteSet.has(project.path),
				hidden: hiddenSet.has(project.path),
			};
			if (managedActive) {
				const profileName = runtime.profile || project.profile;
				return {
					...project,
					...flags,
					state: runtime.state || "idle",
					pid: runtime.pid,
					error: runtime.error,
					tunnelProfile:
						runtime.tunnelProfile ||
						(profileName ? `onion-${profileName}` : null),
					recentLogs: runtime.recentLogs || [],
					active: true,
					managed: true,
					dev,
				};
			}
			if (external) {
				return {
					...project,
					...flags,
					profile: project.profile || external.profile,
					state: external.state,
					pid: external.pid,
					error: external.error,
					tunnelProfile: external.tunnelProfile,
					recentLogs: [],
					active: true,
					managed: false,
					dev,
				};
			}
			return {
				...project,
				...flags,
				state: "idle",
				pid: null,
				error: null,
				tunnelProfile: null,
				recentLogs: [],
				active: false,
				managed: false,
				dev,
			};
		});
}

async function collectRoots(rootDir) {
	const settings = await loadWebSettings({ rootDir });
	const roots = await existingDirs(settings.projects);
	return roots.map((folder) => ({
		path: folder,
		name: path.basename(folder),
	}));
}

export function createControlApp({
	rootDir,
	processManager,
	devProcessManager,
	listProfileProjects = defaultListProfileProjects,
	readGlobalSetup: readGlobal = readGlobalSetup,
	readProfile: readProfileFn = readProfile,
	writeGlobalSetup: writeGlobal = writeGlobalSetup,
	writeProfile: writeProfileFn = writeProfile,
	allocatePort: allocatePortFn = allocateProfilePort,
	ensureProjectProfile: ensureProjectProfileFn = ensureProjectProfile,
	addProjectPath: addProjectPathFn = addProjectPath,
	removeProjectPath: removeProjectPathFn = removeProjectPath,
	browseFolder = browseFolderDialog,
	detectRunning = detectRunningBridges,
	stopExternal = stopExternalBridge,
} = {}): Express {
	if (!processManager) throw new Error("processManager is required");

	const app = express();
	app.disable("x-powered-by");
	app.use(express.json({ limit: "1mb" }));

	async function getControlAuth() {
		const web = await loadWebSettings({ rootDir });
		return resolveControlAuthConfig({
			mode: web.controlAuthMode,
			token: web.controlToken,
		});
	}

	app.get("/api/health", (_req, res) => {
		res.json({ status: "ok" });
	});

	app.get("/api/auth", async (_req, res) => {
		try {
			const auth = await getControlAuth();
			res.json({
				mode: auth.mode,
				required: auth.mode === "token",
				tokenConfigured: Boolean(auth.token),
			});
		} catch (error) {
			res.status(500).json({
				error: error instanceof Error ? error.message : String(error),
			});
		}
	});

	// Open Builder skill webhook (optional shared secret via kakao.json skillSecret).
	app.post("/api/kakao/skill", async (req, res) => {
		try {
			const kakao = await loadKakaoConfig().catch(() => null);
			const expected =
				(kakao && (kakao as { skillSecret?: string }).skillSecret) ||
				process.env.ONION_KAKAO_SKILL_SECRET ||
				"";
			if (expected) {
				const provided = String(
					req.headers["x-onion-skill-secret"] || "",
				);
				if (provided !== expected) {
					res.status(401).json({ error: "Unauthorized skill webhook" });
					return;
				}
			}
			await handleKakaoSkill(req, res);
		} catch (error) {
			res.status(500).json({
				error: error instanceof Error ? error.message : String(error),
			});
		}
	});

	app.use(
		"/api",
		createControlAuthMiddleware(getControlAuth),
	);

	app.get("/api/status", (_req, res) => {
		res.json(processManager.getStatus());
	});

	app.get("/api/projects", async (_req, res) => {
		try {
			const [projects, roots] = await Promise.all([
				collectProjects({
					rootDir,
					listProfileProjects,
					processManager,
					devProcessManager,
					detectRunning,
				}),
				collectRoots(rootDir),
			]);
			res.json({ projects, roots });
		} catch (error) {
			res.status(500).json({
				error: error instanceof Error ? error.message : String(error),
			});
		}
	});

	app.post("/api/projects", async (req, res) => {
		try {
			const workspace = String(req.body?.path || req.body?.workspace || "").trim();
			if (!workspace) {
				res.status(400).json({ error: "path is required" });
				return;
			}
			const added = await addProjectPathFn(rootDir, workspace);
			const [projects, roots] = await Promise.all([
				collectProjects({
					rootDir,
					listProfileProjects,
					processManager,
					devProcessManager,
					detectRunning,
				}),
				collectRoots(rootDir),
			]);
			res.json({ project: added, projects, roots });
		} catch (error) {
			res.status(400).json({
				error: error instanceof Error ? error.message : String(error),
			});
		}
	});

	async function handleRemove(req, res) {
		try {
			const workspace = String(
				req.body?.path || req.body?.workspace || req.query?.path || "",
			).trim();
			if (!workspace) {
				res.status(400).json({ error: "path is required" });
				return;
			}
			const removed = await removeProjectPathFn(rootDir, workspace);
			const [projects, roots] = await Promise.all([
				collectProjects({
					rootDir,
					listProfileProjects,
					processManager,
					devProcessManager,
					detectRunning,
				}),
				collectRoots(rootDir),
			]);
			res.json({
				projects,
				roots,
				removedRoot: removed.removedRoot,
			});
		} catch (error) {
			res.status(400).json({
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	app.post("/api/projects/remove", handleRemove);
	app.delete("/api/projects", handleRemove);

	app.post("/api/projects/flags", async (req, res) => {
		try {
			const targetPath = String(req.body?.path || "").trim();
			if (!targetPath) {
				res.status(400).json({ error: "path is required" });
				return;
			}
			await updateProjectFlags(rootDir, {
				path: targetPath,
				favorite:
					typeof req.body?.favorite === "boolean" ? req.body.favorite : undefined,
				hidden: typeof req.body?.hidden === "boolean" ? req.body.hidden : undefined,
			});
			const [projects, roots] = await Promise.all([
				collectProjects({
					rootDir,
					listProfileProjects,
					processManager,
					devProcessManager,
					detectRunning,
				}),
				collectRoots(rootDir),
			]);
			res.json({ projects, roots });
		} catch (error) {
			res.status(400).json({
				error: error instanceof Error ? error.message : String(error),
			});
		}
	});

	app.post("/api/browse-folder", async (_req, res) => {
		try {
			const result = browseFolder();
			if (result.unsupported) {
				res.status(501).json({
					error: result.error,
					unsupported: true,
				});
				return;
			}
			if (result.cancelled) {
				res.json({ cancelled: true, path: null });
				return;
			}
			res.json({ cancelled: false, path: result.path });
		} catch (error) {
			res.status(500).json({
				error: error instanceof Error ? error.message : String(error),
			});
		}
	});

	app.post("/api/start", async (req, res) => {
		try {
			const workspace = path.resolve(String(req.body?.workspace || ""));
			if (!workspace) {
				res.status(400).json({ error: "workspace is required" });
				return;
			}

			const settings = await loadWebSettings({ rootDir });
			const roots = await existingDirs(settings.projects);
			const underRoot = Boolean(findRootForPath(roots, workspace));
			const fromProfiles = await listProfileProjects();
			const matchedProfile = fromProfiles.find(
				(project) => path.resolve(project.path) === workspace,
			);
			if (!underRoot && !matchedProfile) {
				res.status(400).json({
					error: "workspace is not under a configured workspace root or profile",
				});
				return;
			}

			const already = (await detectRunning()).get(workspace);
			if (already) {
				res.status(409).json({
					error: "이미 실행 중인 브릿지가 있습니다.",
					...already,
				});
				return;
			}

			const otherActive = await countActiveBridges({
				processManager,
				detectRunning,
				excludeWorkspace: workspace,
			});
			if (otherActive >= MAX_CONCURRENT_BRIDGES) {
				res.status(409).json({
					...processManager.getStatus(workspace),
					error: `동시에 실행할 수 있는 브릿지는 ${MAX_CONCURRENT_BRIDGES}개입니다. 다른 프로젝트를 먼저 끄세요.`,
				});
				return;
			}

			let profileName = matchedProfile?.profile;
			if (!profileName) {
				const defaultProfile = await readProfileFn(settings.defaultProfile || "default");
				const ensured = await ensureProjectProfileFn({
					workspace,
					tunnelId: defaultProfile?.tunnelId,
				});
				profileName = ensured.name;
			}

			const status = await processManager.start({
				workspace,
				profile: profileName,
				tunnelProfile: `onion-${profileName}`,
				useProfileArg: true,
			});
			res.json({ ...status, managed: true });
		} catch (error) {
			res.status(409).json({
				error: error instanceof Error ? error.message : String(error),
				...processManager.getStatus(req.body?.workspace),
			});
		}
	});

	app.post("/api/stop", async (req, res) => {
		try {
			const workspace = String(req.body?.workspace || "").trim();
			if (!workspace) {
				res.status(400).json({ error: "workspace is required" });
				return;
			}
			const managed = processManager.getStatus(workspace);
			if (["starting", "running", "stopping"].includes(managed.state)) {
				const status = await processManager.stop(workspace);
				res.json(status);
				return;
			}

			const detected = await detectRunning();
			const external = detected.get(path.resolve(workspace));
			if (!external) {
				res.json({
					state: "idle",
					workspace: path.resolve(workspace),
					profile: null,
					tunnelProfile: null,
					pid: null,
					error: null,
					recentLogs: [],
				});
				return;
			}

			await stopExternal({ pid: external.pid, port: external.port });
			res.json({
				state: "idle",
				workspace: path.resolve(workspace),
				profile: external.profile,
				tunnelProfile: external.tunnelProfile,
				pid: null,
				error: null,
				recentLogs: [],
			});
		} catch (error) {
			res.status(500).json({
				error: error instanceof Error ? error.message : String(error),
			});
		}
	});

	app.post("/api/dev/start", async (req, res) => {
		try {
			if (!devProcessManager) {
				res.status(503).json({ error: "Dev server manager is unavailable." });
				return;
			}
			const workspace = String(req.body?.workspace || "").trim();
			if (!workspace) {
				res.status(400).json({ error: "workspace is required" });
				return;
			}
			const status = await devProcessManager.start(workspace);
			res.json(status);
		} catch (error) {
			res.status(409).json({
				error: error instanceof Error ? error.message : String(error),
				...(devProcessManager?.getStatus(req.body?.workspace) || {}),
			});
		}
	});

	app.post("/api/dev/stop", async (req, res) => {
		try {
			if (!devProcessManager) {
				res.status(503).json({ error: "Dev server manager is unavailable." });
				return;
			}
			const workspace = String(req.body?.workspace || "").trim();
			if (!workspace) {
				res.status(400).json({ error: "workspace is required" });
				return;
			}
			res.json(await devProcessManager.stop(workspace));
		} catch (error) {
			res.status(500).json({
				error: error instanceof Error ? error.message : String(error),
			});
		}
	});

	app.get("/api/settings", async (_req, res) => {
		try {
			const web = await loadWebSettings({ rootDir });
			const globalSetup = await readGlobal();
			const defaultProfile = await readProfileFn(web.defaultProfile || "default");
			res.json(
				toPublicSetupSettings({
					web,
					globalSetup,
					defaultProfile,
				}),
			);
		} catch (error) {
			res.status(500).json({
				error: error instanceof Error ? error.message : String(error),
			});
		}
	});

	app.put("/api/settings", async (req, res) => {
		try {
			const currentWeb = await loadWebSettings({ rootDir });
			const currentGlobal = (await readGlobal()) || {};
			const profileName =
				typeof req.body?.defaultProfile === "string" && req.body.defaultProfile.trim()
					? req.body.defaultProfile.trim()
					: currentWeb.defaultProfile;
			const currentProfile = (await readProfileFn(profileName)) || {};

			const incomingProjects = req.body?.projects;
			let projectsPayload = currentWeb.projectEntries;
			if (Array.isArray(incomingProjects)) {
				const known = new Map(
					currentWeb.projectEntries.map((item) => [item.path, item.profileName]),
				);
				projectsPayload = incomingProjects.map((item) => {
					if (typeof item === "string") {
						const resolved = path.resolve(item.trim());
						return {
							path: resolved,
							profileName: known.get(resolved) || null,
						};
					}
					return item;
				});
			}

			const nextWeb = await saveWebSettings(
				{
					...currentWeb,
					...req.body,
					projects: projectsPayload,
				},
				{ rootDir },
			);

			const nextTunnelBin =
				typeof req.body?.tunnelBin === "string" && req.body.tunnelBin.trim()
					? req.body.tunnelBin.trim()
					: currentGlobal.tunnelBin;
			const bodyKey = req.body?.apiKey;
			const publicCurrent = toPublicSetupSettings({
				web: currentWeb,
				globalSetup: currentGlobal,
				defaultProfile: currentProfile,
			});
			const nextApiKey = isMaskedSecretInput(bodyKey, publicCurrent.apiKeyMasked)
				? currentGlobal.apiKey
				: String(bodyKey).trim();

			let globalSetup = currentGlobal;
			if (nextTunnelBin && nextApiKey) {
				globalSetup = await writeGlobal({
					tunnelBin: nextTunnelBin,
					apiKey: nextApiKey,
				});
			}

			const nextTunnelId =
				typeof req.body?.tunnelId === "string" ? req.body.tunnelId.trim() : "";
			let defaultProfile = currentProfile;
			if (nextTunnelId) {
				if (!nextTunnelId.startsWith("tunnel_")) {
					throw new Error("Tunnel ID must start with tunnel_.");
				}
				defaultProfile = await writeProfileFn(profileName, {
					workspace: currentProfile.workspace || process.cwd(),
					port: currentProfile.port || (await allocatePortFn()),
					tunnelId: nextTunnelId,
					token: currentProfile.token,
				});
			} else {
				defaultProfile = (await readProfileFn(nextWeb.defaultProfile || "default")) || {};
			}

			res.json(
				toPublicSetupSettings({
					web: nextWeb,
					globalSetup,
					defaultProfile,
				}),
			);
		} catch (error) {
			res.status(400).json({
				error: error instanceof Error ? error.message : String(error),
			});
		}
	});

	return app;
}
