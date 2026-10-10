import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const componentsRoot = join(dirname(fileURLToPath(import.meta.url)), '../src/components')
const files = []

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const next = join(dir, entry.name)
    if (entry.isDirectory()) walk(next)
    else if (/\.(tsx|ts|css)$/.test(entry.name)) files.push(next)
  }
}
walk(componentsRoot)

test('common and ui components do not hardcode hex colors', () => {
  const offenders = []
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    const rel = file.slice(file.indexOf('/src/') + 1)
    for (const [index, line] of text.split('\n').entries()) {
      if (/^\s*(\/\/|\*)/.test(line)) continue
      if (/#[0-9A-Fa-f]{3,8}\b/.test(line)) offenders.push(`${rel}:${index + 1}:${line.trim()}`)
    }
  }
  assert.deepEqual(offenders, [])
})

test('button and input variants rely on semantic token classes', () => {
  const button = readFileSync(join(componentsRoot, 'ui/button.tsx'), 'utf8')
  const input = readFileSync(join(componentsRoot, 'ui/input.tsx'), 'utf8')
  for (const token of ['bg-primary', 'text-primary-foreground', 'bg-secondary', 'bg-destructive', 'border-input']) {
    assert.match(button + input, new RegExp(token))
  }
})

test('AppButton uses Magic UI RippleButton with shadcn variants', () => {
  const appButton = readFileSync(join(componentsRoot, 'common/app-button.tsx'), 'utf8')
  assert.match(appButton, /RippleButton/)
  assert.match(appButton, /buttonVariants/)
})
