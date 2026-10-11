import test from 'node:test'
import assert from 'node:assert/strict'
import { isBlockedHostedRoute } from '../src/auth/hosted-route-policy.js'
import { NotesController, NoteCategoriesController } from '../src/notes/notes.controller.js'

test('hosted Notes routes remain unavailable unless explicitly enabled', () => {
  for (const [method, path] of [
    ['GET','/owner/notes'], ['POST','/owner/notes'],
    ['GET','/owner/notes/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
    ['PATCH','/owner/notes/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
    ['DELETE','/owner/notes/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
    ['GET','/owner/note-categories'],
    ['PATCH','/owner/note-categories/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
    ['DELETE','/owner/note-categories/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
  ]) {
    assert.equal(isBlockedHostedRoute(method, path, true), true, path)
    assert.equal(isBlockedHostedRoute(method, path, true, false, true), false, path)
  }
  assert.equal(isBlockedHostedRoute('POST', '/owner/notes/x/start', true, false, true), true)
  assert.equal(isBlockedHostedRoute('GET', '/owner/bridge', true, false, true), true)
  assert.equal(isBlockedHostedRoute('GET', '/owner/notes/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/more', true, false, true), true)
})

test('notes API denies anonymous access before repository operations', async () => {
  const notes = new NotesController()
  const categories = new NoteCategoriesController()
  await assert.rejects(() => notes.list(), /Unauthorized/)
  await assert.rejects(() => notes.create({ title:'x' }), /Unauthorized/)
  await assert.rejects(() => notes.get('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), /Unauthorized/)
  await assert.rejects(() => notes.remove('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), /Unauthorized/)
  await assert.rejects(() => categories.list(), /Unauthorized/)
})
