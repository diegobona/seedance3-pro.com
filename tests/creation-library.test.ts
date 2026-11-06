import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { createD1TestDatabase } from './helpers/d1-test-db'
import { createVideoGenerationTaskStore } from '../src/db/video-generation-tasks'
import { CREATION_RETENTION_MS, listCreations, findCreation, publicCreation, hideCreation, recordVideoCreation } from '../src/lib/creation-library'
import { saveGeneratedImages, maintainCreationLibrary, creationMediaResponse, safeCreationSource } from '../src/lib/creation-storage'

const now=Date.now(),png=new Uint8Array([137,80,78,71,13,10,26,10,1,2,3,4])
const mp4=new Uint8Array([0,0,0,24,102,116,121,112,105,115,111,109])
async function fixture() {
  const h=await createD1TestDatabase()
  for(const id of ['alice','bob','guest'])await h.db.prepare('INSERT INTO "user"(id,name,email,plan,credit_balance) VALUES(?,?,?,?,100)')
    .bind(id,id,`${id}@test.invalid`,id==='guest'?'guest':'paid').run()
  const store=createVideoGenerationTaskStore(h.db)
  async function video(user='alice',status='succeeded',created=now) {
    const result=(await store.reserveAndCreate(user,5,{workflowId:'test',duration:5,resolution:'1080p',aspectRatio:'16:9'}))!
    await h.db.prepare('UPDATE video_generation_task SET status=?,created_at=?,result_url=? WHERE id=?')
      .bind(status,created,status==='succeeded'?'https://media.example.test/result.mp4':null,result.task.id).run()
    return result.task.id
  }
  const files=new Map<string,{bytes:Uint8Array;type:string}>()
  const bucket={
    put:async(key:string,bytes:Uint8Array,options:{httpMetadata:{contentType:string}})=>{files.set(key,{bytes,type:options.httpMetadata.contentType})},
    delete:async(key:string)=>{files.delete(key)},
    list:async()=>({objects:[],truncated:false}),
    get:async(key:string,options?:{range?:Headers})=>{
      const file=files.get(key);if(!file)return null
      const range=options?.range?.get('range'),start=range?Number(/^bytes=(\d+)/.exec(range)?.[1]??0):0
      return {body:new Response(new Uint8Array(range?file.bytes.slice(start):file.bytes).buffer).body,size:file.bytes.length,
        httpMetadata:{contentType:file.type},...(range?{range:{offset:start,length:file.bytes.length-start}}:{})}
    },
  } as unknown as R2Bucket
  return {...h,video,files,bucket}
}

test('history isolates accounts, restores existing videos and pending tasks, and hides internal URLs',async()=>{
  const h=await fixture()
  try {
    const id=await h.video(),pending=await h.video('alice','running'),other=await h.video('bob'),guest=await h.video('guest')
    assert.equal((await listCreations(h.db,[])).items.length,0)
    const result=await listCreations(h.db,['alice'])
    assert.deepEqual(new Set(result.items.map(x=>x.id)),new Set([id,pending]))
    for(const inaccessible of [other,guest])assert.equal(await findCreation(h.db,['alice'],inaccessible),null)
    const exposed=publicCreation(result.items.find(x=>x.id===id)!)
    assert.equal(exposed.mediaUrl,`/api/creations/media?id=${id}`)
    assert.equal('source_url' in exposed,false);assert.equal('user_id' in exposed,false)
    assert.equal(publicCreation(result.items.find(x=>x.id===pending)!).mediaUrl,null)
  } finally {await h.dispose()}
})

test('keyset pagination and type filters remain stable; invalid cursors are rejected',async()=>{
  const h=await fixture()
  try {
    const rows=Array.from({length:29},(_,i)=>h.db.prepare(`INSERT INTO creation_asset(id,user_id,kind,source_url,created_at,expires_at) VALUES(?,'alice','image',?,?,?)`)
      .bind(crypto.randomUUID(),'https://media.example.test/a.png',now-i,now+CREATION_RETENTION_MS))
    await h.db.batch(rows);await h.video()
    const page=await listCreations(h.db,['alice'],'image')
    assert.equal(page.items.length,24);assert.ok(page.nextCursor)
    const next=await listCreations(h.db,['alice'],'image',page.nextCursor!)
    assert.equal(next.items.length,5);assert.equal(next.nextCursor,null)
    assert.equal(new Set([...page.items,...next.items].map(x=>x.id)).size,29)
    assert.equal((await listCreations(h.db,['alice'],'video')).items.length,1)
    await assert.rejects(listCreations(h.db,['alice'],'image',"0_' OR 1=1"),TypeError)
  } finally {await h.dispose()}
})

