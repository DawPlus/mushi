import 'reflect-metadata'
import assert from 'node:assert/strict'
import test from 'node:test'
import { UnauthorizedException } from '@nestjs/common'
import { OwnerController } from '../src/auth/owner.controller.js'

const controller = new OwnerController()
test('owner endpoint denies missing or malformed authorization', async () => {
  for (const header of [undefined, '', 'token', 'Basic abc', 'Bearer abc def']) {
    await assert.rejects(controller.owner(header), UnauthorizedException)
  }
})
test('owner endpoint rejects tokens when Supabase configuration is absent', async () => {
  await assert.rejects(controller.owner('Bearer abc'), UnauthorizedException)
})
