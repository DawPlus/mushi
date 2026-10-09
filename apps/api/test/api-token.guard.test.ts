import 'reflect-metadata'
import assert from 'node:assert/strict'
import test from 'node:test'
import type { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ApiTokenGuard } from '../src/auth/api-token.guard.js'
import { Public } from '../src/auth/public.decorator.js'

function context(header?: string): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: header } }) }),
  } as unknown as ExecutionContext
}

test('protected routes fail closed without a configured token', () => {
  const previous = process.env.API_ACCESS_TOKEN
  delete process.env.API_ACCESS_TOKEN
  try {
    const guard = new ApiTokenGuard(new Reflector())
    assert.throws(() => guard.canActivate(context('Bearer any-token')), { status: 401 })
  } finally {
    if (previous === undefined) delete process.env.API_ACCESS_TOKEN
    else process.env.API_ACCESS_TOKEN = previous
  }
})

test('public metadata is required to bypass the guard', () => {
  class PublicController {
    @Public()
    health() {}
  }
  const ctx = {
    getHandler: () => PublicController.prototype.health,
    getClass: () => PublicController,
  } as unknown as ExecutionContext
  const guard = new ApiTokenGuard(new Reflector())
  assert.equal(guard.canActivate(ctx), true)
})
