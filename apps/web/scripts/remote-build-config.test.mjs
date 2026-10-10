import test from 'node:test'
import assert from 'node:assert/strict'
import { parseBuildRemotes, federationRemotes } from '../remote-build-config.ts'
const item = { id: 'calendar', label: 'Calendar', route: '/ext/calendar', entry: 'https://modules.example.com/calendar/remoteEntry.js', exposedModule: './Feature', contractVersion: 1 }
test('no approved remotes means disabled by default', () => assert.deepEqual(parseBuildRemotes(undefined, undefined), []))
test('trusted build-time remote becomes federation config', () => {
 const list = parseBuildRemotes(JSON.stringify([item]), 'https://modules.example.com')
 assert.deepEqual(federationRemotes(list), { calendar: { type: 'module', name: 'calendar', entry: item.entry } })
})
test('untrusted origins and user-provided URL are rejected at build time', () => {
 assert.throws(() => parseBuildRemotes(JSON.stringify([item]), 'https://other.example.com'))
 assert.throws(() => parseBuildRemotes(JSON.stringify([item]), undefined))
 assert.throws(() => parseBuildRemotes('{', 'https://modules.example.com'))
})
