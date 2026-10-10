import assert from 'node:assert/strict'
import test from 'node:test'
import { isBlockedHostedRoute } from '../src/auth/hosted-route-policy.js'

test('hosted login-only mode allows only GET health and owner auth', () => {
  for (const path of ['/health', '/auth/owner', '/auth/owner?check=1']) {
    assert.equal(isBlockedHostedRoute('GET', path, true), false, path)
    assert.equal(isBlockedHostedRoute('POST', path, true), true, path)
  }
  for (const path of ['/bridge/mcp', '/owner/bridge', '/owner/codync/bots', '/owner/mac-agent/status', '/owner/projects', '/owner/cli-jobs', '/devices/x/heartbeat', '/health/anything', '/auth/owner/anything']) {
    assert.equal(isBlockedHostedRoute('GET', path, true), true, path)
    assert.equal(isBlockedHostedRoute('POST', path, true), true, path)
  }
})

test('local API remains unrestricted by hosted policy', () => {
  assert.equal(isBlockedHostedRoute('POST', '/devices/test/heartbeat', false), false)
  assert.equal(isBlockedHostedRoute('GET', '/owner/bridge', false), false)
})
