import test from 'node:test'
import assert from 'node:assert/strict'
import { loginLinkMessage, loginRedirectOrigin, oauthCallbackError } from '../src/features/system/owner-login-feedback.ts'

test('deployment URLs redirect magic links to the stable production domain', () => {
  assert.equal(loginRedirectOrigin('https://mushi-123.vercel.app', 'mushi-123.vercel.app'), 'https://mushi-wine.vercel.app/')
  assert.equal(loginRedirectOrigin('http://localhost:5173', 'localhost'), 'http://localhost:5173/')
  assert.equal(loginRedirectOrigin('http://127.0.0.1:5173', '127.0.0.1'), 'http://127.0.0.1:5173/')
  assert.equal(loginRedirectOrigin('http://localhost:5174', 'localhost'), 'http://localhost:5174/')
})

test('oauth errors do not reflect provider text', () => {
  assert.match(oauthCallbackError('?error=access_denied') ?? '', /취소/)
  assert.match(oauthCallbackError('?error=server_error&error_description=secret') ?? '', /로그인 처리에 실패/)
  assert.equal(oauthCallbackError('?code=abc'), null)
})

test('email rate limit is distinguished from other sign-in outcomes', () => {
  assert.match(loginLinkMessage({ status: 429 }), /요청 횟수를 초과/)
  assert.match(loginLinkMessage({ status: 400 }), /요청하지 못했습니다/)
  assert.match(loginLinkMessage(null), /메일함/)
})
