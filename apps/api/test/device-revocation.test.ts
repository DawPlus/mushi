import test from 'node:test'
import assert from 'node:assert/strict'
import { verifyDeviceBearer } from '../src/monitor/device-auth.js'

const deviceId = '11111111-1111-4111-8111-111111111111'
const ownerId = '22222222-2222-4222-8222-222222222222'
const current = 'a'.repeat(48)
const previous = 'b'.repeat(48)
const header = (secret: string) => 'Bearer ' + secret
const base = { deviceId, ownerId, token: current, previousToken: previous, previousTokenValidUntil: '2026-10-10T04:00:00.000Z' }
const now = Date.parse('2026-10-10T03:00:00.000Z')

test('current and unexpired previous device keys work only for configured device', () => {
  assert.deepEqual(verifyDeviceBearer(header(current), deviceId, base, now), { deviceId, ownerId })
  assert.deepEqual(verifyDeviceBearer(header(previous), deviceId, base, now), { deviceId, ownerId })
  assert.equal(verifyDeviceBearer(header(previous), deviceId, base, Date.parse('2026-10-10T04:00:00.000Z')), null)
  assert.equal(verifyDeviceBearer(header(current), ownerId, base, now), null)
  assert.equal(verifyDeviceBearer(header('c'.repeat(48)), deviceId, base, now), null)
})

test('explicit device revocation denies current and previous keys regardless of rotation grace', () => {
  const revoked = { ...base, revoked: 'true' }
  assert.equal(verifyDeviceBearer(header(current), deviceId, revoked, now), null)
  assert.equal(verifyDeviceBearer(header(previous), deviceId, revoked, now), null)
  assert.deepEqual(verifyDeviceBearer(header(current), deviceId, { ...base, revoked: 'false' }, now), { deviceId, ownerId })
})

test('missing current secret fails closed even during previous-token grace', () => {
  assert.equal(verifyDeviceBearer(header(previous), deviceId, { ...base, token: '' }, now), null)
})
