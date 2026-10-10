import test from 'node:test'
import assert from 'node:assert/strict'
import { heartbeatStatus, heartbeatView } from '../src/monitor/heartbeat-status.js'

test('monitor status changes from unknown to online to offline on heartbeat age', () => {
  const now = Date.parse('2026-10-10T00:00:00Z')
  assert.equal(heartbeatStatus(null, now), 'unknown')
  assert.equal(heartbeatStatus('unparseable', now), 'unknown')
  assert.equal(heartbeatStatus(new Date(now + 5_000), now), 'unknown')
  assert.equal(heartbeatStatus(new Date(now - 90_000), now), 'online')
  assert.equal(heartbeatStatus(new Date(now - 120_000), now), 'online')
  assert.equal(heartbeatStatus(new Date(now - 120_001), now), 'offline')
  const old = heartbeatView({ deviceId: 'test', lastSeenAt: new Date(now - 180_000) }, now)
  assert.equal(old.status, 'offline')
  const recovered = heartbeatView({ deviceId: 'test', lastSeenAt: new Date(now) }, now)
  assert.equal(recovered.status, 'online')
})
