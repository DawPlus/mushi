import test from 'node:test'
import assert from 'node:assert/strict'
import { createDurableJobStore } from '../src/system/durable-job-store.js'

const ownerId = '11111111-1111-4111-8111-111111111111'
const deviceId = '22222222-2222-4222-8222-222222222222'

test('durable repository rejects empty database configuration without connecting', () => {
  assert.throws(() => createDurableJobStore(''), /DATABASE_URL required/)
})
test('durable repository validates identity and all job inputs before database access', async () => {
  const store = createDurableJobStore('postgres://test:test@127.0.0.1:1/test')
  try {
    await assert.rejects(store.create({ ownerId: 'unknown', deviceId }, 'node-version', 'valid_request_123'), /Verified/)
    await assert.rejects(store.create({ ownerId, deviceId }, 'sh -c whoami', 'valid_request_123'), /not allowed/)
    await assert.rejects(store.create({ ownerId, deviceId }, 'node-version', 'x'), /request ID/)
    await assert.rejects(store.list({ ownerId, deviceId }, 1000), /Invalid limit/)
    await assert.rejects(store.get({ ownerId: 'unknown', deviceId }, ownerId), /Verified/)
    await assert.rejects(store.get({ ownerId, deviceId }, '../../etc/passwd'), /Invalid job ID/)
    await assert.rejects(store.cancel({ ownerId, deviceId }, '../../etc/passwd'), /Invalid job ID/)
    await assert.rejects(store.acknowledge({ ownerId, deviceId }, 'bad', 'bad', 'succeeded'), /Invalid ack/)
  } finally { await store.close() }
})
