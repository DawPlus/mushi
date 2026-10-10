import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { menuRegistry } from '../src/features/system/menu-registry.ts'

const shell = readFileSync(new URL('../src/features/system/app-shell.tsx', import.meta.url), 'utf8')
const root = readFileSync(new URL('../src/routes/__root.tsx', import.meta.url), 'utf8')
const home = readFileSync(new URL('../src/features/system/bento-home.tsx', import.meta.url), 'utf8')
const index = readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8')

test('menu registry keeps ready labels for bento tiles', () => {
  for (const label of ['대시보드', 'Mac Monitor', 'Bridge', '원격 CLI', 'Projects', 'OpenHarness', '자동화 (n8n)']) {
    assert.ok(menuRegistry.some(item => item.label === label && item.ready), label)
  }
  assert.ok(!menuRegistry.some(item => /Onion/i.test(item.label)))
})

test('owner auth and shell persist above routed content', () => {
  assert.ok(root.includes('<OwnerLogin><AppShell><Outlet /></AppShell></OwnerLogin>'))
})

test('shell uses top header hub without sidebar', () => {
  assert.ok(shell.includes('ThemeToggle'))
  assert.ok(shell.includes('LogoutIcon'))
  assert.ok(shell.includes('aria-label="로그아웃"'))
  assert.ok(shell.includes('PageEnter'))
  assert.ok(shell.includes('AppAnimatedGrid'))
  assert.ok(shell.includes('fullscreen'))
  assert.ok(shell.includes("to=\"/\""))
  assert.ok(!shell.includes('motion.aside'))
  assert.ok(!shell.includes('app-sidebar'))
  assert.ok(shell.includes("from '../../components/common'"))
})

test('owner login does not render a second logout header bar', () => {
  const login = readFileSync(new URL('../src/features/system/owner-login.tsx', import.meta.url), 'utf8')
  assert.ok(login.includes('OwnerAuthProvider'))
  assert.ok(!login.includes('>로그아웃<'))
})

test('login page uses command-center card shell', () => {
  const login = readFileSync(new URL('../src/features/system/owner-login.tsx', import.meta.url), 'utf8')
  const typing = readFileSync(new URL('../src/components/common/typing-animation.tsx', import.meta.url), 'utf8')
  assert.match(login, /AppAnimatedGrid/)
  assert.match(login, /AppMagicCard/)
  assert.match(login, /AppTypingAnimation/)
  assert.match(login, /소유자 이메일/)
  assert.match(login, /로그인 링크 받기/)
  assert.match(login, /\/asset\/login-mushi\.jpg/)
  assert.match(login, /무시\(Mushi\)/)
  assert.match(login, /당일 회식은 사양합니다/)
  assert.match(login, /예\? 그걸 제가요\?/)
  assert.match(login, /loop/)
  assert.match(login, /max-w-lg/)
  assert.match(login, /rotate-45|말풍|aria-live/)
  assert.match(login, /sm:h-80|h-80/)
  assert.doesNotMatch(login, /brand-midnight|radial-gradient\(ellipse_at_center/)
  assert.match(typing, /TypingAnimation/)
  assert.match(typing, /useReducedMotion/)
  assert.match(login, /font-mushi/)
})

test('login display font uses Jua via theme token', () => {
  const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
  assert.match(styles, /@fontsource\/jua/)
  assert.match(styles, /--font-mushi/)
  assert.match(styles, /Jua/)
})

test('shell backdrop uses Magic UI Flickering Grid via common wrapper', () => {
  const grid = readFileSync(new URL('../src/components/common/animated-grid.tsx', import.meta.url), 'utf8')
  assert.match(grid, /FlickeringGrid/)
  assert.match(grid, /--brand-skymint/)
  assert.match(grid, /useReducedMotion/)
  assert.match(grid, /fullscreen/)
})

test('home route renders bento launcher from menu registry', () => {
  assert.match(index, /BentoHome/)
  assert.match(home, /menuRegistry/)
  assert.match(home, /Mac Monitor|monitor/)
  assert.match(home, /예정/)
  assert.match(home, /StatusSummary/)
  assert.match(home, /Command Center/)
  assert.match(home, /\/asset\/images\.jpg/)
  assert.match(home, /createHomeGreeting|greeting\.title/)
  assert.match(home, /alt=["']무시["']/)
  assert.doesNotMatch(home, /좋은 밤이야, Mushi/)
  assert.doesNotMatch(home, /LiveMacStatus|AppMagicCard|AppBorderBeam/)
})

test('status summary is a compact strip not a monitor clone', () => {
  const summary = readFileSync(new URL('../src/features/system/status-summary.tsx', import.meta.url), 'utf8')
  assert.match(summary, /현황 요약/)
  assert.match(summary, /StatPill|CPU/)
  assert.match(summary, /상세 보기/)
  assert.doesNotMatch(summary, /MetricBar|SegmentedBar|CpuAreaChart|AppMagicCard/)
})
