import test from 'node:test'
import assert from 'node:assert/strict'
import { BurstLimitGuard } from '../src/auth/burst-limit.guard.js'

test('owner and heartbeat routes reject abusive bursts with 429', () => {
  const guard = new BurstLimitGuard()
  const ctx = (url: string, remoteAddress: string) => ({
    switchToHttp: () => ({ getRequest: () => ({ originalUrl: url, method: 'GET', socket: { remoteAddress } }) }),
  })
  const owner = ctx('/auth/owner', '192.0.2.101')
  for (let i = 0; i < 30; i++) assert.equal(guard.canActivate(owner as never), true)
  assert.throws(() => guard.canActivate(owner as never), (error: { status?: number }) => error.status === 429)
  assert.equal(guard.canActivate(ctx('/health', '192.0.2.101') as never), true)
  assert.equal(guard.canActivate(ctx('/auth/owner', '192.0.2.102') as never), true)
})

test('heartbeat limits are independent of owner auth and do not trust forwarded headers', () => {
  const guard = new BurstLimitGuard()
  const ctx = {
    switchToHttp: () => ({ getRequest: () => ({
      originalUrl: '/devices/sample-id/heartbeat',
      method: 'POST',
      socket: { remoteAddress: '192.0.2.103' },
      headers: { 'x-forwarded-for': '198.51.100.24' },
    }) }),
  }
  for (let i = 0; i < 120; i++) assert.equal(guard.canActivate(ctx as never), true)
  assert.throws(() => guard.canActivate(ctx as never), (error: { status?: number }) => error.status === 429)
})


test('new Bridge mutating endpoints are rate limited', () => {
  for (const [index, pathname] of ['/owner/bridge/dev-action', '/owner/bridge/tunnel-action',
    '/owner/bridge/project-flag', '/owner/bridge/pick-workspace', '/owner/bridge/start-directory'].entries()) {
    const guard = new BurstLimitGuard()
    const ctx = { switchToHttp: () => ({ getRequest: () => ({
      originalUrl: pathname, method: 'POST', socket: { remoteAddress: '192.0.2.' + (150 + index) },
    }) }) }
    for (let i = 0; i < 120; i++) assert.equal(guard.canActivate(ctx as never), true)
    assert.throws(() => guard.canActivate(ctx as never), (error: { status?: number }) => error.status === 429)
  }
})

test('owner bridge routes are classified as sensitive and reject abusive bursts with 429', () => {
  const guard = new BurstLimitGuard()
  const ctx = (url: string, method = 'GET') => ({
    switchToHttp: () => ({ getRequest: () => ({ originalUrl: url, method, socket: { remoteAddress: '192.0.2.104' } }) }),
  })
  const bridge = ctx('/owner/bridge')
  for (let i = 0; i < 120; i++) assert.equal(guard.canActivate(bridge as never), true)
  assert.throws(() => guard.canActivate(bridge as never), (error: { status?: number }) => error.status === 429)
})

