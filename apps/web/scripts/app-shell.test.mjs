import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { menuRegistry } from '../src/features/system/menu-registry.ts'

const shell = readFileSync(new URL('../src/features/system/app-shell.tsx', import.meta.url), 'utf8')
const root = readFileSync(new URL('../src/routes/__root.tsx', import.meta.url), 'utf8')
const index = readFileSync(new URL('../src/routes/index.tsx', import.meta.url), 'utf8')

test('cloud navigation exposes Notes, not Mac-local tools', () => {
  assert.ok(menuRegistry.some(item => item.id === 'dashboard' && item.href === '/dashboard' && item.ready))
  assert.ok(menuRegistry.some(item => item.id === 'notes' && item.href === '/notes' && item.ready))
  assert.ok(!menuRegistry.some(item => ['monitor','bridge','terminal','projects','agents','automation'].includes(item.id)))
})

test('dashboard route and feature shell exist', () => {
  const route = readFileSync(new URL('../src/routes/dashboard.tsx', import.meta.url), 'utf8')
  const feature = readFileSync(new URL('../src/features/dashboard/Feature.tsx', import.meta.url), 'utf8')
  const iconCloud = readFileSync(new URL('../src/components/common/icon-cloud.tsx', import.meta.url), 'utf8')
  assert.match(route, /createFileRoute\('\/dashboard'\)/)
  assert.match(route, /features\/dashboard\/Feature/)
  assert.match(feature, /aria-label=["']대시보드["']/)
  assert.match(feature, /greeting\.title/)
  assert.match(feature, /AppIconCloud/)
  assert.match(feature, /AppNumberTicker/)
  assert.match(feature, /AppBorderBeam/)
  assert.match(feature, /AppTypingAnimation|AppShinyText/)
  assert.match(feature, /AppAuroraText/)
  assert.match(feature, /AppHyperText/)
  assert.match(feature, /AppWordRotate/)
  assert.match(feature, /\/asset\/koong\//)
  assert.match(feature, /createHomeGreeting/)
  assert.match(feature, /from ['"].*components\/common['"]/)
  assert.doesNotMatch(feature, /from ['"].*components\/ui/)
  assert.doesNotMatch(feature, /cdn\.simpleicons\.org/)
  assert.match(iconCloud, /IconCloud/)
  assert.match(iconCloud, /useReducedMotion/)
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
  assert.ok(shell.includes("to=\"/dashboard\""))
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

test('root path redirects into the dashboard after login', () => {
  assert.match(index, /Navigate/)
  assert.match(index, /to=["']\/dashboard["']/)
  assert.doesNotMatch(index, /BentoHome/)
})

test('notes list uses polished board cards and filters', () => {
  const notes = readFileSync(new URL('../src/features/notes/notes-pages.tsx', import.meta.url), 'utf8')
  assert.match(notes, /aria-label=["']게시판 \/ 메모["']/)
  assert.match(notes, /AppMagicCard/)
  assert.match(notes, /AppBlurFade/)
  assert.match(notes, /kindTone/)
  assert.match(notes, /from ['"].*components\/common['"]/)
  assert.doesNotMatch(notes, /from ['"].*components\/ui/)
})

test('note editor matches polished board shell', () => {
  const notes = readFileSync(new URL('../src/features/notes/notes-pages.tsx', import.meta.url), 'utf8')
  assert.match(notes, /aria-label=\{id \? '글 수정' : '새 글 작성'\}/)
  assert.match(notes, /Markdown 작성/)
  assert.match(notes, /미리보기/)
  assert.match(notes, /AppInput/)
  assert.match(notes, /sticky bottom-4/)
  assert.match(notes, /useEffect/)
})

test('status summary is a compact strip not a monitor clone', () => {
  const summary = readFileSync(new URL('../src/features/system/status-summary.tsx', import.meta.url), 'utf8')
  assert.match(summary, /현황 요약/)
  assert.match(summary, /StatPill|CPU/)
  assert.match(summary, /상세 보기/)
  assert.doesNotMatch(summary, /MetricBar|SegmentedBar|CpuAreaChart|AppMagicCard/)
})
