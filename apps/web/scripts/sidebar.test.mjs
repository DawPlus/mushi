import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const shell = readFileSync(new URL('../src/features/system/app-shell.tsx', import.meta.url), 'utf8')
const themeToggle = readFileSync(new URL('../src/components/common/theme-toggle.tsx', import.meta.url), 'utf8')

test('shell is a top-bar layout with responsive page padding', () => {
  assert.match(shell, /sticky top-0/)
  assert.match(shell, /max-w-6xl/)
  assert.match(shell, /p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10/)
  assert.doesNotMatch(shell, /SIDEBAR_WIDTH_PX|mushi-sidebar-open|aria-controls="app-sidebar"/)
})

test('ThemeToggle wraps Magic UI AnimatedThemeToggler with mushi theme storage', () => {
  assert.match(themeToggle, /AnimatedThemeToggler/)
  assert.match(themeToggle, /writeStoredTheme/)
  assert.match(themeToggle, /from '\.\.\/ui\/animated-theme-toggler'/)
})
