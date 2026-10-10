import fs from 'node:fs/promises'
import path from 'node:path'

const EXCLUDED = new Set(['.git', 'node_modules'])
const MAX_READ_BYTES = 1024 * 1024

export const ALLOWED_COMMANDS = new Set([
  'npm',
  'pnpm',
  'npx',
  'node',
  'bun',
  'bunx',
  'yarn',
  'git',
  'codex',
  'grok',
  'agy',
])

export function isAllowedCommand(command: string): boolean {
  return ALLOWED_COMMANDS.has(command)
}

function assertInside(rootReal: string, candidate: string): string {
  const rel = path.relative(rootReal, candidate)
  if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    throw new Error('Path escapes the workspace.')
  }
  return rel.split(path.sep).join('/')
}

/** Resolve a workspace-relative path; reject absolute paths, traversal, and symlink escapes. */
export async function resolveInside(root: string, input = '.'): Promise<{ absolute: string; relative: string }> {
  if (path.isAbsolute(input)) throw new Error('Absolute paths are not allowed.')
  const rootReal = await fs.realpath(root)
  const lexical = path.resolve(rootReal, input)
  assertInside(rootReal, lexical)

  try {
    const real = await fs.realpath(lexical)
    const relative = assertInside(rootReal, real)
    return { absolute: real, relative }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') throw error

    // For create/write targets that do not exist yet, verify the deepest existing ancestor.
    let probe = path.dirname(lexical)
    while (true) {
      try {
        const ancestorReal = await fs.realpath(probe)
        assertInside(rootReal, ancestorReal)
        const relative = assertInside(rootReal, lexical)
        return { absolute: lexical, relative }
      } catch (inner) {
        const innerCode = (inner as NodeJS.ErrnoException).code
        if (innerCode === 'ENOENT') {
          const parent = path.dirname(probe)
          if (parent === probe) throw new Error('Path escapes the workspace.')
          probe = parent
          continue
        }
        throw inner
      }
    }
  }
}

export async function readText(root: string, input: string) {
  const target = await resolveInside(root, input)
  const stat = await fs.stat(target.absolute)
  if (!stat.isFile()) throw new Error('Path is not a file.')
  if (stat.size > MAX_READ_BYTES) throw new Error(`File exceeds ${MAX_READ_BYTES} bytes.`)
  return { ...target, text: await fs.readFile(target.absolute, 'utf8') }
}

export async function walkFiles(root: string, start = '.', max = 5000) {
  const base = await resolveInside(root, start)
  const files: string[] = []

  async function walk(dir: string, relDir: string) {
    if (files.length >= max) return
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (files.length >= max) return
      if (EXCLUDED.has(entry.name)) continue
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name
      const abs = path.join(dir, entry.name)
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) await walk(abs, rel)
      else if (entry.isFile()) files.push(rel)
    }
  }

  await walk(base.absolute, base.relative)
  return files
}
