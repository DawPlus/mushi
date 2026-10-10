import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MetricBar } from '../src/components/common/metric-bar.tsx'
import { readFileSync } from 'node:fs'

test('MetricBar exposes meter semantics and chart token classes', () => {
  const html = renderToStaticMarkup(createElement(MetricBar, {
    label: 'CPU',
    valueLabel: '25.5%',
    percent: 25.5,
    tone: 2,
  }))
  assert.match(html, /role="meter"/)
  assert.match(html, /aria-valuenow="26"/)
  assert.match(html, /25\.5%/)
  assert.match(html, /bg-chart-2/)
})

test('chart tokens use brand and companion tones in both themes', () => {
  const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
  assert.match(styles, /--chart-1:\s*var\(--brand-skymint\)/)
  assert.match(styles, /--chart-2:\s*var\(--brand-violet\)/)
  assert.match(styles, /\.dark[\s\S]*--chart-1:\s*var\(--brand-skymint\)/)
})
