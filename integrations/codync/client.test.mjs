import test from 'node:test';
import assert from 'node:assert/strict';
import { createCodyncClient } from './client.mjs';

test('health is accessible without credentials', async () => {
  const requests = [];
  const client = createCodyncClient({ fetchImpl: async (url, options) => { requests.push([url, options]); return new Response(JSON.stringify({ ok: true }), { status: 200 }); } });
  assert.deepEqual(await client.health(), { ok: true });
  assert.equal(requests[0][0], 'http://127.0.0.1:19222/health');
  assert.equal(requests[0][1].headers?.Authorization, undefined);
});

test('authenticated methods use POST and preserve response', async () => {
  const requests = [];
  const client = createCodyncClient({ token: 'local-secret', fetchImpl: async (url, options) => { requests.push([url, options]); return new Response(JSON.stringify({ entries: [] }), { status: 200 }); } });
  assert.deepEqual(await client.history('bot-1', 5), { entries: [] });
  assert.equal(requests[0][0], 'http://127.0.0.1:19222/api/history');
  assert.equal(requests[0][1].headers.Authorization, 'Bearer local-secret');
  assert.deepEqual(JSON.parse(requests[0][1].body), { botId: 'bot-1', limit: 5 });
});

test('bots reads roster using the authenticated sync contract', async () => {
  const requests = [];
  const client = createCodyncClient({ token: 'local-secret', fetchImpl: async (url, options) => {
    requests.push([url, options]);
    return new Response(JSON.stringify({ rev: 7, bots: [{ id: 'one' }], entries: [] }), { status: 200 });
  } });
  assert.deepEqual(await client.bots(), [{ id: 'one' }]);
  assert.equal(requests[0][0], 'http://127.0.0.1:19222/api/sync');
  assert.deepEqual(JSON.parse(requests[0][1].body), { since: 0 });
});

test('bots rejects malformed roster responses', async () => {
  const client = createCodyncClient({ token: 'local-secret', fetchImpl: async () => new Response('{}', { status: 200 }) });
  await assert.rejects(client.bots(), /Invalid Codync sync response/);
});

test('requires a token for protected calls and never includes it in errors', async () => {
  const client = createCodyncClient({ fetchImpl: async () => { throw Error('should not call'); } });
  await assert.rejects(client.history('bot-1'), /token required/);
  const denied = createCodyncClient({ token: 'my-secret', fetchImpl: async () => new Response('denied with my-secret', { status: 401 }) });
  await assert.rejects(denied.history('bot-1'), (error) => error.message === 'Codync request failed (401)');
});

test('rejects non-loopback endpoints and invalid methods', async () => {
  assert.throws(() => createCodyncClient({ baseUrl: 'https://example.com' }), /loopback/);
  const client = createCodyncClient({ token: 'x', fetchImpl: async () => { throw Error('unexpected'); } });
  await assert.rejects(client.call('../health'), /invalid method/);
});
