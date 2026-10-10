import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { isAllowedCommand, resolveInside } from '../src/bridge/workspace.js'

test('resolveInside rejects absolute paths and lexical traversal', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mushi-bridge-ws-'))
  try {
    await assert.rejects(() => resolveInside(root, '/etc/passwd'), /Absolute paths/)
    await assert.rejects(() => resolveInside(root, '../outside'), /escapes/)
    await assert.rejects(() => resolveInside(root, 'ok/../../outside'), /escapes/)
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})

test('resolveInside rejects symlink escape outside the workspace', async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'mushi-bridge-link-'))
  const root = path.join(parent, 'workspace')
  const outside = path.join(parent, 'secret.txt')
  try {
    await fs.mkdir(root)
    await fs.writeFile(outside, 'secret')
    await fs.symlink(outside, path.join(root, 'leak.txt'))
    await assert.rejects(() => resolveInside(root, 'leak.txt'), /escapes/)
  } finally {
    await fs.rm(parent, { recursive: true, force: true })
  }
})

test('resolveInside accepts relative files inside the workspace', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mushi-bridge-ok-'))
  try {
    await fs.writeFile(path.join(root, 'readme.md'), 'hi')
    const resolved = await resolveInside(root, 'readme.md')
    assert.equal(resolved.relative, 'readme.md')
    assert.equal(await fs.readFile(resolved.absolute, 'utf8'), 'hi')
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
})

test('command allowlist permits known tools and rejects others', () => {
  assert.equal(isAllowedCommand('pnpm'), true)
  assert.equal(isAllowedCommand('node'), true)
  assert.equal(isAllowedCommand('git'), true)
  assert.equal(isAllowedCommand('bash'), false)
  assert.equal(isAllowedCommand('curl'), false)
  assert.equal(isAllowedCommand('rm'), false)
})
