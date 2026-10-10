import test from 'node:test'
import assert from 'node:assert/strict'
import { LocalJobQueue } from '../src/system/job-queue.js'

test('local queue tracks authorized jobs and keeps output minimal', async () => {
  const q = new LocalJobQueue(async command => ({ command, status: 'succeeded', output: 'v24.13.0' }))
  const pending = q.enqueue('node-version')
  assert.equal(pending.status, 'pending')
  const done = await q.processNext()
  assert.equal(done?.status, 'succeeded')
  assert.equal(done?.output, 'v24.13.0')
  assert.ok(done?.completedAt)
  assert.equal(q.list()[0].status, 'succeeded')
  assert.equal(await q.processNext(), null)
})

test('local queue rejects arbitrary commands and redacts unexpected output', async () => {
  const q = new LocalJobQueue(async command => ({ command, status: 'succeeded', output: 'secret=example' }))
  assert.throws(() => q.enqueue('node -e process.env'), /not allowed/)
  q.enqueue('node-version')
  assert.equal((await q.processNext())?.output, '출력 확인 불가')
})

test('local queue rejects overflow and avoids concurrent execution', async () => {
  let release!: () => void
  const q = new LocalJobQueue(async command => { await new Promise<void>(resolve => { release = resolve }); return { command, status: 'succeeded', output: 'v1' } })
  for (let i = 0; i < 20; i++) q.enqueue('node-version')
  assert.throws(() => q.enqueue('node-version'), /Queue full/)
  const running = q.processNext()
  assert.equal(await q.processNext(), null)
  release()
  await running
})
