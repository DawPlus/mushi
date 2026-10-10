import test from 'node:test'
import assert from 'node:assert/strict'
import { OwnerJobService } from '../src/system/owner-job.service.js'
import { LocalJobQueue } from '../src/system/job-queue.js'

const alice = '11111111-1111-4111-8111-111111111111'
const bob = '22222222-2222-4222-8222-222222222222'

test('owner facade isolates jobs and prevents cross-owner cancellation', () => {
  const service = new OwnerJobService(new LocalJobQueue())
  const job = service.create(alice, 'node-version', 'request_same123')
  assert.equal(service.get(alice, job.id)?.id, job.id)
  assert.equal(service.get(bob, job.id), null)
  assert.equal(service.cancel(bob, job.id), null)
  assert.equal(service.list(bob).length, 0)
  assert.equal(service.cancel(alice, job.id)?.status, 'cancelled')
})


test('owner reads reflect expired pending jobs without running executor', () => {
  const queue = new LocalJobQueue()
  const service = new OwnerJobService(queue)
  const job = queue.enqueue('node-version', { ownerId: alice, requestId: 'expiring_12345', ttlMs: 1000 })
  const originalNow = Date.now
  try {
    Date.now = () => Date.parse(job.createdAt) + 1001
    assert.equal(service.list(alice)[0]?.status, 'cancelled')
    assert.equal(service.get(alice, job.id)?.status, 'cancelled')
    assert.equal(service.cancel(alice, job.id), null)
  } finally { Date.now = originalNow }
})

test('owner facade rejects unknown identities and duplicate requests', () => {
  const service = new OwnerJobService()
  assert.throws(() => service.list('invalid'), /Verified owner/)
  assert.throws(() => service.create(alice, 'git status', 'request_123456'), /not allowed/)
  assert.throws(() => service.create(alice, 'node-version', 'short'), /request ID/)
  const a = service.create(alice, 'node-version', 'request_123456')
  assert.equal(service.create(alice, 'node-version', 'request_123456').id, a.id)
  assert.throws(() => service.create(alice, 'git-version', 'request_123456'), /conflict/)
  assert.equal(service.get(alice, 'malformed'), null)
})
