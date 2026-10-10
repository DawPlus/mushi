import assert from 'node:assert/strict'
import test from 'node:test'
import { preflightRemoteDeployments, validateRemoteManifest } from '../src/features/system/remote-compatibility.ts'
const origin = 'https://modules.example.com'
const item = { id: 'calendar', label: 'Calendar', route: '/ext/calendar', entry: origin + '/calendar/remoteEntry.js', exposedModule: './Feature', contractVersion: 1 }
const manifest = { id: 'calendar', contractVersion: 1, release: '1.2.3', reactMajor: 19, reactDomMajor: 19, entry: item.entry }

test('compatible manifest accepted', () => {
  assert.deepEqual(validateRemoteManifest(manifest, item), manifest)
})
test('incompatible versions, entries and React majors are rejected', () => {
  for (const change of [{ reactMajor: 18 }, { reactDomMajor: 18 }, { contractVersion: 2 },
    { entry: 'https://evil.example.com/remoteEntry.js' }, { id: 'other' }, { release: 'nightly' }]) {
    assert.throws(() => validateRemoteManifest({ ...manifest, ...change }, item))
  }
})
test('one broken remote cannot invalidate independent compatible registration', () => {
  const other = { ...item, id: 'notes', label: 'Notes', route: '/ext/notes', entry: origin + '/notes/remoteEntry.js' }
  const result = preflightRemoteDeployments([item, other], [origin], { calendar: manifest, notes: { ...manifest, id: 'notes', entry: other.entry, reactMajor: 18 } })
  assert.equal(result[0].compatible, true)
  assert.equal(result[1].compatible, false)
})
