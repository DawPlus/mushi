import 'reflect-metadata'
import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import postgres from 'postgres'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module.js'

if (process.env.RUN_NOTES_HTTP_QA !== '1') throw new Error('RUN_NOTES_HTTP_QA=1 required')
const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
function value(k: string) {
  const v = env.match(new RegExp('^' + k + '=(.+)$', 'm'))?.[1]?.trim()?.replace(/^["']|["']$/g, '')
  if (!v) throw new Error('Missing ' + k)
  return v
}
const owner = value('SUPABASE_OWNER_USER_ID')
const token = randomBytes(36).toString('hex')
process.env.SUPABASE_OWNER_USER_ID = owner
process.env.MUSHI_LOCAL_SERVICE_TOKEN = token // transient QA credential; never stored
process.env.NOTES_DATABASE_URL = value('NOTES_DATABASE_URL')
process.env.VERCEL = '0'
const sql = postgres(process.env.NOTES_DATABASE_URL, { max: 1, prepare: false })
const app = await NestFactory.create(AppModule, { logger: false })
let noteId: string | undefined
let categoryId: string | undefined
try {
  await app.listen(0, '127.0.0.1')
  const address = app.getHttpServer().address()
  const base = 'http://127.0.0.1:' + address.port
  const request = async (path: string, method = 'GET', payload?: unknown, bearer = token) => {
    return fetch(base + path, {
      method,
      headers: { Authorization: 'Bearer ' + bearer, ...(payload===undefined?{}:{'Content-Type':'application/json'}) },
      ...(payload===undefined?{}:{body:JSON.stringify(payload)}),
    })
  }
  assert.equal((await fetch(base + '/owner/notes')).status, 401)
  assert.equal((await request('/owner/notes','GET',undefined,'wrong')).status,401)
  const categoryResponse = await request('/owner/note-categories','POST',{name:'qa-'+randomUUID()})
  assert.equal(categoryResponse.status,201)
  const category = await categoryResponse.json()
  categoryId = category.id
  const newNote = {title:'QA-'+randomUUID(),content:'test body',type:'memo',tags:['qa'],categoryId,isPinned:false}
  const created = await request('/owner/notes','POST',newNote)
  assert.equal(created.status,201)
  noteId = (await created.json()).id
  assert.equal((await request('/owner/notes/'+noteId)).status,200)
  assert.equal((await request('/owner/notes?type=memo&q=QA')).status,200)
  const updated = await request('/owner/notes/'+noteId,'PATCH',{...newNote,title:'QA Updated',content:'edited'})
  assert.equal(updated.status,200)
  assert.equal((await updated.json()).content,'edited')
  assert.equal((await request('/owner/notes/'+noteId,'DELETE')).status,204)
  assert.equal((await request('/owner/notes/'+noteId)).status,404)
  assert.equal((await request('/owner/note-categories/'+categoryId,'DELETE')).status,204)
  categoryId = undefined
  console.log('Notes HTTP QA passed: 401/201/200/204/404, owner auth, real DB CRUD')
} finally {
  if(noteId) await sql`DELETE FROM notes.notes WHERE id=${noteId} AND owner_id=${owner}`
  if(categoryId) await sql`DELETE FROM notes.note_categories WHERE id=${categoryId} AND owner_id=${owner}`
  await app.close()
  await sql.end()
}
