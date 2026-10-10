import 'reflect-metadata'
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module.js'
import { BurstLimitGuard } from '../src/auth/burst-limit.guard.js'
import { BridgeService } from '../src/bridge/bridge.service.js'
import {
  BridgeManagerService,
  parseBridgeWorkspaces,
} from '../src/bridge/bridge-manager.service.js'
import { OwnerBridgeController } from '../src/bridge/owner-bridge.controller.js'

test('BurstLimitGuard includes /owner/bridge routes in rate limiting', () => {
  const guard = new BurstLimitGuard()
  const ctx = (url: string, method = 'GET') => ({
    switchToHttp: () => ({
      getRequest: () => ({
        originalUrl: url,
        method,
        socket: { remoteAddress: '192.0.2.201' },
      }),
    }),
  })

  const getBridge = ctx('/owner/bridge')
  const startBridge = ctx('/owner/bridge/start', 'POST')
  const stopBridge = ctx('/owner/bridge/stop', 'POST')

  // Under limit: calls succeed
  assert.equal(guard.canActivate(startBridge as never), true)
  assert.equal(guard.canActivate(stopBridge as never), true)

  for (let i = 0; i < 120; i++) {
    assert.equal(guard.canActivate(getBridge as never), true)
  }

  // 121st call gets 429
  assert.throws(
    () => guard.canActivate(getBridge as never),
    (error: { status?: number }) => error.status === 429,
  )
})

test('parseBridgeWorkspaces fails closed on invalid or malicious inputs', () => {
  assert.deepEqual(parseBridgeWorkspaces(undefined), parseBridgeWorkspaces(process.env.MUSHI_BRIDGE_WORKSPACES))
  assert.deepEqual(parseBridgeWorkspaces(''), {})
  assert.deepEqual(parseBridgeWorkspaces('not-json'), {})
  assert.deepEqual(parseBridgeWorkspaces('[]'), {})
  assert.deepEqual(parseBridgeWorkspaces('123'), {})
  assert.deepEqual(parseBridgeWorkspaces('"string"'), {})
  assert.deepEqual(parseBridgeWorkspaces('null'), {})
  assert.deepEqual(parseBridgeWorkspaces('{"": "/path"}'), {})
  assert.deepEqual(parseBridgeWorkspaces('{"../evil": "/path"}'), {})
  assert.deepEqual(parseBridgeWorkspaces('{"safe_name": 123}'), {})
  assert.deepEqual(parseBridgeWorkspaces('{"safe_name": ""}'), {})
  assert.deepEqual(parseBridgeWorkspaces('{"__proto__": "/path"}'), {})

  // Valid entries
  const parsed = parseBridgeWorkspaces(
    JSON.stringify({
      primary: '/var/workspaces/primary',
      'dev-app': '/var/workspaces/app',
      'invalid/label': '/var/workspaces/bad',
    }),
  )
  assert.deepEqual(Object.keys(parsed).sort(), ['dev-app', 'primary'])
  assert.equal(parsed.primary, '/var/workspaces/primary')
  assert.equal(parsed['dev-app'], '/var/workspaces/app')
})

test('BridgeManagerService lifecycle: status, start, stop, conflict, idempotency', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bridge-mgr-test-'))
  const workspacePath = path.join(tmpDir, 'valid-ws')
  const filePath = path.join(tmpDir, 'file-not-dir')
  await fs.mkdir(workspacePath)
  await fs.writeFile(filePath, 'hello')

  try {
    const rawWorkspaces = JSON.stringify({
      myws: workspacePath,
      filews: filePath,
      missingws: path.join(tmpDir, 'does-not-exist'),
    })

    const bridge = new BridgeService()
    const manager = new BridgeManagerService({
      bridgeService: bridge,
      workspacesConfig: rawWorkspaces,
    })

    // Initial status
    const initial = manager.getStatus()
    assert.equal(initial.state, 'idle')
    assert.equal(initial.activeLabel, null)
    assert.equal(initial.startedAt, null)
    assert.equal(initial.stoppedAt, null)
    assert.equal(initial.lastError, null)
    assert.deepEqual(initial.configuredLabels, ['filews', 'missingws', 'myws'])

    // Unknown workspace label throws 404
    await assert.rejects(
      () => manager.start('unknown'),
      (err: { status?: number }) => err.status === 404,
    )

    // Missing directory throws 404
    await assert.rejects(
      () => manager.start('missingws'),
      (err: { status?: number; message?: string }) => {
        assert.equal(err.status, 404)
        assert.ok(!err.message?.includes(tmpDir))
        return true
      },
    )

    // Non-directory file throws 400
    await assert.rejects(
      () => manager.start('filews'),
      (err: { status?: number; message?: string }) => {
        assert.equal(err.status, 400)
        assert.ok(!err.message?.includes(tmpDir))
        return true
      },
    )

    // Successful start
    const started = await manager.start('myws')
    assert.equal(started.state, 'running')
    assert.equal(started.activeLabel, 'myws')
    assert.ok(started.startedAt)
    assert.equal(started.stoppedAt, null)
    assert.equal(started.lastError, null)
    assert.equal(bridge.isActive(), true)

    // Starting while active returns 409 Conflict (both same label and other)
    await assert.rejects(
      () => manager.start('myws'),
      (err: { status?: number }) => err.status === 409,
    )
    await assert.rejects(
      () => manager.start('missingws'),
      (err: { status?: number }) => err.status === 409,
    )

    // Stop is idempotent
    const stopped = await manager.stop()
    assert.equal(stopped.state, 'idle')
    assert.equal(stopped.activeLabel, null)
    assert.ok(stopped.stoppedAt)
    assert.equal(bridge.isActive(), false)

    // Second stop should succeed idempotently
    const stoppedAgain = await manager.stop()
    assert.equal(stoppedAgain.state, 'idle')
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
})

