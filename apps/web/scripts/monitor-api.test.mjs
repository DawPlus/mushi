import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchMonitorStatus } from '../src/features/system/monitor-api.ts'

const deviceId = '11111111-1111-4111-8111-111111111111'
test('Monitor status fetch uses only owner bearer and approved local endpoint', async () => {
  let calls = 0
  const value = await fetchMonitorStatus('user-access-token', deviceId, 'http://127.0.0.1:3000', async (url, options) => {
    calls++
    assert.equal(String(url), 'http://127.0.0.1:3000/owner/devices/' + deviceId + '/heartbeat')
    assert.equal(options.headers.Authorization, 'Bearer user-access-token')
    assert.equal(options.redirect, 'error')
    return new Response(JSON.stringify({ status: 'online', lastSeenAt: '2026-10-09T12:00:00Z', macMetrics: null, bridge: { reachable: true, checkedAt: '2026-10-09T12:00:00.000Z' }, ownerId: 'should-be-hidden', deviceId }), { status: 200 })
  })
  assert.equal(calls, 1)
  assert.equal(value.status, 'online')
  assert.equal(value.macMetrics, null)
  assert.equal(value.bridge?.reachable, true)
  assert.equal('ownerId' in value, false)
  assert.equal('deviceId' in value, false)
})
test('Monitor fetch fails closed on unsafe URLs, bad status and malformed responses', async () => {
  const ok = async () => new Response(JSON.stringify({ status: 'online', lastSeenAt: null }))
  await assert.rejects(fetchMonitorStatus('test', deviceId, 'http://evil.example/', ok))
  await assert.rejects(fetchMonitorStatus('test', deviceId, 'https://user:pass@example.com/', ok))
  await assert.rejects(fetchMonitorStatus('test', 'bad', 'http://localhost:3000', ok))
  await assert.rejects(fetchMonitorStatus('test', deviceId, 'http://localhost:3000', async () => new Response('', { status: 401 })))
  await assert.rejects(fetchMonitorStatus('test', deviceId, 'http://localhost:3000', async () => new Response(JSON.stringify({ status: 'online', lastSeenAt: null, macMetrics: { cpuPercent: 'bad' } }))))
  await assert.rejects(fetchMonitorStatus('test', deviceId, 'http://localhost:3000', async () => new Response(JSON.stringify({ status: 'online', lastSeenAt: null, bridge: { reachable: true, checkedAt: '2026-10-09T12:00:00Z', error: 'secret' } }))))
})
