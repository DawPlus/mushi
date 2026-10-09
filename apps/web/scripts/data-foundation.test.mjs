import assert from 'node:assert/strict'
import test from 'node:test'
import { QueryClient } from '@tanstack/react-query'
import { atom, createStore } from 'jotai'
import { createApiClient } from '../src/lib/api.ts'

test('Ky API client uses the configured base URL without a real network request', async () => {
  const api = createApiClient('http://localhost:3000/api')
  let requestedUrl
  const data = await api.get('health', {
    fetch(request) {
      requestedUrl = request.url
      return Promise.resolve(Response.json({ ok: true }))
    },
  }).json()
  assert.equal(requestedUrl, 'http://localhost:3000/api/health')
  assert.deepEqual(data, { ok: true })
})

test('TanStack Query keeps server data in its cache', () => {
  const client = new QueryClient()
  client.setQueryData(['health'], { ok: true })
  assert.deepEqual(client.getQueryData(['health']), { ok: true })
  client.clear()
})

test('Jotai manages local state independently', () => {
  const store = createStore()
  const count = atom(0)
  store.set(count, 2)
  assert.equal(store.get(count), 2)
})
