import test from 'node:test'
import assert from 'node:assert/strict'
import { runReadOnlyCommand } from '../src/system/cli-runner.js'

test('local read-only runner executes a fixed version command', async () => {
  const result = await runReadOnlyCommand('node-version')
  assert.equal(result.status, 'succeeded')
  assert.match(result.output, /^v\d+/)
  assert.equal(result.command, 'node-version')
})
test('local runner rejects unlisted commands before execution', async () => {
  await assert.rejects(runReadOnlyCommand('node --eval process.env'), /not allowed/)
})
