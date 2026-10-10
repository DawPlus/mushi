import test from 'node:test'
import assert from 'node:assert/strict'
import { createHomeGreeting, homeGreetingBankSize } from '../src/features/system/home-greetings.ts'

test('home greeting uses 무시 and local combinatorial banks', () => {
  assert.ok(homeGreetingBankSize > 1000)
  const greeting = createHomeGreeting(() => 0.1, new Date('2026-10-10T22:00:00'))
  assert.match(greeting.title, /무시/)
  assert.doesNotMatch(greeting.title, /Mushi/)
  assert.equal(greeting.dayPart, 'night')
  assert.ok(greeting.body.length > 10)
})

test('home greeting day parts follow local clock buckets', () => {
  assert.equal(createHomeGreeting(() => 0, new Date('2026-10-10T09:00:00')).dayPart, 'morning')
  assert.equal(createHomeGreeting(() => 0, new Date('2026-10-10T14:00:00')).dayPart, 'afternoon')
  assert.equal(createHomeGreeting(() => 0, new Date('2026-10-10T19:00:00')).dayPart, 'evening')
  assert.equal(createHomeGreeting(() => 0, new Date('2026-10-10T23:00:00')).dayPart, 'night')
})
