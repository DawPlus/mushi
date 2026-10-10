import test from 'node:test'
import assert from 'node:assert/strict'
import { LocalJobQueue } from '../src/system/job-queue.js'

const a = '11111111-1111-4111-8111-111111111111'
const b = '22222222-2222-4222-8222-222222222222'

test('local queue scopes retrieval and cancellation by owner', () => {
  const q = new LocalJobQueue()
  const created = q.enqueue('node-version', { ownerId: a, requestId: 'request_abcd1234' })
  assert.equal(q.get(created.id, b), null)
  assert.equal(q.cancel(created.id, b), null)
  assert.equal(q.list(b).length, 0)
  assert.equal(q.list(a).length, 1)
  assert.equal(q.cancel(created.id, a)?.status, 'cancelled')
})

test('idempotent request prevents duplicates and rejects changed command', () => {
  const q = new LocalJobQueue()
  const first = q.enqueue('node-version', { ownerId: a, requestId: 'idempotent_12345' })
  const duplicate = q.enqueue('node-version', { ownerId: a, requestId: 'idempotent_12345' })
  assert.equal(first.id, duplicate.id)
  assert.equal(q.list(a).length, 1)
  assert.throws(() => q.enqueue('git-version', { ownerId: a, requestId: 'idempotent_12345' }), /conflict/)
  assert.notEqual(q.enqueue('node-version', { ownerId: b, requestId: 'idempotent_12345' }).id, first.id)
})

test('expired pending jobs cannot execute', async () => {
  let calls = 0
  const q = new LocalJobQueue(async command => { calls++; return { command, status: 'succeeded', output: 'v1' } })
  const job = q.enqueue('node-version', { ownerId: a, ttlMs: 1000 })
  assert.equal(q.expirePending(Date.parse(job.expiresAt!) + 1), 1)
  assert.equal(q.get(job.id)?.status, 'cancelled')
  assert.equal(await q.processNext(), null)
  assert.equal(calls, 0)
})
