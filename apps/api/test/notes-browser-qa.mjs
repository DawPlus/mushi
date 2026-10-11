import 'reflect-metadata'
import assert from 'node:assert/strict'
import { randomUUID, randomBytes } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import postgres from 'postgres'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module.js'

if (process.env.RUN_NOTES_BROWSER_QA !== '1') throw new Error('Explicit RUN_NOTES_BROWSER_QA=1 required')
const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
const webEnv = readFileSync(new URL('../../web/.env.local', import.meta.url), 'utf8')
const get = (source, key) => {
  const v = source.match(new RegExp('^' + key + '=(.+)$','m'))?.[1]?.trim()?.replace(/^["']|["']$/g,'')
  if (!v) throw new Error('Missing ' + key)
  return v
}
const owner = get(env,'SUPABASE_OWNER_USER_ID')
const secret = randomBytes(40).toString('hex')
const supabaseRef = new URL(get(webEnv,'VITE_SUPABASE_URL')).hostname.split('.')[0]
process.env.SUPABASE_OWNER_USER_ID = owner
process.env.MUSHI_LOCAL_SERVICE_TOKEN = secret
process.env.NOTES_DATABASE_URL = get(env,'NOTES_DATABASE_URL')
process.env.VERCEL = '0'
const sql = postgres(process.env.NOTES_DATABASE_URL,{max:1,prepare:false})
const app = await NestFactory.create(AppModule,{logger:false})
app.enableCors({origin:['http://localhost:5173']})
const chromeDir = mkdtempSync(join(tmpdir(),'mushi-notes-chrome-'))
let browser
let ws
let notesId
try {
  await app.listen(3000,'127.0.0.1')
  const webReady = await fetch('http://localhost:5173/').then(r=>r.ok).catch(()=>false)
  if(!webReady) throw new Error('Run pnpm dev:web first')
  browser = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    '--remote-debugging-port=0','--remote-allow-origins=*','--user-data-dir='+chromeDir,'about:blank'
  ],{stdio:['ignore','ignore','pipe']})
  let port
  for(let i=0;i<100;i++){
    if(existsSync(join(chromeDir,'DevToolsActivePort'))){
      port=Number(readFileSync(join(chromeDir,'DevToolsActivePort'),'utf8').split('\n')[0])
      break
    }
    await new Promise(r=>setTimeout(r,100))
  }
  if(!port) throw new Error('Chrome DevTools did not start')
  const tabs=await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json())
  const tab=tabs.find(t=>t.type==='page')
  if(!tab) throw new Error('No Chrome page')
  ws=new WebSocket(tab.webSocketDebuggerUrl)
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})})
  let next=0
  const pending=new Map()
  ws.addEventListener('message',e=>{
    const m=JSON.parse(e.data)
    if(!m.id || !pending.has(m.id))return
    const {resolve,reject}=pending.get(m.id)
    pending.delete(m.id)
    if(m.error)reject(Error(m.error.message));else resolve(m.result)
  })
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const id=++next
    pending.set(id,{resolve,reject})
    ws.send(JSON.stringify({id,method,params}))
  })
  const evalJs=async expression=>{
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})
    if(r.exceptionDetails)throw Error('Browser JS failure: '+r.exceptionDetails.text)
    return r.result?.value
  }
  const wait=async (expr,message)=>{
    for(let i=0;i<70;i++){
      if(await evalJs(expr))return
      await new Promise(r=>setTimeout(r,250))
    }
    throw Error('Timed out: '+message+'; current='+String(await evalJs('document.body.innerText.slice(0,500)')))
  }
  const click=async text=>{
    const action='Array.from(document.querySelectorAll("button,a")).find(el=>el.textContent.trim()==='+JSON.stringify(text)+')?.click();true'
    await evalJs(action)
  }
  const fill=async (selector,text)=>{
    const expression='(()=>{const el=document.querySelector('+JSON.stringify(selector)+');if(!el)return false;const p=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,"value").set.call(el,'+JSON.stringify(text)+');el.dispatchEvent(new Event("input",{bubbles:true}));return true})()'
    assert.equal(await evalJs(expression),true,'field: '+selector)
  }
  await send('Page.enable')
  await send('Runtime.enable')
  const session = {access_token:secret,token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+7200,expires_in:7200,refresh_token:'qa-session',user:{id:owner,aud:'authenticated',role:'authenticated',email:'qa@localhost.invalid',app_metadata:{},user_metadata:{}}}
  await send('Page.addScriptToEvaluateOnNewDocument',{source:'try{localStorage.setItem('+JSON.stringify('sb-'+supabaseRef+'-auth-token')+','+JSON.stringify(JSON.stringify(session))+')}catch(e){}'})
  await send('Page.navigate',{url:'http://localhost:5173/'})
  await wait('document.body?.innerText.includes("로컬로 바로 시작")','guest button')
  await click('로컬로 바로 시작')
  await wait('document.body?.innerText.includes("작업 공간")','guest home')
  await click('게시판 / 메모')
  await wait('document.body?.innerText.includes("새 글")','notes list')
  await click('+ 새 글')
  await wait('document.querySelector("input[placeholder=\\"제목을 입력해줘\\"]")!==null','new editor')
  const title='QA Browser '+randomUUID()
  await fill('input[placeholder="제목을 입력해줘"]',title)
  await fill('textarea','initial browser QA body')
  await click('저장')
  await wait('location.pathname.startsWith("/notes/") && !location.pathname.includes("/new") && document.body?.innerText.includes('+JSON.stringify(title)+')','created note details')
  const pathname=await evalJs('location.pathname')
  notesId=pathname.split('/').filter(Boolean).at(-1)
  assert.match(notesId,/^[0-9a-f-]{36}$/i)
  await click('수정')
  await wait('document.querySelector("textarea")!==null','edit form')
  await fill('textarea','modified browser QA body')
  await click('저장')
  await wait('document.body?.innerText.includes("modified browser QA body")','updated note details')
  await wait('Array.from(document.querySelectorAll("button")).some(x=>x.textContent.trim()==="삭제")','detail delete action')
  await click('삭제')
  await wait('document.querySelector("[data-slot=alert-dialog-action]")!==null','delete confirm')
  await evalJs('document.querySelector("[data-slot=alert-dialog-action]").click()')
  await wait('location.pathname.startsWith("/notes") && document.body?.innerText.includes("새 글")','returned to list')
  assert.equal((await sql`select deleted_at is not null as deleted from notes.notes where id=${notesId} and owner_id=${owner}`)[0]?.deleted,true)
  console.log('Browser E2E QA passed: actual Chrome create/edit/delete through Vite and Nest API with temporary machine token')
}finally{
  if(notesId)await sql`delete from notes.notes where id=${notesId} and owner_id=${owner}`
  await sql.end()
  if(ws)ws.close()
  if(browser)browser.kill('SIGTERM')
  await app.close()
  rmSync(chromeDir,{recursive:true,force:true})
}
