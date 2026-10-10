import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveServiceAction } from '../src/system/service-policy.js'
const services = [{ id: 'bridge', label: 'Onion Bridge', launchdLabel: 'com.local.onion-bridge' }]
test('only registered services and supported actions are accepted', () => {
  assert.equal(resolveServiceAction(services, 'bridge', 'restart').requiresConfirmation, true)
  assert.throws(() => resolveServiceAction(services, 'other', 'stop'), /not registered/)
  assert.throws(() => resolveServiceAction(services, 'bridge', 'delete'), /Unsupported/)
  assert.throws(() => resolveServiceAction([{ id: 'bad', label: 'Bad', launchdLabel: 'evil;rm' }], 'bad', 'start'), /not registered/)
})