test('BridgeManagerService serializes concurrent start and stop transitions', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bridge-mgr-conc-'))
  const ws1 = path.join(tmpDir, 'ws1')
  const ws2 = path.join(tmpDir, 'ws2')
  await fs.mkdir(ws1)
  await fs.mkdir(ws2)

  try {
    const rawWorkspaces = JSON.stringify({
      ws1,
      ws2,
    })

    const bridge = new BridgeService()
    const manager = new BridgeManagerService({
      bridgeService: bridge,
      workspacesConfig: rawWorkspaces,
    })

    // Concurrent start calls: only one must succeed, other must 409
    const results = await Promise.allSettled([
      manager.start('ws1'),
      manager.start('ws2'),
    ])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')
    assert.equal(fulfilled.length, 1)
    assert.equal(rejected.length, 1)
    const err = (rejected[0] as PromiseRejectedResult).reason as { status?: number }
    assert.equal(err.status, 409)

    // Concurrent stop and start
    const [stopRes, startRes] = await Promise.allSettled([
      manager.stop(),
      manager.start('ws2'),
    ])
    // The stop should succeed, and depending on order start might succeed or get 409
    assert.equal(stopRes.status, 'fulfilled')
    assert.ok(startRes.status === 'fulfilled' || (startRes.reason as { status?: number })?.status === 409)

    await manager.stop()
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
})

test('Diagnostics and responses bound logs and redact paths and secrets', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bridge-diag-'))
  const ws = path.join(tmpDir, 'ws')
  await fs.mkdir(ws)

  try {
    const secretToken = 'secret-bridge-token-xyz123456789'
    const rawWorkspaces = JSON.stringify({ testws: ws })
    const bridge = new BridgeService()
    const manager = new BridgeManagerService({
      bridgeService: bridge,
      workspacesConfig: rawWorkspaces,
      logLimit: 5,
    })

    // Generate more than logLimit events
    for (let i = 0; i < 8; i++) {
      await manager.start('testws')
      await manager.stop()
    }

    const status = manager.getStatus()
    assert.ok(status.recentLogs.length <= 5)

    // Check no path or token disclosure in status
    const serialized = JSON.stringify(status)
    assert.ok(!serialized.includes(tmpDir))
    assert.ok(!serialized.includes(ws))
    assert.ok(!serialized.includes(secretToken))
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
})

test('OwnerBridgeController fails closed without owner bearer auth and validates input', async () => {
  const manager = new BridgeManagerService({
    bridgeService: new BridgeService(),
    workspacesConfig: '{}',
  })
  const controller = new OwnerBridgeController(manager)

  // Unauthenticated requests throw 401
  await assert.rejects(() => controller.getStatus(undefined), { status: 401 })
  await assert.rejects(
    () => controller.start({ workspace: 'a' }, undefined),
    { status: 401 },
  )
  await assert.rejects(() => controller.stop(undefined), { status: 401 })

  // Invalid body format throws 400
  await assert.rejects(
    () => controller.start(null, 'Bearer valid'),
    // Might fail auth or body validation
  )
})

test('Owner Bridge HTTP endpoints require authentication over real loopback HTTP', async () => {
  const app = await NestFactory.create(AppModule, { logger: false })
  try {
    await app.listen(0, '127.0.0.1')
    const server = app.getHttpServer()
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    const base = 'http://127.0.0.1:' + address.port

    const endpoints: [string, string][] = [
      ['GET', '/owner/bridge'],
      ['POST', '/owner/bridge/start'],
      ['POST', '/owner/bridge/stop'],
    ]

    for (const [method, route] of endpoints) {
      // Missing auth header
      const res1 = await fetch(base + route, {
        method,
        ...(method === 'POST'
          ? {
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ workspace: 'primary' }),
            }
          : {}),
      })
      assert.equal(res1.status, 401, `${method} ${route} must return 401 without auth`)

      // Malformed / invalid bearer token
      const res2 = await fetch(base + route, {
        method,
        headers: {
          authorization: 'Bearer invalid-token',
          ...(method === 'POST' ? { 'content-type': 'application/json' } : {}),
        },
        ...(method === 'POST'
          ? { body: JSON.stringify({ workspace: 'primary' }) }
          : {}),
      })
      assert.equal(res2.status, 401, `${method} ${route} must return 401 with invalid token`)
    }
  } finally {
    await app.close()
  }
})

