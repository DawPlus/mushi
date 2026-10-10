import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveWebOrigin } from '../src/auth/cors-origin.js'
test('development allows local web origin only', () => {
 assert.equal(resolveWebOrigin(undefined, false), 'http://localhost:5173')
 assert.equal(resolveWebOrigin('http://127.0.0.1:5173', false), 'http://127.0.0.1:5173')
})
test('production requires exact HTTPS origin', () => {
 assert.equal(resolveWebOrigin('https://mushi.example.com', true), 'https://mushi.example.com')
 for (const value of [undefined, 'http://localhost:5173', '*', 'https://mushi.example.com/path', 'https://mushi.example.com?x=1', 'https://user:pw@mushi.example.com']) {
  assert.throws(() => resolveWebOrigin(value, true))
 }
})
