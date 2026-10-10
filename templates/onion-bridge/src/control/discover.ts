// @ts-nocheck
import fs from "node:fs/promises";
import path from "node:path";

const SKIP_NAMES = new Set([
	".git",
	".hg",
	".svn",
	".onion-bridge",
	"node_modules",
	"dist",
	"build",
	"coverage",
	"tmp",
	"temp",
	".turbo",
	".next",
	".cache",
]);

export function isDirectChild(rootPath, targetPath) {
	const root = path.resolve(rootPath);
	const target = path.resolve(targetPath);
	if (root === target) return false;
	const rel = path.relative(root, target);
	if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return false;
	return !rel.includes(path.sep);
}

async function hasPackageJson(folderPath) {
	try {
		const stat = await fs.stat(path.join(folderPath, "package.json"));
		return stat.isFile();
	} catch {
		return false;
	}
}

export async function listChildProjects(rootPath) {
	const root = path.resolve(rootPath);
	const stat = await fs.stat(root).catch(() => undefined);
	if (!stat?.isDirectory()) return [];

	const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
	const children = [];
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		if (entry.name.startsWith(".")) continue;
		if (SKIP_NAMES.has(entry.name)) continue;
		const childPath = path.join(root, entry.name);
		if (!(await hasPackageJson(childPath))) continue;
		children.push({
			path: childPath,
			name: entry.name,
			root,
		});
	}
	return children.sort((a, b) => a.name.localeCompare(b.name));
}

export async function discoverProjectsFromRoots(roots = []) {
	const byPath = new Map();
	for (const root of roots) {
		const resolved = path.resolve(root);
		const children = await listChildProjects(resolved);
		for (const child of children) {
			byPath.set(child.path, {
				path: child.path,
				name: child.name,
				root: resolved,
				source: "discovered",
				profile: null,
				tunnelId: null,
			});
		}
	}
	return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export function findRootForPath(roots, targetPath) {
	const resolved = path.resolve(targetPath);
	const normalizedRoots = roots.map((root) => path.resolve(root));
	if (normalizedRoots.includes(resolved)) return resolved;
	return (
		normalizedRoots.find(
			(root) => resolved.startsWith(root + path.sep) || resolved === root,
		) || null
	);
}

/** Profile workspaces: only direct 1-depth children under a configured root. */
export function isEligibleProfileProject(roots, targetPath) {
	const resolved = path.resolve(targetPath);
	for (const root of roots) {
		const normalized = path.resolve(root);
		if (normalized === resolved) return false;
		if (isDirectChild(normalized, resolved)) return true;
	}
	return false;
}
