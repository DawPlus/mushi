import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveEndpoint, sendCheckin, runAgent } from './checkin.mjs'

const deviceId = '11111111-1111-4111-8111-111111111111'
const token = 'x'.repeat(40)
const bridge = { reachable: false, checkedAt: '2026-10-09T12:00:00.000Z', error: 'Bridge 연결 실패' }
const metrics = {
  recordedAt: '2026-10-09T12:00:00.000Z',
  cpuPercent: 12.3, cpuCores: 10, memoryUsedBytes: 100, memoryTotalBytes: 200,
  diskUsedBytes: 1000, diskTotalBytes: 2000, uptimeSeconds: 1200, processCount: 123,
}

test('allows only HTTPS or localhost HTTP', () => {
  assert.equal(resolveEndpoint('https://example.com/', deviceId).pathname, '/devices/' + deviceId + '/heartbeat')
  assert.equal(resolveEndpoint('http://127.0.0.1:3000/', deviceId).port, '3000')
  assert.throws(() => resolveEndpoint('http://example.com/', deviceId))
  assert.throws(() => resolveEndpoint('https://user:pass@example.com/', deviceId))
  assert.throws(() => resolveEndpoint('https://example.com/other/', deviceId))
  assert.throws(() => resolveEndpoint('https://example.com/?token=bad', deviceId))
})
test('one-shot sends bearer credential in header only, never URL or body', async () => {
  let count = 0
  const request = async (url, options) => {
    count++
    assert.equal(url.search, '')
    assert.equal(options.headers.authorization, 'Bearer ' + token)
    const body = JSON.parse(options.body)
    assert.ok(Math.abs(Date.now() - Date.parse(body.observedAt)) < 5_000)
    delete body.observedAt
    assert.deepEqual(body, { agentVersion: 'mushi-agent-0.1.0', metrics, bridge })
    return { ok: true, status: 201 }
  }
  const result = await runAgent(['--once'], { MONITOR_API_URL: 'http://localhost:3000/', MONITOR_DEVICE_ID: deviceId, MONITOR_DEVICE_TOKEN: token }, request, async () => metrics, async () => bridge)
  assert.equal(result.code, 0)
  assert.equal(result.httpStatus, 201)
  assert.equal(count, 1)
})
test('collector failure still sends a sanitized heartbeat without metrics', async () => {
  await sendCheckin({
    apiUrl: 'http://localhost:3000/', deviceId, token,
    collectMetrics: async () => { throw new Error('private collector error') },
    request: async (_url, options) => {
      const body = JSON.parse(options.body)
      assert.ok(typeof body.observedAt === 'string')
      delete body.observedAt
      assert.deepEqual(body, { agentVersion: 'mushi-agent-0.1.0' })
      return { ok: true, status: 201 }
    },
  })
})

test('rejects errors without exposing response contents or credentials', async () => {
  await assert.rejects(sendCheckin({ apiUrl: 'https://example.com/', deviceId, token, request: async () => ({ ok: false, status: 401 }) }), /HTTP 401/)
  await assert.rejects(sendCheckin({ apiUrl: 'https://example.com/', deviceId, token: 'short' }))
})

test('watch fails fast on invalid configuration before any network request', async () => {
  let calls = 0
  const request = async () => { calls++; throw Error('unexpected request') }
  await assert.rejects(runAgent(['--watch'], { MONITOR_API_URL: 'http://remote.example', MONITOR_DEVICE_ID: deviceId, MONITOR_DEVICE_TOKEN: token }, request), /HTTPS/)
  await assert.rejects(runAgent(['--watch'], { MONITOR_API_URL: 'http://127.0.0.1:3000', MONITOR_DEVICE_ID: deviceId, MONITOR_DEVICE_TOKEN: 'short' }, request), /credential/)
  assert.equal(calls, 0)
})