test('deleting only hides completed work; pending jobs and credit balances are preserved',async()=>{
  const h=await fixture()
  try {
    const id=await h.video(),queued=await h.video('alice','queued')
    const balance=await h.db.prepare('SELECT credit_balance FROM "user" WHERE id=\'alice\'').first()
    assert.equal(await hideCreation(h.db,(await findCreation(h.db,['alice'],queued))!),false)
    assert.equal(await hideCreation(h.db,(await findCreation(h.db,['alice'],id))!),true)
    assert.equal(await findCreation(h.db,['alice'],id),null)
    assert.equal((await listCreations(h.db,['alice'])).items.length,1)
    assert.deepEqual(await h.db.prepare('SELECT credit_balance FROM "user" WHERE id=\'alice\'').first(),balance)
  } finally {await h.dispose()}
})

test('images save with prompts, guests are excluded, and private downloads support seeking',async()=>{
  const h=await fixture()
  try {
    const image={dataUrl:`data:image/png;base64,${Buffer.from(png).toString('base64')}`}
    await saveGeneratedImages(h.db,h.bucket,[image],'alice',{prompt:'A local test image',model:'gpt-image'},now)
    await saveGeneratedImages(h.db,h.bucket,[image],'guest',{prompt:'Guest'},now)
    assert.equal((await listCreations(h.db,['guest'])).items.length,0)
    const row=(await listCreations(h.db,['alice'])).items[0]
    assert.equal(row.prompt,'A local test image');assert.equal(h.files.size,1)
    const result=await creationMediaResponse(new Request('https://test.invalid/api/creations/media?download=1',{headers:{range:'bytes=4-'}}),row,h.bucket,fetch,now)
    assert.equal(result.status,206);assert.equal(result.headers.get('content-range'),`bytes 4-${png.length-1}/${png.length}`)
    assert.match(result.headers.get('content-disposition')!,/attachment/)
    assert.equal(result.headers.get('cache-control'),'private, no-store')
    assert.deepEqual(new Uint8Array(await result.arrayBuffer()),png.slice(4))
    assert.equal((await creationMediaResponse(new Request('https://test.invalid/media'),row,h.bucket,fetch,now+CREATION_RETENTION_MS)).status,410)
    assert.equal(publicCreation(row,now+CREATION_RETENTION_MS).mediaUrl,null)
  } finally {await h.dispose()}
})

test('scheduled archival backfills account videos only, skips deleted work, and purges expired files',async()=>{
  const h=await fixture()
  try {
    const id=await h.video(),guest=await h.video('guest'),hidden=await h.video()
    await recordVideoCreation(h.db,id,'alice','Prompt retained','test',now)
    await hideCreation(h.db,(await findCreation(h.db,['alice'],hidden))!,now)
    let calls=0
    await maintainCreationLibrary({DB:h.db,VIDEO_REFERENCES:h.bucket},now,async()=>{calls++;return new Response(mp4,{headers:{'content-type':'video/mp4'}})})
    assert.equal(calls,1);assert.equal(h.files.size,1);assert.ok(h.files.has(`creations/${id}`))
    assert.equal(await h.db.prepare('SELECT id FROM creation_asset WHERE id=?').bind(guest).first(),null)
    assert.equal((await findCreation(h.db,['alice'],id))?.prompt,'Prompt retained')
    await maintainCreationLibrary({DB:h.db,VIDEO_REFERENCES:h.bucket},now+CREATION_RETENTION_MS+1,async()=>assert.fail('expired must not fetch'))
    assert.equal(h.files.size,0)
  } finally {await h.dispose()}
})

test('media proxy rejects non-HTTPS/private literal destinations and unsafe content',async()=>{
  for(const url of ['http://cdn.example.test/a','https://127.0.0.1/a','https://[::1]/a','https://host.internal/a','https://user:pass@cdn.example.test/a'])assert.equal(safeCreationSource(url),false)
  assert.equal(safeCreationSource('https://cdn.example.test/video.mp4'),true)
  const h=await fixture()
  try {
    const id=await h.video(),row=(await findCreation(h.db,['alice'],id))!
    const response=await creationMediaResponse(new Request('https://test.invalid/media'),row,h.bucket,async()=>new Response('<script>bad</script>',{headers:{'content-type':'text/html'}}),now)
    assert.equal(response.status,410)
  } finally {await h.dispose()}
})

test('access grants exactly the authenticated account, never guest cookies, device IDs, or query owners',async()=>{
  const source=await readFile(new URL('../src/lib/creation-access.ts',import.meta.url),'utf8')
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  for(const user of [null,{id:'alice'}]) {
    const exports={} as {creationAccess:(request:Request,env:unknown)=>Promise<{owners:string[];guest:boolean}>}
    runInNewContext(compiled,{exports,require:(name:string)=>name==='./auth'?{createAuth:()=>({api:{getSession:async()=>user?{user}:null}})}:{createAppDatabase:()=>({}),isD1Database:()=>true}})
    const access=await exports.creationAccess(new Request('https://test.invalid/api/creations?user=bob',{headers:{cookie:'guest=forged','x-device-id':'same','cf-connecting-ip':'1.1.1.1'}}),{})
    assert.equal(JSON.stringify(access.owners),JSON.stringify(user?['alice']:[]));assert.equal(access.guest,!user)
  }
})
