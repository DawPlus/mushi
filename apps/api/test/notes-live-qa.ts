import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { createNotesRepository } from '../src/notes/notes.repository.js'

if (process.env.RUN_NOTES_DB_QA !== '1') throw new Error('Set RUN_NOTES_DB_QA=1 for isolated live DB QA')
const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
function required(name: string): string {
  const value = env.match(new RegExp('^' + name + '=(.+)$', 'm'))?.[1]?.trim()?.replace(/^["']|["']$/g, '')
  if (!value) throw new Error(name + ' not configured')
  return value
}
const url = required('NOTES_DATABASE_URL') // Exercise the same least-privilege role as runtime.
const owner = required('SUPABASE_OWNER_USER_ID')
const stranger = randomUUID()
const sql = postgres(url, { max: 1, prepare: false })
const repo = createNotesRepository(url)
let noteId: string | null = null
let categoryId: string | null = null
try {
  const category = await repo.createCategory(owner, 'qa-' + randomUUID())
  categoryId = category.id
  const note = await repo.create(owner, { title: 'QA ' + randomUUID(), content: 'initial body', type: 'memo', categoryId, isPinned: true, tags: ['qa'] })
  noteId = note.id
  assert.equal(note.categoryId, categoryId)
  assert.deepEqual((await repo.get(owner, noteId))?.tags, ['qa'])
  assert.equal(await repo.get(stranger, noteId), null)
  assert.equal(await repo.update(stranger, noteId, { title:'intrusion', content:'bad', type:'memo', categoryId:null, tags:[], isPinned:false }), null)
  assert.equal((await repo.list(owner, { q: note.title })).items.some(n => n.id === noteId), true)
  assert.equal((await repo.list(stranger)).items.some(n => n.id === noteId), false)
  const modified = await repo.update(owner, noteId, { title: 'QA edited', content: 'updated', type: 'dev', categoryId, tags: ['test'], isPinned:false })
  assert.equal(modified?.type, 'dev')
  assert.equal((await repo.get(owner,noteId))?.content, 'updated')
  assert.equal(await repo.remove(owner,noteId), true)
  assert.equal(await repo.get(owner,noteId), null)
  assert.equal(await repo.remove(owner,noteId), false)
  console.log('Notes live repository QA passed: category/create/read/search/update/owner isolation/soft-delete')
} finally {
  if (noteId) {
    await sql`DELETE FROM notes.notes WHERE id=${noteId} AND owner_id=${owner}`
  }
  if (categoryId) {
    await sql`DELETE FROM notes.note_categories WHERE id=${categoryId} AND owner_id=${owner}`
  }
  await repo.close()
  await sql.end()
}
