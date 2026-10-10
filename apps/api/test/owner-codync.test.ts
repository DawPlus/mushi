import assert from 'node:assert/strict'
import test from 'node:test'
import { UnauthorizedException } from '@nestjs/common'
import { OwnerCodyncController } from '../src/system/owner-codync.controller.js'

test('every Codync endpoint requires an owner token before host access', async () => {
  const controller = new OwnerCodyncController()
  for (const request of [
    () => controller.bots(),
    () => controller.history('bot-one'),
    () => controller.send('bot-one', { text: 'hello' }),
    () => controller.stop('bot-one'),
    () => controller.respond('entry-one', { optionId: 'allow' }),
  ]) {
    await assert.rejects(request(), UnauthorizedException)
  }
})
