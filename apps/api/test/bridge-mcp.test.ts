import 'reflect-metadata'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module.js'
import { BridgeService } from '../src/bridge/bridge.service.js'

const TOKEN = 'test-mushi-bridge-token-32chars!!'

async function withBridgeApp(
  run: (base: string, bridge: BridgeService, workspace: string) => Promise<void>,
) {
  const previousMushi = process.env.MUSHI_BRIDGE_TOKEN
  const previousOnion = process.env.ONION_BRIDGE_TOKEN
  const previousApi = process.env.API_ACCESS_TOKEN
  process.env.MUSHI_BRIDGE_TOKEN = TOKEN
  delete process.env.ONION_BRIDGE_TOKEN
  process.env.API_ACCESS_TOKEN = 'api-access-token-for-other-routes-32!!'

  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'mushi-bridge-mcp-'))
  await fs.writeFile(path.join(workspace, 'hello.txt'), 'hello bridge')

  const app = await NestFactory.create(AppModule, { logger: false })
  const bridge = app.get(BridgeService)
  try {
    await bridge.deactivate()
    await app.listen(0, '127.0.0.1')
    const server = app.getHttpServer()
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    const base = `http://127.0.0.1:${address.port}`
    await run(base, bridge, workspace)
  } finally {
    await bridge.deactivate()
    await app.close()
    await fs.rm(workspace, { recursive: true, force: true })
    if (previousMushi === undefined) delete process.env.MUSHI_BRIDGE_TOKEN
    else process.env.MUSHI_BRIDGE_TOKEN = previousMushi
    if (previousOnion === undefined) delete process.env.ONION_BRIDGE_TOKEN
    else process.env.ONION_BRIDGE_TOKEN = previousOnion
    if (previousApi === undefined) delete process.env.API_ACCESS_TOKEN
    else process.env.API_ACCESS_TOKEN = previousApi
  }
}

test('POST /bridge/mcp rejects unauthenticated requests', async () => {
  await withBridgeApp(async (base, bridge, workspace) => {
    await bridge.activate(workspace)
    const response = await fetch(`${base}/bridge/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0.0' },
        },
      }),
      signal: AbortSignal.timeout(5000),
    })
    assert.equal(response.status, 401)
    const body = await response.json()
    assert.equal(body.error, 'invalid_token')
    assert.doesNotMatch(JSON.stringify(body), /MUSHI_BRIDGE|ONION_BRIDGE|test-mushi/)
  })
})

test('POST /bridge/mcp rejects requests while workspace is inactive', async () => {
  await withBridgeApp(async (base, bridge) => {
    assert.equal(bridge.isActive(), false)
    const response = await fetch(`${base}/bridge/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0.0' },
        },
      }),
      signal: AbortSignal.timeout(5000),
    })
    assert.equal(response.status, 409)
    const body = await response.json()
    assert.match(String(body.error), /inactive|not active/i)
  })
})

async function mcpInitialize(base: string): Promise<string> {
  const init = await fetch(`${base}/bridge/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${TOKEN}`,
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' },
      },
    }),
    signal: AbortSignal.timeout(8000),
  })
  assert.equal(init.status, 200)
  const sessionId = init.headers.get('mcp-session-id')
  assert.ok(sessionId, 'initialize must return mcp-session-id')
  return sessionId
}

async function mcpToolsCall(
  base: string,
  sessionId: string,
  name: string,
  args: Record<string, unknown>,
  id = 2,
): Promise<{ status: number; body: string; json: unknown }> {
  const response = await fetch(`${base}/bridge/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${TOKEN}`,
      accept: 'application/json, text/event-stream',
      'mcp-session-id': sessionId,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
    signal: AbortSignal.timeout(8000),
  })
  const body = await response.text()
  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    json = null
  }
  return { status: response.status, body, json }
}

