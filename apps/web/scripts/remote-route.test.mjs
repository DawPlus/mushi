import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { remoteRoutesPlugin } from '../remote-routes-plugin.ts'
const item = { id: 'calendar', label: 'Calendar', route: '/ext/calendar', entry: 'https://modules.example.com/calendar/remoteEntry.js', exposedModule: './Feature', contractVersion: 1 }
test('generated loader uses only build-approved module specifiers', () => {
  const plugin = remoteRoutesPlugin([item])
  const code = plugin.load('\0virtual:mushi-remote-routes')
  assert.match(code, /import\("calendar\/Feature"\)/)
  assert.doesNotMatch(code, /import\(item\.|import\(url/)
})
test('external route is protected under owner root and catches failures', () => {
  const route = readFileSync(new URL('../src/routes/ext/$remoteId.tsx', import.meta.url), 'utf8')
  const root = readFileSync(new URL('../src/routes/__root.tsx', import.meta.url), 'utf8')
  assert.match(root, /<OwnerLogin><AppShell>/)
  assert.match(route, /RemoteBoundary/)
  assert.match(route, /registrations.find/)
  assert.match(route, /componentCache/)
  assert.match(route, /componentCache.delete\(registration!\.id\)/)
  assert.match(route, /onRetry=\{retry\}/)
  assert.match(route, /다시 시도/)
  assert.match(route, /Promise\.race\(\[importer\(\), timeout\]\)/)
  assert.match(route, /Remote load timeout/)
  assert.match(route, /setTimeout\(\(\) => setExpired\(true\), 8000\)/)
  assert.match(route, /if \(expired\) return <section/)
})
