import 'reflect-metadata'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { spawn } from 'node:child_process'
import { BridgeService } from '../src/bridge/bridge.service.js'
import {
  buildSanitizedChildEnv,
  ManagedProcessRegistry,
  terminateChild,
} from '../src/bridge/tools.js'

test('buildSanitizedChildEnv keeps PATH/platform basics and omits server secrets', () => {
  const env = buildSanitizedChildEnv({
    PATH: '/usr/bin:/bin',
    HOME: '/home/bridge',
    USER: 'bridge',
    TMPDIR: '/tmp',
    LANG: 'en_US.UTF-8',
    TERM: 'xterm-256color',
    MUSHI_BRIDGE_TOKEN: 'mushi-secret-token-32chars-minimum!',
    ONION_BRIDGE_TOKEN: 'onion-secret-token-32chars-minimum!',
    API_ACCESS_TOKEN: 'api-access-token-32chars-minimum!!!',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_secret',
    MONITOR_DEVICE_TOKEN: 'monitor-device-token-32chars-min!!',
    MONITOR_OWNER_ID: 'owner-uuid',
    DATABASE_URL: 'postgresql://secret',
    N8N_API_KEY: 'n8n-secret',
    CUSTOM_APP_SECRET: 'should-not-pass',
  })

  assert.equal(env.PATH, '/usr/bin:/bin')
  assert.equal(env.HOME, '/home/bridge')
  assert.equal(env.USER, 'bridge')
  assert.equal(env.TMPDIR, '/tmp')
  assert.equal(env.LANG, 'en_US.UTF-8')
  assert.equal(env.TERM, 'xterm-256color')
  assert.equal(env.MUSHI_BRIDGE_TOKEN, undefined)
  assert.equal(env.ONION_BRIDGE_TOKEN, undefined)
  assert.equal(env.API_ACCESS_TOKEN, undefined)
  assert.equal(env.SUPABASE_URL, undefined)
  assert.equal(env.SUPABASE_PUBLISHABLE_KEY, undefined)
  assert.equal(env.MONITOR_DEVICE_TOKEN, undefined)
  assert.equal(env.MONITOR_OWNER_ID, undefined)
  assert.equal(env.DATABASE_URL, undefined)
  assert.equal(env.N8N_API_KEY, undefined)
  assert.equal(env.CUSTOM_APP_SECRET, undefined)
})

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

test('ManagedProcessRegistry stopAll kills children and clears entries', async () => {
  const registry = new ManagedProcessRegistry()
  const entry = registry.startForTest('node', ['-e', 'setInterval(() => {}, 1000)'], process.cwd())
  assert.equal(registry.size, 1)
  assert.ok(entry.child.pid)

  await registry.stopAll()
  assert.equal(registry.size, 0)
  assert.equal(entry.child.killed || entry.exitCode !== null || entry.status === 'exited', true)
})

test('ManagedProcessRegistry stopAll SIGKILLs children that ignore SIGTERM', async () => {
  const registry = new ManagedProcessRegistry()
  const entry = registry.startForTest(
    'node',
    ['-e', "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)"],
    process.cwd(),
  )
  const pid = entry.child.pid
  assert.ok(pid)
  try {
    assert.equal(registry.size, 1)

    // Settle, then prove the child ignores SIGTERM before exercising stopAll.
    await new Promise((resolve) => setTimeout(resolve, 100))
    assert.equal(entry.status, 'running')
    assert.equal(isPidAlive(pid), true)
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      assert.fail('failed to signal stubborn child')
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
    assert.equal(isPidAlive(pid), true, 'child must still be alive after SIGTERM')
    assert.equal(entry.status, 'running')

    await registry.stopAll()
    assert.equal(registry.size, 0)
    assert.equal(isPidAlive(pid), false, 'stopAll must SIGKILL stubborn children')
  } finally {
    if (isPidAlive(pid)) {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        // best-effort test cleanup
      }
    }
  }
})

test('ManagedProcessRegistry stop waits until stubborn child is dead and status exited', async () => {
  const registry = new ManagedProcessRegistry()
  const entry = registry.startForTest(
    'node',
    ['-e', "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)"],
    process.cwd(),
  )
  const pid = entry.child.pid
  assert.ok(pid)
  try {
    await new Promise((resolve) => setTimeout(resolve, 100))
    assert.equal(entry.status, 'running')
    assert.equal(isPidAlive(pid), true)
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      assert.fail('failed to signal stubborn child')
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
    assert.equal(isPidAlive(pid), true, 'child must still be alive after SIGTERM')

    const stopped = await registry.stop(entry.id)
    assert.ok(stopped)
    assert.equal(stopped.status, 'exited', 'stop must not claim completion while still running')
    assert.equal(isPidAlive(pid), false, 'individual stop must SIGKILL stubborn children')
    assert.equal(registry.size, 1, 'individual stop keeps the exited entry')
  } finally {
    if (isPidAlive(pid)) {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        // best-effort test cleanup
      }
    }
  }
})

