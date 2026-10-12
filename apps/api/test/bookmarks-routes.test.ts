import test from 'node:test'
import assert from 'node:assert/strict'
import { BookmarksController } from '../src/bookmarks/bookmarks.controller.js'

test('bookmarks reject requests without owner authorization',async()=>{
  const c=new BookmarksController()
  await assert.rejects(()=>c.list(),/Unauthorized/)
  await assert.rejects(()=>c.create({url:'https://example.com',title:'test'}),/Unauthorized/)
  await assert.rejects(()=>c.get('11111111-1111-4111-8111-111111111111'),/Unauthorized/)
  await assert.rejects(()=>c.update('11111111-1111-4111-8111-111111111111',{}),/Unauthorized/)
  await assert.rejects(()=>c.remove('11111111-1111-4111-8111-111111111111'),/Unauthorized/)
})
