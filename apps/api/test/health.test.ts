import 'reflect-metadata'
import assert from 'node:assert/strict'
import test from 'node:test'
import { HealthController } from '../src/health.controller.js'

test('health endpoint controller returns an observable OK payload', () => {
  assert.deepEqual(new HealthController().health(), { status: 'ok' })
})
