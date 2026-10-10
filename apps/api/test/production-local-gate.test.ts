import assert from 'node:assert/strict'
import test from 'node:test'
import { isHostedLocalControl } from '../src/auth/production-local-gate.js'

test('production disables Mac-local controls', () => {
  for (const path of ['/bridge/mcp', '/owner/bridge', '/owner/bridge/dev-action', '/owner/codync/bots', '/owner/mac-agent/start', '/owner/mac-agent/status?x=1']) {
    assert.equal(isHostedLocalControl(path, true), true, path)
    assert.equal(isHostedLocalControl(path, false), false, path)
  }
})

test('production retains remote-safe endpoints', () => {
  for (const path of ['/health', '/auth/owner', '/devices/test/heartbeat', '/owner/projects', '/owner/cli-jobs', '/owner/bridges']) {
    assert.equal(isHostedLocalControl(path, true), false, path)
  }
})
