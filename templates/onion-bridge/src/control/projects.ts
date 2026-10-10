// @ts-nocheck
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
	allocateProfilePort,
	listProfiles,
	readProfile,
	writeProfile,
} from "../setup.js";
import { findRootForPath } from "./discover.js";
import { loadWebSettings, saveWebSettings } from "./settings.js";

export function slugifyProfileName(folderName) {
	const base = String(folderName || "project")
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 40);
	return base || "project";
}

export async function uniqueProfileName(baseName) {
	const existing = new Set(await listProfiles());
	if (!existing.has(baseName)) return baseName;
	for (let i = 2; i < 1000; i += 1) {
		const candidate = `${baseName}-${i}`;
		if (!existing.has(candidate)) return candidate;
	}
	throw new Error("Unable to allocate unique profile name.");
}

export async function ensureProjectProfile({
	workspace,
	preferredName,
	tunnelId,
}) {
	const resolved = path.resolve(workspace);
	const stat = await fs.stat(resolved).catch(() => undefined);
	if (!stat?.isDirectory()) {
		throw new Error("Workspace directory does not exist.");
	}

	const names = await listProfiles();
	for (const name of names) {
		const profile = await readProfile(name);
		if (profile?.workspace && path.resolve(profile.workspace) === resolved) {
			return { name, profile, created: false };
		}
	}

	if (!tunnelId) {
		throw new Error(
			"No Tunnel ID available. Set it in Settings before starting projects.",
		);
	}

	const base = preferredName || slugifyProfileName(path.basename(resolved));
	const name = await uniqueProfileName(base.startsWith("web-") ? base : `web-${base}`);
	const profile = await writeProfile(name, {
		workspace: resolved,
		port: await allocateProfilePort(),
		tunnelId,
		token: crypto.randomBytes(32).toString("hex"),
	});
	return { name, profile, created: true };
}

/** Add a parent workspace root. Child folders are discovered automatically. */
export async function addProjectPath(rootDir, workspace) {
	const resolved = path.resolve(workspace);
	const stat = await fs.stat(resolved).catch(() => undefined);
	if (!stat?.isDirectory()) {
		throw new Error("Workspace directory does not exist.");
	}

	const settings = await loadWebSettings({ rootDir });
	const projectEntries = [...settings.projectEntries];
	const index = projectEntries.findIndex((item) => item.path === resolved);
	const entry = {
		path: resolved,
		profileName: projectEntries[index]?.profileName || null,
	};
	if (index >= 0) projectEntries[index] = entry;
	else projectEntries.push(entry);

	const saved = await saveWebSettings(
		{
			...settings,
			projects: projectEntries,
		},
		{ rootDir },
	);

	return {
		path: resolved,
		name: path.basename(resolved),
		profile: entry.profileName,
		source: "root",
		settings: saved,
	};
}

/**
 * Remove a workspace root. If `workspace` is a discovered child, remove its parent root.
 */
export async function removeProjectPath(rootDir, workspace) {
	const resolved = path.resolve(workspace);
	const settings = await loadWebSettings({ rootDir });
	const roots = settings.projects;
	const rootToRemove = findRootForPath(roots, resolved) || resolved;
	const projectEntries = settings.projectEntries.filter(
		(item) => item.path !== rootToRemove,
	);

	if (projectEntries.length === settings.projectEntries.length) {
		throw new Error(
			"Nothing to remove. Pick a configured workspace root, or a folder under one.",
		);
	}

	const saved = await saveWebSettings(
		{ ...settings, projects: projectEntries },
		{ rootDir },
	);
	return {
		removedRoot: rootToRemove,
		settings: saved,
	};
}
