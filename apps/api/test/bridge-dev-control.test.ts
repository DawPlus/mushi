import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { BridgeManagerService } from '../src/bridge/bridge-manager.service.js'

test('DEV requires an existing project and a dev or start script', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mushi-dev-check-'))
  const original = process.env.MUSHI_BRIDGE_BROWSE_ROOT
  process.env.MUSHI_BRIDGE_BROWSE_ROOT = root
  try {
    await mkdir(path.join(root, 'project'))
    await writeFile(path.join(root, 'project', 'package.json'), '{"scripts":{"test":"echo ok"}}')
    const manager = new BridgeManagerService()
    await assert.rejects(manager.devAction('../', 'start'))
    await assert.rejects(manager.devAction('project', 'start'), /No dev or start script/)
    assert.equal((await manager.devAction('project', 'stop')).state, 'idle')
    assert.equal((await manager.projects('')).projects[0].dev.state, 'idle')
  } finally {
    if (original === undefined) delete process.env.MUSHI_BRIDGE_BROWSE_ROOT
    else process.env.MUSHI_BRIDGE_BROWSE_ROOT = original
    await rm(root, { recursive: true, force: true })
  }
})
