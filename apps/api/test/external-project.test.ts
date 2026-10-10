import test from 'node:test'
import assert from 'node:assert/strict'
import { validateExternalProject } from '../src/system/external-project.js'

test('external project contract accepts explicit HTTPS and loopback JS entries only', () => {
  assert.deepEqual(validateExternalProject({
    id: 'my-tool', label: '  My Tool  ', remoteEntry: 'https://example.com/assets/remoteEntry.js', enabled: false,
  }), { id: 'my-tool', label: 'My Tool', remoteEntry: 'https://example.com/assets/remoteEntry.js', enabled: false })
  assert.equal(validateExternalProject({ id: 'local-tool', label: 'Local', remoteEntry: 'http://127.0.0.1:5175/remoteEntry.js', enabled: true }).enabled, true)
  for (const remoteEntry of [
    'http://example.com/remoteEntry.js', 'file:///etc/passwd.js',
    'https://user:pass@example.com/entry.js', 'https://example.com/remoteEntry.js?token=x',
    'https://example.com/remoteEntry.js#fragment', 'http://192.168.0.5/remoteEntry.js',
  ]) assert.throws(() => validateExternalProject({ id: 'my-tool', label: 'X', remoteEntry, enabled: true }))
})

test('external project metadata must be explicitly validated, not loaded remotely', () => {
  assert.throws(() => validateExternalProject({ id: '../bad', label: 'X', remoteEntry: 'https://example.com/remoteEntry.js', enabled: true }))
  assert.throws(() => validateExternalProject({ id: 'my-tool', label: '', remoteEntry: 'https://example.com/remoteEntry.js', enabled: true }))
  assert.throws(() => validateExternalProject({ id: 'my-tool', label: 'X', remoteEntry: 'https://example.com/remoteEntry.js' }))
})

test('local project home URL accepted as metadata', () => {
  const project = validateExternalProject({ id: 'local-app', label: 'Local App', remoteEntry: 'http://127.0.0.1:3847/', enabled: false })
  assert.equal(project.remoteEntry, 'http://127.0.0.1:3847/')
})
