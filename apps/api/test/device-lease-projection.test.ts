import test from 'node:test'
import assert from 'node:assert/strict'
import { projectDeviceLease } from '../src/system/device-lease-projection.js'
const now = Date.parse('2026-10-10T01:00:00.000Z')
const deviceId = '11111111-1111-4111-8111-111111111111'
const row = {
 id: '22222222-2222-4222-8222-222222222222', device_id: deviceId,
 lease_id: '33333333-3333-4333-8333-333333333333', command: 'git-version',
 lease_until: new Date(now + 45_000), expires_at: new Date(now + 30_000),
 status: 'leased', owner_id: 'private', request_id: 'private', output: 'private',
}
test('agent lease contains minimal scoped fields and effective shortest expiration', () => {
 const lease = projectDeviceLease(row, deviceId, now)
 assert.deepEqual(Object.keys(lease!).sort(), ['command','deviceId','expiresAt','jobId','leaseId'].sort())
 assert.equal(lease?.expiresAt, new Date(now + 30_000).toISOString())
 assert.equal(projectDeviceLease(row, '44444444-4444-4444-8444-444444444444', now), null)
})
test('device projection denies expired, non-leased and unapproved commands', () => {
 assert.equal(projectDeviceLease({ ...row, status: 'cancelled' }, deviceId, now), null)
 assert.equal(projectDeviceLease({ ...row, command: 'rm -rf /' }, deviceId, now), null)
 assert.equal(projectDeviceLease(row, deviceId, now + 30_000), null)
})
