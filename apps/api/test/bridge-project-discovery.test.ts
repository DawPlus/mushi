import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { BridgeManagerService } from '../src/bridge/bridge-manager.service.js'

test('project discovery only includes package.json at one depth', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mushi-projects-'))
  const previous = process.env.MUSHI_BRIDGE_BROWSE_ROOT
  try {
    await mkdir(path.join(root, 'app'))
    await mkdir(path.join(root, 'docs'))
    await mkdir(path.join(root, 'node_modules'))
    await writeFile(path.join(root, 'app', 'package.json'), '{}')
    await writeFile(path.join(root, 'node_modules', 'package.json'), '{}')
    process.env.MUSHI_BRIDGE_BROWSE_ROOT = root
    const service = new BridgeManagerService()
    const result = await service.projects('')
    assert.deepEqual(result.projects.map(project => project.name), ['app'])
    assert.equal(result.projects[0].tunnel, 'idle')
  } finally {
    if (previous === undefined) delete process.env.MUSHI_BRIDGE_BROWSE_ROOT
    else process.env.MUSHI_BRIDGE_BROWSE_ROOT = previous
    await rm(root, { recursive: true, force: true })
  }
})
