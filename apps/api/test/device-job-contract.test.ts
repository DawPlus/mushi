import test from 'node:test'
import assert from 'node:assert/strict'
import { validateDeviceJobLease } from '../src/system/device-job-contract.js'
const deviceId = '11111111-1111-4111-8111-111111111111'
const jobId = '22222222-2222-4222-8222-222222222222'
const now = Date.parse('2026-10-10T01:00:00.000Z')
const lease = { deviceId, jobId, leaseId: 'nonce_1234567890123', command: 'node-version', expiresAt: new Date(now + 30_000).toISOString() }

test('device lease contract requires correct device, permitted command and short TTL', () => {
  assert.equal(validateDeviceJobLease(lease, deviceId, now)?.command, 'node-version')
  assert.equal(validateDeviceJobLease({ ...lease, deviceId: jobId }, deviceId, now), null)
  assert.equal(validateDeviceJobLease({ ...lease, command: 'rm -rf /' }, deviceId, now), null)
  assert.equal(validateDeviceJobLease({ ...lease, expiresAt: new Date(now - 1).toISOString() }, deviceId, now), null)
  assert.equal(validateDeviceJobLease({ ...lease, expiresAt: new Date(now + 120_000).toISOString() }, deviceId, now), null)
  assert.equal(validateDeviceJobLease({ ...lease, leaseId: 'short' }, deviceId, now), null)
  assert.equal(validateDeviceJobLease({ ...lease, jobId: 'invalid' }, deviceId, now), null)
  assert.equal(validateDeviceJobLease({ ...lease, executable: '/bin/sh' }, deviceId, now), null)
  assert.equal(validateDeviceJobLease({ ...lease, bearerToken: 'secret' }, deviceId, now), null)
  assert.equal(validateDeviceJobLease({ ...lease, expiresAt: '2026-10-10T01:00:30Z' }, deviceId, now), null)
  assert.equal(validateDeviceJobLease(null, deviceId, now), null)
})
