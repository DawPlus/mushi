import test from 'node:test'
import assert from 'node:assert/strict'
import { NotesController, NoteCategoriesController } from '../src/notes/notes.controller.js'

test('notes API denies anonymous access before repository operations', async () => {
  const notes = new NotesController()
  const categories = new NoteCategoriesController()
  await assert.rejects(() => notes.list(), /Unauthorized/)
  await assert.rejects(() => notes.create({ title:'x' }), /Unauthorized/)
  await assert.rejects(() => notes.get('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), /Unauthorized/)
  await assert.rejects(() => notes.remove('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), /Unauthorized/)
  await assert.rejects(() => categories.list(), /Unauthorized/)
})
