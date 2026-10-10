import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveReadOnlyCommand } from '../src/system/cli-policy.js'
test('CLI policy permits only fixed read-only commands with resource limits', () => {
  assert.deepEqual(resolveReadOnlyCommand('node-version').args, ['--version'])
  assert.equal(resolveReadOnlyCommand('git-version').file, 'git')
  assert.equal(resolveReadOnlyCommand('node-version').timeoutMs, 3000)
  assert.throws(() => resolveReadOnlyCommand('node --eval process.env'), /not allowed/)
  assert.throws(() => resolveReadOnlyCommand('shell'), /not allowed/)
})
