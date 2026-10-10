import test from 'node:test'
import assert from 'node:assert/strict'
import { Reflector } from '@nestjs/core'
import { HeartbeatController } from '../src/monitor/heartbeat.controller.js'
import { OwnerHeartbeatController } from '../src/monitor/owner-heartbeat.controller.js'
import { IS_PUBLIC_KEY } from '../src/auth/public.decorator.js'
import { verifyDeviceBearer } from '../src/monitor/device-auth.js'
import { verifyOwnerBearer } from '../src/monitor/owner-auth.js'

test('merged monitor controllers use their own restricted authentication', () => {
  const reflector = new Reflector()
  for (const controller of [HeartbeatController, OwnerHeartbeatController]) {
    assert.equal(reflector.get(IS_PUBLIC_KEY, controller), true)
  }
  assert.equal(verifyDeviceBearer(undefined, 'invalid', {}), null)
})

test('merged owner authorization fails closed without a Supabase session', async () => {
  assert.equal(await verifyOwnerBearer(undefined, {}), null)
})
