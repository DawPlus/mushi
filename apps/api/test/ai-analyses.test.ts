import test from 'node:test'
import assert from 'node:assert/strict'
import { AiAnalysesController, validateAnalysis } from '../src/personal-mcp/ai-analyses.controller.js'
test('analysis input is bounded and source validated', () => {
  assert.deepEqual(validateAnalysis({ title: ' hello ', summary: ' result ' }), { title: 'hello', summary: 'result', source: 'general' })
  assert.throws(() => validateAnalysis({title:'',summary:'x'}))
  assert.throws(() => validateAnalysis({title:'ok',summary:'x',source:'unknown'}))
  assert.throws(() => validateAnalysis({title:'ok',summary:'x'.repeat(12001)}))
})
test('analysis REST requires owner session for both reading and writing', async () => {
  const controller = new AiAnalysesController()
  await assert.rejects(() => controller.list(undefined), /Unauthorized/i)
  await assert.rejects(() => controller.save(undefined, {title:'x',summary:'y'}), /Unauthorized/i)
})
