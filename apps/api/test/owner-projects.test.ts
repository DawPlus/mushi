import test from 'node:test'
import assert from 'node:assert/strict'
import { ExternalProjectRegistry } from '../src/system/external-project-registry.js'
import { OwnerProjectsController } from '../src/system/owner-projects.controller.js'

const alice = '11111111-1111-4111-8111-111111111111'
const bob = '22222222-2222-4222-8222-222222222222'
const input = { id: 'demo-app', label: 'Demo App', remoteEntry: 'https://example.com/remoteEntry.js', enabled: true }

test('project registration requires explicitly allowlisted origin, remains disabled and owner isolated', () => {
  const registry = new ExternalProjectRegistry()
  assert.throws(() => registry.register(alice, input, []), /Untrusted/)
  const saved = registry.register(alice, input, ['https://example.com'])
  assert.equal(saved.enabled, false)
  assert.equal(registry.list(alice).length, 1)
  assert.equal(registry.list(bob).length, 0)
  assert.equal(registry.remove(bob, 'demo-app'), false)
  assert.equal(registry.remove(alice, 'demo-app'), true)
  assert.equal(registry.list(alice).length, 0)
})

test('owner projects controller fails closed without verified bearer', async () => {
  const controller = new OwnerProjectsController()
  await assert.rejects(controller.list(undefined), { status: 401 })
  await assert.rejects(controller.register(input, undefined), { status: 401 })
  await assert.rejects(controller.remove('demo-app', undefined), { status: 401 })
})

test('local loopback app can be registered without an external origin allowlist', () => {
  const registry = new ExternalProjectRegistry()
  const result = registry.register(alice, { id: 'local-app', label: 'Local App', remoteEntry: 'http://127.0.0.1:3847/', enabled: true }, [])
  assert.equal(result.remoteEntry, 'http://127.0.0.1:3847/')
  assert.equal(result.enabled, false)
})
