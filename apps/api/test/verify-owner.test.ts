import assert from 'node:assert/strict'
import test from 'node:test'
import { verifyOwnerAccessToken } from '../src/auth/verify-owner.js'

const config = { url: 'https://example.supabase.co', publishableKey: 'public-key', ownerUserId: 'owner-uuid' }

test('accepts only an owner verified by Supabase Auth', async () => {
  const calls: string[] = []
  const request = (async (input: URL, init: RequestInit) => {
    calls.push(input.toString())
    assert.equal(init.headers && (init.headers as Record<string, string>).authorization, 'Bearer access-token')
    return new Response(JSON.stringify({ id: 'owner-uuid' }), { status: 200 })
  }) as typeof fetch
  assert.deepEqual(await verifyOwnerAccessToken('access-token', config, request), { id: 'owner-uuid' })
  assert.deepEqual(calls, ['https://example.supabase.co/auth/v1/user'])
})

test('rejects other users and invalid tokens', async () => {
  const other = (async () => new Response(JSON.stringify({ id: 'another-user' }), { status: 200 })) as typeof fetch
  const unauthenticated = (async () => new Response('Unauthorized', { status: 401 })) as typeof fetch
  assert.equal(await verifyOwnerAccessToken('access-token', config, other), null)
  assert.equal(await verifyOwnerAccessToken('bad-token', config, unauthenticated), null)
})

test('fails closed on missing configuration, invalid origin and network failure', async () => {
  const unreachable = (async () => { throw Error('network unavailable') }) as typeof fetch
  assert.equal(await verifyOwnerAccessToken('access-token', { ...config, ownerUserId: '' }, unreachable), null)
  assert.equal(await verifyOwnerAccessToken('access-token', { ...config, url: 'http://example.com' }, unreachable), null)
  assert.equal(await verifyOwnerAccessToken('access-token', config, unreachable), null)
})
