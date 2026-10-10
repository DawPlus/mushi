import test from 'node:test'
import assert from 'node:assert/strict'
import { ownerHttpErrorMessage } from '../src/lib/owner-http-errors.ts'

test('owner HTTP 409 copy stays generic for Bridge and CLI conflicts', () => {
  assert.match(ownerHttpErrorMessage(409), /충돌|conflict/i)
  assert.doesNotMatch(ownerHttpErrorMessage(409), /요청 ID|명령/)
  assert.match(ownerHttpErrorMessage(401), /인증/)
  assert.match(ownerHttpErrorMessage(429), /요청이 많습니다/)
  assert.match(ownerHttpErrorMessage(500), /500/)
})
