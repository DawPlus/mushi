import 'reflect-metadata'
import test from 'node:test'
import assert from 'node:assert/strict'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module.js'


test('CLI owner API rejects malformed bodies before any staging and does not expose execution', async () => {
  const app = await NestFactory.create(AppModule, { logger: false })
  try {
    await app.listen(0, '127.0.0.1')
    const address = app.getHttpServer().address()
    assert.ok(address && typeof address !== 'string')
    const base = 'http://127.0.0.1:' + address.port
    for (const uri of ['/owner/cli-jobs/run', '/owner/cli-jobs/execute', '/owner/cli-jobs/dispatch']) {
      const response = await fetch(base + uri, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(3000) })
      assert.equal(response.status, 404, uri)
    }
    const noAccess = await fetch(base + '/owner/cli-jobs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ command: 'node-version', requestId: 'request_123456' }), signal: AbortSignal.timeout(3000) })
    assert.equal(noAccess.status, 401)
  } finally { await app.close() }
})

test('CLI owner API refuses unauthenticated requests over real loopback HTTP', async () => {
  const app = await NestFactory.create(AppModule, { logger: false })
  try {
    await app.listen(0, '127.0.0.1')
    const server = app.getHttpServer()
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    const base = 'http://127.0.0.1:' + address.port
    const cases = [
      ['GET', '/owner/cli-jobs'],
      ['GET', '/owner/cli-jobs/11111111-1111-4111-8111-111111111111'],
      ['POST', '/owner/cli-jobs'],
      ['POST', '/owner/cli-jobs/11111111-1111-4111-8111-111111111111/cancel'],
    ]
    for (const [method, path] of cases) {
      const response = await fetch(base + path, {
        method,
        ...(method === 'POST' ? { headers: { 'content-type': 'application/json' }, body: '{}' } : {}),
        signal: AbortSignal.timeout(3000),
      })
      assert.equal(response.status, 401, method + ' ' + path)
    }
    const invalid = await fetch(base + '/owner/cli-jobs', {
      headers: { authorization: 'Bearer invalid' },
      signal: AbortSignal.timeout(6000),
    })
    assert.equal(invalid.status, 401)
  } finally { await app.close() }
})
