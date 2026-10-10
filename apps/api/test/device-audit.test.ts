import test from 'node:test'
import assert from 'node:assert/strict'
import { Logger } from '@nestjs/common'
import { auditDevice } from '../src/monitor/device-audit.js'

test('device audit only emits fixed event names and timestamps, never secrets or identifiers', () => {
  const emitted: string[] = []
  const originalWarn = Logger.prototype.warn
  const originalLog = Logger.prototype.log
  Logger.prototype.warn = function (message: unknown) { emitted.push(String(message)) }
  Logger.prototype.log = function (message: unknown) { emitted.push(String(message)) }
  try {
    auditDevice('auth_denied')
    auditDevice('heartbeat_accepted')
    auditDevice('heartbeat_rejected')
    assert.equal(emitted.length, 3)
    assert.deepEqual(emitted.map(item => JSON.parse(item).event), ['auth_denied', 'heartbeat_accepted', 'heartbeat_rejected'])
    for (const item of emitted) {
      const value = JSON.parse(item)
      assert.deepEqual(Object.keys(value).sort(), ['at', 'event'])
      assert.ok(Number.isFinite(Date.parse(value.at)))
      assert.doesNotMatch(item, /authorization|Bearer|deviceId|ownerId|token|remoteAddress|body/i)
    }
  } finally {
    Logger.prototype.warn = originalWarn
    Logger.prototype.log = originalLog
  }
})
