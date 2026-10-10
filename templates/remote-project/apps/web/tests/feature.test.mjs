import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

test('remote feature exports a default screen entry', () => {
  const source = readFileSync(fileURLToPath(new URL('../src/Feature.tsx', import.meta.url)), 'utf8')
  assert.match(source, /export default function Feature/)
})