function assertNoSensitiveLeak(body: string, workspaceReal: string) {
  assert.doesNotMatch(body, new RegExp(workspaceReal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.doesNotMatch(body, /ENOENT|EACCES|EPERM|EISDIR|ENOTDIR|EEXIST/)
  assert.doesNotMatch(body, /no such file or directory/i)
  assert.doesNotMatch(body, /MUSHI_BRIDGE|ONION_BRIDGE|API_ACCESS_TOKEN/)
  assert.doesNotMatch(body, /test-mushi-bridge-token-32chars!!/)
  assert.doesNotMatch(body, /api-access-token-for-other-routes-32!!/)
  assert.doesNotMatch(body, /\/private\/var\/folders\//)
  assert.doesNotMatch(body, /\/Users\//)
}

test('POST /bridge/mcp initialize and tools/list succeed when active and authenticated', async () => {
  await withBridgeApp(async (base, bridge, workspace) => {
    await bridge.activate(workspace)
    const init = await fetch(`${base}/bridge/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${TOKEN}`,
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0.0' },
        },
      }),
      signal: AbortSignal.timeout(8000),
    })
    assert.equal(init.status, 200)
    const initBody = await init.text()
    assert.match(initBody, /serverInfo|protocolVersion|mushi-bridge/)
    assert.doesNotMatch(initBody, /[Oo]nion/)
    const sessionId = init.headers.get('mcp-session-id')
    assert.ok(sessionId, 'initialize must return mcp-session-id')

    const tools = await fetch(`${base}/bridge/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${TOKEN}`,
        accept: 'application/json, text/event-stream',
        'mcp-session-id': sessionId,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      }),
      signal: AbortSignal.timeout(8000),
    })
    assert.equal(tools.status, 200)
    const toolsBody = await tools.text()
    assert.match(toolsBody, /get_workspace_info/)
    assert.match(toolsBody, /read_file/)
    assert.match(toolsBody, /run_workspace_command/)
    assert.match(toolsBody, /start_workspace_process/)
    assert.match(toolsBody, /workspace_process_status/)
    assert.doesNotMatch(toolsBody, /request_local_http/)
    assert.doesNotMatch(toolsBody, /wait_for_local_service/)
  })
})

test('tools/call read_file missing path returns sanitized MCP error without workspace absolute path', async () => {
  await withBridgeApp(async (base, bridge, workspace) => {
    await bridge.activate(workspace)
    const workspaceReal = await fs.realpath(workspace)
    const sessionId = await mcpInitialize(base)
    const { status, body, json } = await mcpToolsCall(base, sessionId, 'read_file', {
      path: 'missing-secret.txt',
    })
    assert.equal(status, 200)
    const result = (json as { result?: { isError?: boolean; content?: Array<{ text?: string }> } }).result
    assert.equal(result?.isError, true)
    assert.match(String(result?.content?.[0]?.text ?? ''), /not found|failed|unavailable/i)
    assertNoSensitiveLeak(body, workspaceReal)
  })
})

test('tools/call delete_path missing path returns sanitized MCP error without absolute path or secrets', async () => {
  await withBridgeApp(async (base, bridge, workspace) => {
    await bridge.activate(workspace)
    const workspaceReal = await fs.realpath(workspace)
    const sessionId = await mcpInitialize(base)
    const { status, body, json } = await mcpToolsCall(
      base,
      sessionId,
      'delete_path',
      { path: 'missing-secret.txt' },
      3,
    )
    assert.equal(status, 200)
    const result = (json as { result?: { isError?: boolean; content?: Array<{ text?: string }> } }).result
    assert.equal(result?.isError, true)
    assert.match(String(result?.content?.[0]?.text ?? ''), /not found|failed|unavailable/i)
    assertNoSensitiveLeak(body, workspaceReal)
  })
})

test('tools/call preserves useful expected validation errors without leaking paths', async () => {
  await withBridgeApp(async (base, bridge, workspace) => {
    await bridge.activate(workspace)
    const workspaceReal = await fs.realpath(workspace)
    const sessionId = await mcpInitialize(base)
    const { status, body, json } = await mcpToolsCall(base, sessionId, 'read_file', {
      path: '/etc/passwd',
    })
    assert.equal(status, 200)
    const result = (json as { result?: { isError?: boolean; content?: Array<{ text?: string }> } }).result
    assert.equal(result?.isError, true)
    assert.match(String(result?.content?.[0]?.text ?? ''), /Absolute paths are not allowed/)
    assertNoSensitiveLeak(body, workspaceReal)
  })
})
