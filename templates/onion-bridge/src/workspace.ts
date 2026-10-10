// @ts-nocheck
import fs from "node:fs/promises";
import path from "node:path";

const EXCLUDED = new Set([".git", "node_modules"]);
const MAX_READ_BYTES = 1024 * 1024;

export function workspaceRoot() {
  return path.resolve(process.cwd());
}

export function resolveInside(root, input = ".") {
  if (path.isAbsolute(input)) throw new Error("Absolute paths are not allowed.");
  const target = path.resolve(root, input);
  const rel = path.relative(root, target);
  if (rel === ".." || rel.startsWith(`..${path.sep}`)) throw new Error("Path escapes the workspace.");
  return { absolute: target, relative: rel.split(path.sep).join("/") };
}

export async function readText(root, input) {
  const target = resolveInside(root, input);
  const stat = await fs.stat(target.absolute);
  if (!stat.isFile()) throw new Error("Path is not a file.");
  if (stat.size > MAX_READ_BYTES) throw new Error(`File exceeds ${MAX_READ_BYTES} bytes.`);
  return { ...target, text: await fs.readFile(target.absolute, "utf8") };
}

export async function walkFiles(root, start = ".", max = 5000) {
  const base = resolveInside(root, start);
  const files = [];

  async function walk(dir, relDir) {
    if (files.length >= max) return;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= max) return;
      if (EXCLUDED.has(entry.name)) continue;
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(abs, rel);
      else if (entry.isFile()) files.push(rel);
    }
  }

  await walk(base.absolute, base.relative);
  return files;
}
