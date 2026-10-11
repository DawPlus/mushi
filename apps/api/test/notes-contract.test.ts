import test from 'node:test'
import assert from 'node:assert/strict'
import { checkedOwner, parseNoteInput, parseNoteListQuery } from '../src/notes/note-contract.js'
import { createNotesRepository } from '../src/notes/notes.repository.js'

const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const valid = { title: ' Hello ', content: 'memo', type: 'memo', tags: ['React', 'react'], isPinned: false }

test('rejects missing owner identity before any SQL', async () => {
  const store = createNotesRepository('postgres://invalid:invalid@127.0.0.1:1/invalid')
  await assert.rejects(() => store.list('wrong'), /owner/)
  await assert.rejects(() => store.get('wrong', owner), /owner/)
  await store.close()
})

test('requires well-formed owner and bounded content', () => {
  assert.equal(checkedOwner(owner), owner)
  assert.throws(() => checkedOwner(''), /owner/)
  assert.throws(() => parseNoteInput({ ...valid, ownerId: owner }), /Unexpected/)
  assert.throws(() => parseNoteInput({ ...valid, title: ' ' }), /title/)
  assert.throws(() => parseNoteInput({ ...valid, type: 'admin' }), /type/)
  assert.throws(() => parseNoteInput({ ...valid, tags: [''] }), /tags/)
  const note = parseNoteInput(valid)
  assert.equal(note.title, 'Hello')
  assert.deepEqual(note.tags, ['react'])
})

test('rejects unbounded and invalid list pagination', () => {
  assert.deepEqual(parseNoteListQuery({ page: '2', limit: '5', q: ' hello ' }), { page: 2, limit: 5, q: 'hello', type: undefined, categoryId: undefined })
  assert.throws(() => parseNoteListQuery({ limit: '1000' }), /paging/)
  assert.throws(() => parseNoteListQuery({ type: 'unknown' }), /type/)
})
