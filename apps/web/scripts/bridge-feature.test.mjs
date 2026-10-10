import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { menuRegistry } from '../src/features/system/menu-registry.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const featurePath = join(root, 'src/features/bridge/Feature.tsx')
const routePath = join(root, 'src/routes/bridge.tsx')
const menuPath = join(root, 'src/features/system/menu-registry.ts')
const homePath = join(root, 'src/features/system/bento-home.tsx')
const confirmPath = join(root, 'src/components/common/confirm-dialog.tsx')
const commonIndexPath = join(root, 'src/components/common/index.ts')
const alertDialogPath = join(root, 'src/components/ui/alert-dialog.tsx')

test('menu enables Bridge as a ready /bridge destination without Onion wording', () => {
  const bridge = menuRegistry.find(item => item.id === 'bridge')
  assert.ok(bridge)
  assert.equal(bridge.label, 'Bridge')
  assert.equal(bridge.href, '/bridge')
  assert.equal(bridge.ready, true)
  const menuSource = readFileSync(menuPath, 'utf8')
  assert.doesNotMatch(menuSource, /Onion/)
})

test('bridge route and feature modules exist with shell patterns', () => {
  assert.equal(existsSync(routePath), true)
  assert.equal(existsSync(featurePath), true)
  const route = readFileSync(routePath, 'utf8')
  const feature = readFileSync(featurePath, 'utf8')
  assert.match(route, /createFileRoute\('\/bridge'\)/)
  assert.match(route, /features\/bridge\/Feature/)
  assert.match(feature, /ownerRequest|useQuery/)
  assert.match(feature, /@tanstack\/react-query/)
  assert.match(feature, /from ['"].*components\/common['"]/)
  assert.doesNotMatch(feature, /from ['"].*components\/ui/)
  assert.match(feature, /Onion Bridge/)
  assert.doesNotMatch(route, /Onion/)
})

test('bridge feature covers API states, confirmation dialog, and accessible status', () => {
  const feature = readFileSync(featurePath, 'utf8')
  assert.match(feature, /aria-label=["']Bridge["']/)
  assert.match(feature, /role=["']status["']|aria-live/)
  assert.match(feature, /owner\/bridge/)
  assert.match(feature, /owner\/bridge\/pick-workspace/)
  assert.match(feature, /owner\/bridge\/projects/)
  assert.match(feature, /owner\/bridge\/tunnel-action/)
  assert.match(feature, /owner\/bridge\/dev-action/)
  assert.match(feature, /owner\/bridge\/project-flag/)
  assert.match(feature, /role=["']dialog["']/)
  assert.match(feature, /workspace/)
  assert.match(feature, /AppConfirmDialog/)
  assert.match(feature, /idle|running|error/)
  assert.doesNotMatch(feature, /window\.confirm/)
  assert.doesNotMatch(feature, /MUSHI_BRIDGE_TOKEN|ONION_BRIDGE_TOKEN|realpath|\/Users\//i)
  assert.doesNotMatch(feature, /border-t border-border pt-3/)
})

test('bridge confirm uses common AlertDialog wrapper', () => {
  assert.equal(existsSync(alertDialogPath), true)
  assert.equal(existsSync(confirmPath), true)
  const commonIndex = readFileSync(commonIndexPath, 'utf8')
  const confirm = readFileSync(confirmPath, 'utf8')
  assert.match(commonIndex, /AppConfirmDialog/)
  assert.match(confirm, /AlertDialog/)
  assert.match(confirm, /from ['"].*ui\/alert-dialog['"]/)
})

test('bridge cards show pulse status, folder title, short path, and wider portal drawer', () => {
  const feature = readFileSync(featurePath, 'utf8')
  assert.match(feature, /StatusSwitch|role=["']switch["']/)
  assert.match(feature, /translate-x-3|aria-checked/)
  assert.match(feature, /animate-ping|motion-safe:animate-ping/)
  assert.match(feature, /detailProject\.id|\{p\.id\}/)
  assert.match(feature, /AppBlurFade/)
  assert.match(feature, /createPortal/)
  assert.match(feature, /max-w-2xl/)
  assert.match(feature, /md:grid-cols-2/)
  assert.match(feature, /tone === 'live'|활성 프로젝트/)
  assert.match(feature, /aria-expanded|detailPanel/)
  assert.match(feature, /AppAnimatedList|profilesOpen/)
  assert.match(feature, /z-\[60\]|z-60/)
  assert.doesNotMatch(feature, /AppBorderBeam/)
  assert.doesNotMatch(feature, /LinkTrack|bridge-flow/)
  assert.doesNotMatch(feature, /외부 Onion 실행 감지/)
  assert.doesNotMatch(feature, /external && p\.tunnel === 'running'/)
})

test('bridge settings use common AnimatedList wrapper for profiles', () => {
  const feature = readFileSync(featurePath, 'utf8')
  const commonIndex = readFileSync(commonIndexPath, 'utf8')
  assert.match(feature, /AppAnimatedList/)
  assert.match(commonIndex, /AppAnimatedList/)
  assert.doesNotMatch(feature, /from ['"].*AnimatedList['"]/)
  assert.doesNotMatch(feature, /from ['"].*react-bits-animated-list['"]/)
})

test('home bridge tile drops Onion wording when Bridge is enabled', () => {
  const home = readFileSync(homePath, 'utf8')
  assert.doesNotMatch(home, /Onion/)
  const bridgeModule = home.match(/bridge:\s*\{[^}]+\}/)
  assert.ok(bridgeModule, 'bridge module metadata present')
  assert.match(bridgeModule[0], /Bridge|워크스페이스|연결/)
  assert.match(bridgeModule[0], /kind:\s*'live'|kind:\s*"live"/)
})
