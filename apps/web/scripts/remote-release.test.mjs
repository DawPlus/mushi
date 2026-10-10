import test from 'node:test'
import assert from 'node:assert/strict'
import { selectRemoteRelease } from '../src/features/system/remote-release.ts'
const entry = 'https://approved.example.com/calendar/remoteEntry.js'
const registration = { id: 'calendar', label: 'Calendar', route: '/ext/calendar', entry, exposedModule: './Feature', contractVersion: 1 }
const valid = { id: 'calendar', entry, contractVersion: 1, release: '1.2.0', reactMajor: 19, reactDomMajor: 19 }
test('selects approved current release', () => {
  assert.equal(selectRemoteRelease(registration, valid, null).status, 'current')
})
test('falls back only to compatible pinned release', () => {
  assert.equal(selectRemoteRelease(registration, { ...valid, reactMajor: 18 }, { ...valid, release: '1.1.9' }).status, 'rollback')
  assert.equal(selectRemoteRelease(registration, { ...valid, reactMajor: 18 }, { ...valid, entry: 'https://evil.test/remoteEntry.js' }).status, 'unavailable')
})
test('remains unavailable when both release candidates are invalid', () => {
  assert.deepEqual(selectRemoteRelease(registration, null, null), { status: 'unavailable', manifest: null })
})