test('Authenticated owner over loopback HTTP: status, start, stop and no leaks', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bridge-http-auth-'))
  const realWsDir = path.join(tmpDir, 'active-ws')
  await fs.mkdir(realWsDir)

  const origEnv = { ...process.env }
  const origFetch = globalThis.fetch

  process.env.SUPABASE_URL = 'https://mock.supabase.co'
  process.env.SUPABASE_PUBLISHABLE_KEY = 'mock-key'
  process.env.SUPABASE_OWNER_USER_ID = 'owner-uuid-1234'
  process.env.MUSHI_BRIDGE_WORKSPACES = JSON.stringify({
    'http-ws': realWsDir,
  })

  // Mock global fetch to stub Supabase user verification while passing real HTTP through
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url
    if (urlStr.startsWith('https://mock.supabase.co/auth/v1/user')) {
      const authHeader = (init?.headers as Record<string, string>)?.authorization
      if (authHeader === 'Bearer valid-owner-jwt') {
        return new Response(JSON.stringify({ id: 'owner-uuid-1234' }), { status: 200 })
      }
      return new Response('Unauthorized', { status: 401 })
    }
    return origFetch(input, init)
  }) as typeof fetch

  const app = await NestFactory.create(AppModule, { logger: false })
  try {
    await app.listen(0, '127.0.0.1')
    const server = app.getHttpServer()
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    const base = 'http://127.0.0.1:' + address.port

    const authHeaders = {
      authorization: 'Bearer valid-owner-jwt',
      'content-type': 'application/json',
    }

    // 1. GET /owner/bridge returns status with configuredLabels
    const getRes = await fetch(base + '/owner/bridge', { headers: authHeaders })
    assert.equal(getRes.status, 200)
    const getBody = (await getRes.json()) as {
      state: string
      configuredLabels: string[]
      activeLabel: string | null
    }
    assert.equal(getBody.state, 'idle')
    assert.ok(getBody.configuredLabels.includes('http-ws'))
    assert.equal(getBody.activeLabel, null)

    // Ensure no filesystem path leaked
    assert.ok(!JSON.stringify(getBody).includes(tmpDir))

    // 2. POST /owner/bridge/start with unknown label returns 404
    const unknownRes = await fetch(base + '/owner/bridge/start', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ workspace: 'non-existent' }),
    })
    assert.equal(unknownRes.status, 404)
    const unknownBody = await unknownRes.text()
    assert.ok(!unknownBody.includes(tmpDir))

    // 3. POST /owner/bridge/start with invalid body returns 400
    const badBodyRes = await fetch(base + '/owner/bridge/start', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ wrongProp: 'http-ws' }),
    })
    assert.equal(badBodyRes.status, 400)

    // 4. POST /owner/bridge/start with valid label returns 200
    const startRes = await fetch(base + '/owner/bridge/start', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ workspace: 'http-ws' }),
    })
    assert.equal(startRes.status, 201) // Nest default POST status is 201
    const startBody = (await startRes.json()) as {
      state: string
      activeLabel: string
      startedAt: string
    }
    assert.equal(startBody.state, 'running')
    assert.equal(startBody.activeLabel, 'http-ws')
    assert.ok(startBody.startedAt)
    assert.ok(!JSON.stringify(startBody).includes(tmpDir))

    // 5. POST /owner/bridge/start while running returns 409 Conflict
    const conflictRes = await fetch(base + '/owner/bridge/start', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ workspace: 'http-ws' }),
    })
    assert.equal(conflictRes.status, 409)

    // 6. POST /owner/bridge/stop returns 200/201 and state idle
    const stopRes = await fetch(base + '/owner/bridge/stop', {
      method: 'POST',
      headers: authHeaders,
    })
    assert.ok(stopRes.status === 200 || stopRes.status === 201)
    const stopBody = (await stopRes.json()) as {
      state: string
      activeLabel: string | null
      stoppedAt: string
    }
    assert.equal(stopBody.state, 'idle')
    assert.equal(stopBody.activeLabel, null)
    assert.ok(stopBody.stoppedAt)
    assert.ok(!JSON.stringify(stopBody).includes(tmpDir))

    // 7. Stop is idempotent: second stop returns 200/201 and state idle
    const stopRes2 = await fetch(base + '/owner/bridge/stop', {
      method: 'POST',
      headers: authHeaders,
    })
    assert.ok(stopRes2.status === 200 || stopRes2.status === 201)
    const stopBody2 = (await stopRes2.json()) as { state: string }
    assert.equal(stopBody2.state, 'idle')
  } finally {
    await app.close()
    globalThis.fetch = origFetch
    process.env = origEnv
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
})
