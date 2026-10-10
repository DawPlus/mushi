import assert from 'node:assert/strict'
import test from 'node:test'
import { HEARTBEAT_TIMEOUT_MS, heartbeatState, probeOnionBridge } from '../src/system/onion-status.js'

test('local bridge probe considers reachable responses without exposing URL to caller', async () => {
  let target = ''
  const fetcher = (async (input: URL | RequestInfo) => {
    target = String(input)
    return new Response('', { status: 404 })
  }) as typeof fetch
  const result = await probeOnionBridge(fetcher, new Date('2026-10-09T00:00:00Z'))
  assert.equal(target, 'http://127.0.0.1:3847/')
  assert.equal(result.reachable, true)
  assert.equal(result.checkedAt, '2026-10-09T00:00:00.000Z')
})

test('bridge probe fails safely on network error or server failure', async () => {
  const failure = (async () => { throw new Error('secret connection details') }) as typeof fetch
  const down = await probeOnionBridge(failure)
  assert.equal(down.reachable, false)
  assert.doesNotMatch(down.error ?? '', /secret/)
  assert.equal((await probeOnionBridge((async () => new Response('', { status: 503 })) as typeof fetch)).reachable, false)
})

test('heartbeat expires in two minutes while retaining previous timestamp', () => {
  const now = Date.parse('2026-10-09T03:00:00Z')
  const seen = new Date(now - HEARTBEAT_TIMEOUT_MS).toISOString()
  assert.deepEqual(heartbeatState(seen, now), { online: true, lastSeenAt: seen })
  assert.deepEqual(heartbeatState(seen, now + 1), { online: false, lastSeenAt: seen })
  assert.equal(heartbeatState(null, now).online, false)
  assert.equal(heartbeatState('invalid', now).online, false)
  assert.equal(heartbeatState(new Date(now + 1000).toISOString(), now).online, false)
})
