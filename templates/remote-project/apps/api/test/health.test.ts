import test from 'node:test'
import assert from 'node:assert/strict'
import { healthStatus } from '../src/health.js'

test('health endpoint response contract', () => {
  assert.deepEqual(healthStatus(), { status: 'ok' })
})