test('terminateChild SIGKILLs stubborn one-shot children used by command timeout', async () => {
  const child = spawn(
    'node',
    ['-e', "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)"],
    {
      cwd: process.cwd(),
      shell: false,
      windowsHide: true,
      stdio: 'ignore',
      env: buildSanitizedChildEnv(),
    },
  )
  const pid = child.pid
  assert.ok(pid)
  try {
    await new Promise((resolve) => setTimeout(resolve, 100))
    assert.equal(isPidAlive(pid), true)
    try {
      child.kill('SIGTERM')
    } catch {
      assert.fail('failed to signal stubborn one-shot child')
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
    assert.equal(isPidAlive(pid), true, 'one-shot child must still be alive after SIGTERM')

    await terminateChild(child)
    assert.equal(isPidAlive(pid), false, 'command-timeout path must not leak stubborn children')
  } finally {
    if (isPidAlive(pid)) {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        // best-effort test cleanup
      }
    }
  }
})

test('BridgeService deactivate and workspace switch stop managed processes', async () => {
  const workspaceA = await fs.mkdtemp(path.join(os.tmpdir(), 'mushi-bridge-a-'))
  const workspaceB = await fs.mkdtemp(path.join(os.tmpdir(), 'mushi-bridge-b-'))
  const bridge = new BridgeService()
  try {
    await bridge.activate(workspaceA)
    const id = bridge.processes.startForTest(
      'node',
      ['-e', 'setInterval(() => {}, 1000)'],
      workspaceA,
    ).id
    assert.equal(bridge.processes.size, 1)
    assert.ok(bridge.processes.get(id))

    await bridge.deactivate()
    assert.equal(bridge.processes.size, 0)
    assert.equal(bridge.processes.get(id), undefined)

    await bridge.activate(workspaceB)
    assert.equal(bridge.processes.size, 0)
    assert.equal(bridge.processes.list().length, 0)
  } finally {
    await bridge.deactivate()
    await fs.rm(workspaceA, { recursive: true, force: true })
    await fs.rm(workspaceB, { recursive: true, force: true })
  }
})

test('failed MCP requests do not leak sessions; session cap rejects deterministically', async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'mushi-bridge-sess-'))
  const previousMushi = process.env.MUSHI_BRIDGE_TOKEN
  const previousOnion = process.env.ONION_BRIDGE_TOKEN
  const token = 'test-mushi-bridge-token-32chars!!'
  process.env.MUSHI_BRIDGE_TOKEN = token
  delete process.env.ONION_BRIDGE_TOKEN

  const { createServer } = await import('node:http')
  const bridge = new BridgeService({ maxSessions: 2 })

  const server = createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      let body: unknown
      try {
        body = raw ? JSON.parse(raw) : undefined
      } catch {
        body = raw
      }
      const enriched = Object.assign(req, { body })
      const nestRes = Object.assign(res, {
        status(code: number) {
          res.statusCode = code
          return nestRes
        },
        json(payload: unknown) {
          if (!res.headersSent) {
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify(payload))
          }
        },
      })
      void bridge.handleMcp(enriched as never, nestRes as never)
    })
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const base = `http://127.0.0.1:${address.port}`

  try {
    await bridge.activate(workspace)

    for (let i = 0; i < 5; i++) {
      await fetch(`${base}/`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: i, method: 'tools/list', params: {} }),
        signal: AbortSignal.timeout(5000),
      })
    }
    assert.equal(bridge.sessionCount(), 0, 'non-initialize requests must not leak sessions')

    for (let i = 0; i < 2; i++) {
      const init = await fetch(`${base}/`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 100 + i,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'cap-test', version: '1.0.0' },
          },
        }),
        signal: AbortSignal.timeout(8000),
      })
      assert.equal(init.status, 200)
      assert.ok(init.headers.get('mcp-session-id'))
    }
    assert.equal(bridge.sessionCount(), 2)

    const capped = await fetch(`${base}/`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 999,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'cap-test', version: '1.0.0' },
        },
      }),
      signal: AbortSignal.timeout(5000),
    })
    assert.equal(capped.status, 429)
    const cappedBody = await capped.json()
    assert.match(JSON.stringify(cappedBody), /session|limit/i)
    assert.equal(bridge.sessionCount(), 2)
  } finally {
    await bridge.deactivate()
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())))
    await fs.rm(workspace, { recursive: true, force: true })
    if (previousMushi === undefined) delete process.env.MUSHI_BRIDGE_TOKEN
    else process.env.MUSHI_BRIDGE_TOKEN = previousMushi
    if (previousOnion === undefined) delete process.env.ONION_BRIDGE_TOKEN
    else process.env.ONION_BRIDGE_TOKEN = previousOnion
  }
})
