import test from 'node:test'
import assert from 'node:assert/strict'
import { LocalJobQueue } from '../src/system/job-queue.js'

test('pending jobs can be cancelled and are never run afterwards', async () => {
  let called = 0
  const queue = new LocalJobQueue(async command => { called++; return { command, status: 'succeeded', output: 'v24' } })
  const pending = queue.enqueue('node-version')
  assert.equal(queue.get(pending.id)?.status, 'pending')
  assert.equal(queue.cancel(pending.id)?.status, 'cancelled')
  assert.ok(queue.get(pending.id)?.completedAt)
  assert.equal(queue.cancel(pending.id), null)
  assert.equal(queue.get('missing'), null)
  assert.equal(await queue.processNext(), null)
  assert.equal(called, 0)
})

test('running jobs are not cancelled and finished results remain retrievable', async () => {
  let resolve!: () => void
  const queue = new LocalJobQueue(async command => {
    await new Promise<void>(done => { resolve = done })
    return { command, status: 'succeeded', output: 'v24.1.0' }
  })
  const job = queue.enqueue('node-version')
  const working = queue.processNext()
  assert.equal(queue.cancel(job.id), null)
  resolve()
  assert.equal((await working)?.status, 'succeeded')
  assert.equal(queue.get(job.id)?.status, 'succeeded')
})

test('job history is capped to 100 while pending jobs are retained', async () => {
  const queue = new LocalJobQueue(async command => ({ command, status: 'succeeded', output: 'v24' }))
  for (let i = 0; i < 105; i++) {
    queue.enqueue('node-version')
    await queue.processNext()
  }
  assert.equal(queue.list().length, 100)
  const ids = queue.list().map(job => job.id)
  assert.equal(new Set(ids).size, 100)
})
