import 'reflect-metadata'
import assert from 'node:assert/strict'
import test from 'node:test'
import { MODULE_METADATA } from '@nestjs/common/constants'
import { AppModule } from '../src/app.module.js'

test('hosted API does not register Mac, Bridge, command or Codync control routes', () => {
  const controllers = (Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, AppModule) ?? []) as Array<{ name: string }>
  const imports = (Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) ?? []) as Array<{ name: string }>
  const names = controllers.map(controller => controller.name)
  for (const name of ['MacAgentControlController', 'OwnerJobsController', 'OwnerCodyncController', 'OwnerBridgeController', 'BridgeController']) {
    assert.equal(names.includes(name), false, name)
  }
  assert.equal(imports.some(module => module.name === 'BridgeModule'), false)
  assert.equal(names.includes('OpportunitiesController'), true)
})
