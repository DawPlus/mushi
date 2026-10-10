import test from 'node:test'
import assert from 'node:assert/strict'
import { Logger } from '@nestjs/common'
import { OwnerJobService } from '../src/system/owner-job.service.js'

test('CLI lifecycle audit logs only fixed events and timestamps', () => {
  const captured: string[] = []
  const previous = Logger.prototype.log
  Logger.prototype.log = function (value: unknown) { captured.push(String(value)) }
  try {
    const svc = new OwnerJobService()
    const owner = '11111111-1111-4111-8111-111111111111'
    const id = 'auditevent_12345'
    const created = svc.create(owner, 'node-version', id)
    svc.create(owner, 'node-version', id)
    svc.cancel(owner, created.id)
    assert.deepEqual(captured.map(s => JSON.parse(s).event), ['job_created', 'job_reused', 'job_cancelled'])
    for (const raw of captured) {
      const parsed = JSON.parse(raw)
      assert.deepEqual(Object.keys(parsed).sort(), ['at', 'event'])
      assert.ok(Number.isFinite(Date.parse(parsed.at)))
      assert.ok(!raw.includes(owner) && !raw.includes(created.id) && !raw.includes(id))
    }
  } finally { Logger.prototype.log = previous }
})
