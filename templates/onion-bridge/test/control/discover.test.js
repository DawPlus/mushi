import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
	discoverProjectsFromRoots,
	findRootForPath,
	isDirectChild,
	isEligibleProfileProject,
	listChildProjects,
} from "../../dist/control/discover.js";

async function writePkg(folder) {
	await fs.mkdir(folder, { recursive: true });
	await fs.writeFile(
		path.join(folder, "package.json"),
		JSON.stringify({ name: path.basename(folder) }),
	);
}

test("listChildProjects only keeps 1-depth folders with package.json", async () => {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "onion-discover-"));
	await writePkg(path.join(root, "app-a"));
	await fs.mkdir(path.join(root, "docs"));
	await fs.mkdir(path.join(root, "node_modules"));
	await fs.mkdir(path.join(root, "app-a", "nested"));
	await writePkg(path.join(root, "app-a", "nested"));

	const children = await listChildProjects(root);
	assert.deepEqual(
		children.map((item) => item.name),
		["app-a"],
	);
});

test("discoverProjectsFromRoots ignores workspace root itself", async () => {
	const base = await fs.mkdtemp(path.join(os.tmpdir(), "onion-roots-"));
	const rootA = path.join(base, "workspace");
	await writePkg(rootA);
	await writePkg(path.join(rootA, "one"));
	await fs.mkdir(path.join(rootA, "docs"));

	const projects = await discoverProjectsFromRoots([rootA]);
	assert.equal(projects.length, 1);
	assert.equal(projects[0].name, "one");
	assert.equal(findRootForPath([rootA], projects[0].path), rootA);
	assert.equal(isDirectChild(rootA, projects[0].path), true);
	assert.equal(isEligibleProfileProject([rootA], rootA), false);
	assert.equal(isEligibleProfileProject([rootA], projects[0].path), true);
	assert.equal(
		isEligibleProfileProject([rootA], path.join(rootA, "one", "nested")),
		false,
	);
});
