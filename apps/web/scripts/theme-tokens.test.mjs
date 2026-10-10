import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolveTheme, nextTheme, THEME_STORAGE_KEY, applyTheme } from '../src/lib/theme.ts'

const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

const BRAND_HEX = /--brand-(midnight|surface|skymint|violet|ink|graphite)\s*:/

test('only brand CSS variables may declare hex color literals', () => {
  const offenders = []
  for (const [index, line] of styles.split('\n').entries()) {
    if (!/#[0-9A-Fa-f]{3,8}\b/.test(line)) continue
    if (BRAND_HEX.test(line)) continue
    offenders.push(`${index + 1}:${line.trim()}`)
  }
  assert.deepEqual(offenders, [])
  assert.match(styles, /--brand-skymint\s*:\s*#B8F7E4\b/i)
  assert.match(styles, /--brand-violet\s*:\s*#7C83FF\b/i)
  assert.match(styles, /--brand-midnight\s*:\s*#15171B\b/i)
  assert.match(styles, /--brand-surface\s*:\s*#202329\b/i)
  assert.match(styles, /--brand-ink\s*:\s*#F2F4F8\b/i)
})

test('semantic tokens reference brand variables', () => {
  for (const token of ['--background', '--foreground', '--primary', '--accent', '--sidebar', '--chart-1', '--success', '--warning', '--info']) {
    assert.match(styles, new RegExp(`${token}\\s*:`))
  }
  assert.match(styles, /var\(--brand-skymint\)/)
  assert.match(styles, /var\(--brand-violet\)/)
  assert.match(styles, /var\(--brand-midnight\)/)
  assert.match(styles, /\.dark\s*\{/)
})

test('resolveTheme prefers stored mode then system preference', () => {
  assert.equal(resolveTheme('dark', false), 'dark')
  assert.equal(resolveTheme('light', true), 'light')
  assert.equal(resolveTheme(null, true), 'dark')
  assert.equal(resolveTheme('nope', false), 'light')
})

test('nextTheme and applyTheme toggle document dark class', () => {
  assert.equal(nextTheme('light'), 'dark')
  assert.equal(nextTheme('dark'), 'light')
  const classes = new Set()
  const root = {
    classList: {
      toggle(name, force) {
        if (force) classes.add(name)
        else classes.delete(name)
      },
    },
  }
  applyTheme('dark', root)
  assert.ok(classes.has('dark'))
  applyTheme('light', root)
  assert.ok(!classes.has('dark'))
  assert.equal(THEME_STORAGE_KEY, 'mushi-theme')
})

test('index.html applies stored theme before paint', () => {
  assert.match(indexHtml, /mushi-theme/)
  assert.match(indexHtml, /classList\.add\(['"]dark['"]\)/)
  assert.match(indexHtml, /localStorage\.getItem/)
})
