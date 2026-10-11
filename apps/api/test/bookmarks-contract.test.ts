import test from 'node:test'
import assert from 'node:assert/strict'
import { parseBookmark,parseBookmarkQuery } from '../src/bookmarks/bookmark-contract.js'
test('bookmark validation accepts safe HTTP URLs only',()=>{assert.equal(parseBookmark({url:'https://example.com',title:'Hello'}).url,'https://example.com/');for(const url of ['javascript:alert(1)','file:///etc/passwd','https://user:pass@example.com'])assert.throws(()=>parseBookmark({url,title:'Hello'}))})
test('bookmark validation limits input and rejects owner override',()=>{assert.throws(()=>parseBookmark({url:'https://example.com',title:'Hi',owner_id:'x'}));assert.throws(()=>parseBookmark({url:'https://example.com',title:' '}));assert.throws(()=>parseBookmarkQuery({limit:1000}))})
