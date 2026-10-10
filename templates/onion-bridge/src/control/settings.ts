// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const DEFAULT_CONTROL_PORT = 3847;
export const WEB_SETTINGS_FILE = "web.json";

function defaultRootDir() {
	return path.join(os.homedir(), ".onion-bridge");
}

function settingsPath(rootDir) {
	return path.join(rootDir, WEB_SETTINGS_FILE);
}

export function normalizeProjectList(input = []) {
	if (!Array.isArray(input)) return [];
	const byPath = new Map();
	for (const item of input) {
		if (typeof item === "string") {
			const resolved = path.resolve(item.trim());
			if (!resolved) continue;
			byPath.set(resolved, { path: resolved, profileName: null });
			continue;
		}
		if (!item || typeof item !== "object") continue;
		if (typeof item.path !== "string" || !item.path.trim()) continue;
		const resolved = path.resolve(item.path.trim());
		const profileName =
			typeof item.profileName === "string" && item.profileName.trim()
				? item.profileName.trim()
				: null;
		byPath.set(resolved, { path: resolved, profileName });
	}
	return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export function normalizePathList(input = []) {
	if (!Array.isArray(input)) return [];
	const paths = new Set();
	for (const item of input) {
		if (typeof item !== "string" || !item.trim()) continue;
		paths.add(path.resolve(item.trim()));
	}
	return [...paths].sort((a, b) => a.localeCompare(b));
}

export function maskSecret(value) {
	if (!value || typeof value !== "string") {
		return { present: false, masked: "" };
	}
	if (value.length <= 8) {
		return { present: true, masked: "••••••••" };
	}
	return {
		present: true,
		masked: `${value.slice(0, 3)}••••${value.slice(-4)}`,
	};
}

export function isMaskedSecretInput(value, masked) {
	if (typeof value !== "string") return true;
	const trimmed = value.trim();
	if (!trimmed) return true;
	if (masked && trimmed === masked) return true;
	if (/^•+$/.test(trimmed) || trimmed.includes("••••")) return true;
	return false;
}

export function sanitizePublicSettings(input = {}) {
	const projects = normalizeProjectList(input.projects).map((item) => item.path);
	const favorites = normalizePathList(input.favorites);
	const hidden = normalizePathList(input.hidden);

	const defaultProfile =
		typeof input.defaultProfile === "string" && input.defaultProfile.trim()
			? input.defaultProfile.trim()
			: "default";

	const controlPort = Number(input.controlPort);
	const authModeRaw =
		typeof input.controlAuthMode === "string"
			? input.controlAuthMode.trim().toLowerCase()
			: "local";
	const controlAuthMode = authModeRaw === "token" ? "token" : "local";
	const controlToken =
		typeof input.controlToken === "string" && input.controlToken.trim()
			? input.controlToken.trim()
			: null;

	return {
		projects,
		projectEntries: normalizeProjectList(input.projects),
		favorites,
		hidden,
		defaultProfile,
		controlPort:
			Number.isInteger(controlPort) && controlPort > 0 && controlPort <= 65535
				? controlPort
				: DEFAULT_CONTROL_PORT,
		controlAuthMode,
		controlToken,
	};
}

export async function loadWebSettings({ rootDir = defaultRootDir() } = {}) {
	try {
		const raw = JSON.parse(await fs.readFile(settingsPath(rootDir), "utf8"));
		return sanitizePublicSettings(raw);
	} catch {
		return sanitizePublicSettings();
	}
}

export async function saveWebSettings(input, { rootDir = defaultRootDir() } = {}) {
	const current = await loadWebSettings({ rootDir });
	const settings = sanitizePublicSettings({
		...current,
		...input,
		controlToken:
			input?.controlToken !== undefined
				? input.controlToken
				: current.controlToken,
	});

	// Keep existing control token when UI sends masked placeholder.
	let controlToken = settings.controlToken;
	if (
		input?.controlToken !== undefined &&
		isMaskedSecretInput(input.controlToken, maskSecret(current.controlToken).masked)
	) {
		controlToken = current.controlToken;
	}

	const persisted = {
		projects: settings.projectEntries.map((item) =>
			item.profileName
				? { path: item.path, profileName: item.profileName }
				: item.path,
		),
		favorites: settings.favorites,
		hidden: settings.hidden,
		defaultProfile: settings.defaultProfile,
		controlPort: settings.controlPort,
		controlAuthMode: settings.controlAuthMode,
		...(controlToken ? { controlToken } : {}),
	};
	await fs.mkdir(rootDir, { recursive: true });
	await fs.writeFile(settingsPath(rootDir), JSON.stringify(persisted, null, 2), {
		encoding: "utf8",
		mode: 0o600,
	});
	return sanitizePublicSettings(persisted);
}

export function toPublicSetupSettings({
	web,
	globalSetup,
	defaultProfile,
} = {}) {
	const apiKey = globalSetup?.apiKey;
	const token = defaultProfile?.token;
	const maskedKey = maskSecret(apiKey);
	const maskedToken = maskSecret(token);

	const controlTokenMasked = maskSecret(web?.controlToken);
	return {
		projects: web?.projects || [],
		projectEntries: web?.projectEntries || [],
		favorites: web?.favorites || [],
		hidden: web?.hidden || [],
		defaultProfile: web?.defaultProfile || "default",
		controlPort: web?.controlPort || DEFAULT_CONTROL_PORT,
		controlAuthMode: web?.controlAuthMode || "local",
		controlTokenPresent: controlTokenMasked.present,
		controlTokenMasked: controlTokenMasked.masked,
		tunnelBin: globalSetup?.tunnelBin || "",
		tunnelId: defaultProfile?.tunnelId || "",
		apiKeyPresent: maskedKey.present,
		apiKeyMasked: maskedKey.masked,
		tokenPresent: maskedToken.present,
		tokenMasked: maskedToken.masked,
	};
}

export async function updateProjectFlags(
	rootDir,
	{ path: targetPath, favorite, hidden } = {},
) {
	if (!targetPath) throw new Error("path is required");
	const resolved = path.resolve(targetPath);
	const current = await loadWebSettings({ rootDir });
	let favorites = [...current.favorites];
	let hiddenPaths = [...current.hidden];

	if (typeof favorite === "boolean") {
		favorites = favorite
			? [...new Set([...favorites, resolved])]
			: favorites.filter((item) => item !== resolved);
	}
	if (typeof hidden === "boolean") {
		hiddenPaths = hidden
			? [...new Set([...hiddenPaths, resolved])]
			: hiddenPaths.filter((item) => item !== resolved);
		if (hidden) {
			favorites = favorites.filter((item) => item !== resolved);
		}
	}

	return saveWebSettings(
		{
			...current,
			favorites,
			hidden: hiddenPaths,
		},
		{ rootDir },
	);
}
