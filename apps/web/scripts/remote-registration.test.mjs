import test from 'node:test'
import assert from 'node:assert/strict'
import { validateRemoteRegistry, validateRemoteRegistration } from '../src/features/system/remote-registration.ts'

const allowed = ['https://modules.example.com']
const valid = {
  id: 'calendar', label: 'Calendar', route: '/ext/calendar',
  entry: 'https://modules.example.com/calendar/remoteEntry.js',
  exposedModule: './Feature', contractVersion: 1,
}
test('accepts explicit HTTPS origin and v1 module contract', () => {
  assert.deepEqual(validateRemoteRegistration(valid, allowed), valid)
})
test('rejects remote redirects to an untrusted host and dangerous URLs', () => {
  for (const entry of ['http://modules.example.com/remoteEntry.js',
    'https://evil.example.com/remoteEntry.js', 'https://modules.example.com@evil.example.com/remoteEntry.js',
    'https://modules.example.com/remoteEntry.js?token=secret',
    'https://modules.example.com/remoteEntry.js#fragment']) {
    assert.throws(() => validateRemoteRegistration({ ...valid, entry }, allowed))
  }
})
test('rejects route spoofing, incompatible contract and duplicate IDs', () => {
  assert.throws(() => validateRemoteRegistration({ ...valid, route: '/monitor' }, allowed))
  assert.throws(() => validateRemoteRegistration({ ...valid, contractVersion: 2 }, allowed))
  assert.throws(() => validateRemoteRegistry([valid, valid], allowed))
})
