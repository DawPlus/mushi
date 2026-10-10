import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { BridgeManagerService } from '../src/bridge/bridge-manager.service.js'

test('tunnel actions refuse folders outside approved projects', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mushi-tunnel-check-'))
  const old = process.env.MUSHI_BRIDGE_BROWSE_ROOT
  process.env.MUSHI_BRIDGE_BROWSE_ROOT = root
  try {
    await mkdir(path.join(root, 'docs'))
    await assert.rejects(new BridgeManagerService().tunnelAction('docs', 'start'), /Not a project/)
    await writeFile(path.join(root, 'docs', 'package.json'), '{}')
    await assert.rejects(new BridgeManagerService().tunnelAction('docs', 'stop'), /not managed by Mushi/)
  } finally {
    if (old === undefined) delete process.env.MUSHI_BRIDGE_BROWSE_ROOT
    else process.env.MUSHI_BRIDGE_BROWSE_ROOT = old
    await rm(root, { recursive: true, force: true })
  }
})
