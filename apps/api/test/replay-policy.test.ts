import test from 'node:test'
import assert from 'node:assert/strict'
import { validObservedAt } from '../src/monitor/replay-policy.js'

test('heartbeat observedAt accepts only canonical UTC time within five minutes', () => {
  const now = Date.parse('2026-10-10T01:00:00.000Z')
  assert.equal(validObservedAt(new Date(now).toISOString(), now), true)
  assert.equal(validObservedAt(new Date(now - 300_000).toISOString(), now), true)
  assert.equal(validObservedAt(new Date(now + 300_000).toISOString(), now), true)
  assert.equal(validObservedAt(new Date(now - 300_001).toISOString(), now), false)
  assert.equal(validObservedAt(new Date(now + 300_001).toISOString(), now), false)
  assert.equal(validObservedAt('2026-10-10T01:00:00Z', now), false)
  assert.equal(validObservedAt('not-a-date', now), false)
  assert.equal(validObservedAt(undefined, now), false)
})
