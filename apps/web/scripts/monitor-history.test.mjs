import test from 'node:test'
import assert from 'node:assert/strict'
import { parseMonitorHistory } from '../src/features/system/monitor-api.ts'
const first = { at: '2026-10-10T01:00:00.000Z', cpuPercent: 28.5, memoryUsedBytes: 100, memoryTotalBytes: 200 }
test('history accepts only timestamp-ordered real measurements', () => {
  assert.deepEqual(parseMonitorHistory({ samples: [first, { ...first, at: '2026-10-10T02:00:00.000Z', cpuPercent: 35 }] }).length, 2)
  assert.deepEqual(parseMonitorHistory({ samples: [] }), [])
})
test('history rejects malformed or fabricated measurement response', () => {
  for (const sample of [{ ...first, cpuPercent: 101 }, { ...first, memoryUsedBytes: -1 },
    { ...first, memoryUsedBytes: 250 }, { ...first, at: 'never' }]) {
    assert.throws(() => parseMonitorHistory({ samples: [sample] }))
  }
  assert.throws(() => parseMonitorHistory({ samples: [{ ...first, at: '2026-10-10T02:00:00.000Z' }, first] }))
  assert.throws(() => parseMonitorHistory({ samples: Array(501).fill(first) }))
})
