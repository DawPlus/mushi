import assert from 'node:assert/strict'
import test from 'node:test'
import { isBlockedHostedRoute } from '../src/auth/hosted-route-policy.js'

test('hosted login-only mode allows only GET health and owner auth', () => {
  for (const path of ['/health', '/auth/owner', '/auth/owner?check=1']) {
    assert.equal(isBlockedHostedRoute('GET', path, true), false, path)
    assert.equal(isBlockedHostedRoute('POST', path, true), true, path)
  }
  for (const path of ['/bridge/mcp', '/owner/bridge', '/owner/codync/bots', '/owner/mac-agent/status', '/owner/projects', '/owner/cli-jobs', '/devices/x/heartbeat', '/owner/devices/x/heartbeat', '/health/anything', '/auth/owner/anything']) {
    assert.equal(isBlockedHostedRoute('GET', path, true), true, path)
    assert.equal(isBlockedHostedRoute('POST', path, true), true, path)
  }
})

test('hosted Monitor opt-in permits only owner-scoped GET reads', () => {
  for (const path of ['/owner/devices/abc/heartbeat', '/owner/devices/abc/metrics-history?hours=24']) {
    assert.equal(isBlockedHostedRoute('GET', path, true, true), false, path)
    assert.equal(isBlockedHostedRoute('POST', path, true, true), true, path)
    assert.equal(isBlockedHostedRoute('GET', path, true, false), true, path)
  }
  for (const path of ['/devices/abc/heartbeat', '/owner/bridge', '/owner/cli-jobs', '/owner/devices/abc/metrics-history/more']) {
    assert.equal(isBlockedHostedRoute('GET', path, true, true), true, path)
  }
})

test('local API remains unrestricted by hosted policy', () => {
  assert.equal(isBlockedHostedRoute('POST', '/devices/test/heartbeat', false), false)
  assert.equal(isBlockedHostedRoute('GET', '/owner/bridge', false), false)
})
