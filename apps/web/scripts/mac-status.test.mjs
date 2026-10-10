import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MacStatus } from '../src/features/system/mac-status.tsx'

const render = props => renderToStaticMarkup(createElement(MacStatus, props))
test('Mac mini dashboard shows safe empty and failure states', () => {
  assert.match(render({ state: 'empty' }), /아직 수집된 상태가 없습니다/)
  assert.match(render({ state: 'loading' }), /불러오는 중/)
  assert.match(render({ state: 'error' }), /확인할 수 없습니다/)
})
test('Mac mini dashboard shows units and collection timestamp', () => {
  const html = render({ state: 'ready', snapshot: {
    recordedAt: '2026-10-09T00:00:00Z', cpuPercent: 25.5, cpuCores: 10,
    memoryUsedBytes: 12 * 1024 ** 3, memoryTotalBytes: 24 * 1024 ** 3,
    diskUsedBytes: 100 * 1024 ** 3, diskTotalBytes: 256 * 1024 ** 3,
    uptimeSeconds: 90000, processCount: 123,
  } })
  for (const value of ['25.5%', '10코어', '12.0 GiB', '24.0 GiB', '100.0 GiB', '1일 1시간', '123개', '마지막 수집']) assert.ok(html.includes(value), value)
})
