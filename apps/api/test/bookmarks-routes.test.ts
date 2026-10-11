import test from 'node:test'
import assert from 'node:assert/strict'
import { BookmarksController } from '../src/bookmarks/bookmarks.controller.js'
import { isBlockedHostedRoute } from '../src/auth/hosted-route-policy.js'
test('bookmarks reject requests without owner authorization',async()=>{
 const c=new BookmarksController()
 await assert.rejects(()=>c.list(),/Unauthorized/)
 await assert.rejects(()=>c.create({url:'https://example.com',title:'test'}),/Unauthorized/)
 await assert.rejects(()=>c.get('11111111-1111-4111-8111-111111111111'),/Unauthorized/)
 await assert.rejects(()=>c.update('11111111-1111-4111-8111-111111111111',{}),/Unauthorized/)
 await assert.rejects(()=>c.remove('11111111-1111-4111-8111-111111111111'),/Unauthorized/)
})
test('bookmarks hosted routes require opt-in and do not enable unrelated routes',()=>{
 const id='11111111-1111-4111-8111-111111111111'
 for(const [method,path] of [['GET','/owner/bookmarks'],['POST','/owner/bookmarks'],['GET','/owner/bookmarks/'+id],['PATCH','/owner/bookmarks/'+id],['DELETE','/owner/bookmarks/'+id]]){
  assert.equal(isBlockedHostedRoute(method,path,true),true,path)
  assert.equal(isBlockedHostedRoute(method,path,true,false,false,true),false,path)
 }
 assert.equal(isBlockedHostedRoute('GET','/owner/bridge',true,false,false,true),true)
 assert.equal(isBlockedHostedRoute('POST','/owner/bookmarks/'+id,true,false,false,true),true)
})
