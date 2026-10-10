import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const route = readFileSync(new URL('../src/routes/monitor.tsx', import.meta.url), 'utf8')
const vite = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')

test('Monitor route is an internal owner-protected feature', () => {
  const root = readFileSync(new URL('../src/routes/__root.tsx', import.meta.url), 'utf8')
  assert.match(root, /<OwnerLogin><AppShell>/)
  assert.match(route, /features\/monitor\/Feature/)
  assert.doesNotMatch(route, /SampleRemote/)
})

test('Federation remains available for external repos, not built-in Monitor', () => {
  assert.match(vite, /federation\(/)
  assert.match(vite, /remotes: federationRemotes\(remotes\)/)
  assert.doesNotMatch(vite, /mushi_monitor|5174/)
})
