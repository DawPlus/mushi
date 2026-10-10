import assert from 'node:assert/strict'
import test from 'node:test'
import { collectMacMetrics } from '../src/system/mac-metrics.js'

test('macOS collector provides bounded, unit-labelled machine metrics without process details', async () => {
  if (process.platform !== 'darwin') return
  const data = await collectMacMetrics()
  assert.ok(data.cpuPercent >= 0 && data.cpuPercent <= 100)
  assert.ok(data.memoryTotalBytes > 0 && data.memoryUsedBytes >= 0)
  assert.ok(data.diskTotalBytes > 0 && data.diskUsedBytes >= 0)
  assert.ok(data.uptimeSeconds > 0 && data.processCount > 0)
  assert.equal(Object.keys(data).some(key => /command|arguments|environment/i.test(key)), false)
})
