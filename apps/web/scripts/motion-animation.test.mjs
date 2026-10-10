import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const pageEnter = readFileSync(new URL('../src/components/common/page-enter.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const shell = readFileSync(new URL('../src/features/system/app-shell.tsx', import.meta.url), 'utf8')

test('motion dependency is installed in apps/web', () => {
  assert.ok(pkg.dependencies?.motion)
})

test('PageEnter respects reduced motion and wraps shell content', () => {
  assert.match(pageEnter, /useReducedMotion/)
  assert.match(pageEnter, /from 'motion\/react'/)
  assert.match(shell, /PageEnter/)
  assert.match(styles, /prefers-reduced-motion:\s*reduce/)
})
