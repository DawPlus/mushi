import test from 'node:test'
import assert from 'node:assert/strict'
import { canClaimJob, canAcknowledgeJob, expiredJobState, type DurableJob } from '../src/system/durable-job-policy.js'

const job: DurableJob = { ownerId: 'owner', deviceId: 'mac', state: 'pending', expiresAt: 10000, leaseId: null, leaseUntil: null }

test('claim requires matching owner/device, unexpired pending job', () => {
  assert.equal(canClaimJob(job, 'owner', 'mac', 9000), true)
  assert.equal(canClaimJob(job, 'other', 'mac', 9000), false)
  assert.equal(canClaimJob(job, 'owner', 'other', 9000), false)
  assert.equal(canClaimJob(job, 'owner', 'mac', 10000), false)
  assert.equal(canClaimJob({ ...job, state: 'leased' }, 'owner', 'mac', 9000), false)
})
test('ack is lease-token-bound and rejects replay/expiry', () => {
  const leased: DurableJob = { ...job, state: 'leased', leaseId: 'lease-secret', leaseUntil: 9500 }
  assert.equal(canAcknowledgeJob(leased, 'owner', 'mac', 'lease-secret', 9000), true)
  assert.equal(canAcknowledgeJob(leased, 'owner', 'mac', 'wrong', 9000), false)
  assert.equal(canAcknowledgeJob(leased, 'owner', 'other', 'lease-secret', 9000), false)
  assert.equal(canAcknowledgeJob(leased, 'owner', 'mac', 'lease-secret', 9500), false)
  assert.equal(canAcknowledgeJob({ ...leased, state: 'succeeded' }, 'owner', 'mac', 'lease-secret', 9000), false)
})
test('never requeue expired potentially executed lease', () => {
  assert.equal(expiredJobState({ ...job, state: 'leased', leaseUntil: 9500 }, 9600), 'expired')
  assert.equal(expiredJobState({ ...job, state: 'leased', leaseUntil: null }, 9000), 'expired')
  assert.equal(expiredJobState(job, 10000), 'expired')
  assert.equal(expiredJobState({ ...job, state: 'succeeded' }, 20000), 'succeeded')
})
