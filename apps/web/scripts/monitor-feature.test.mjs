import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const feature = readFileSync(new URL('../src/features/monitor/Feature.tsx', import.meta.url), 'utf8')
const chart = readFileSync(new URL('../src/features/monitor/cpu-area-chart.tsx', import.meta.url), 'utf8')

test('monitor page keeps route labels and aria contracts', () => {
  assert.match(feature, /aria-label="Mac Monitor"/)
  assert.match(feature, /aria-label="Onion Bridge 상태"/)
  assert.match(feature, /aria-label="Mac 수집 지표"/)
  assert.match(feature, />Mac Monitor</)
  assert.match(feature, /온라인|오프라인|연결 불가|확인되지 않음/)
  assert.match(feature, /실시간 아님/)
})

test('monitor page uses command-center bento hierarchy', () => {
  assert.match(feature, /max-w-6xl/)
  assert.match(feature, /lg:grid-cols-12/)
  assert.match(feature, /lg:col-span-8/)
  assert.match(feature, /AppMagicCard/)
  assert.match(feature, /AppBorderBeam/)
  assert.match(feature, /CpuAreaChart/)
  assert.match(feature, /SegmentedBar/)
  assert.match(feature, /CpuIcon|MonitorCheckIcon|RadioTowerIcon/)
  assert.doesNotMatch(feature, /from '\.\.\/components\/ui/)
})

test('cpu area chart uses only real samples', () => {
  assert.match(chart, /Never invents|실측|samples/)
  assert.doesNotMatch(chart, /Math\.random|faker|fake/i)
})
