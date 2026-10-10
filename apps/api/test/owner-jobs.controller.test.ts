import test from 'node:test'
import assert from 'node:assert/strict'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY } from '../src/auth/public.decorator.js'
import { OwnerJobsController } from '../src/system/owner-jobs.controller.js'

test('owner CLI jobs endpoints fail closed without verified authorization', async () => {
  const controller = new OwnerJobsController()
  await assert.rejects(controller.list(undefined), { status: 401 })
  await assert.rejects(controller.create({ command: 'node-version', requestId: 'request_12345' }, undefined), { status: 401 })
  await assert.rejects(controller.get('nonexistent', 'Bearer invalid'), { status: 401 })
  await assert.rejects(controller.cancel('nonexistent', undefined), { status: 401 })
})

test('public Nest bypass is paired with explicit owner verification', () => {
  const reflector = new Reflector()
  assert.equal(reflector.get(IS_PUBLIC_KEY, OwnerJobsController), true)
})
