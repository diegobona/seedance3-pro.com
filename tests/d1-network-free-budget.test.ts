import assert from 'node:assert/strict'
import test from 'node:test'
import { createD1TestDatabase } from './helpers/d1-test-db'
import { createD1GenerationCreditStore } from '../src/db/d1-generation-credits'
import { createD1VideoGenerationTaskStore } from '../src/db/d1-video-generation-tasks'
import { protectImageGeneration } from '../src/lib/protected-image-generation'
import { protectVideoGenerationStart } from '../src/lib/protected-video-generation'
import { guestVideoNetworkHash } from '../src/lib/guest-video-trial'

const network = 'a'.repeat(64), other = 'b'.repeat(64)
const exceeded = (e: unknown) => (e as {code:string}).code === 'NETWORK_FREE_BUDGET_EXCEEDED'
async function account(db: D1Database, id: string, guest = false) {
  await db.prepare(`INSERT INTO "user"(id,name,email,plan,credit_balance) VALUES (?,?,?, ?,?)`)
    .bind(id,id,`${id}@test`,guest ? 'guest' : 'paid',guest ? 10 : 100).run()
}

test('concurrent different accounts share exactly ten free credits and rejected videos create no task', async () => {
 const {db,dispose}=await createD1TestDatabase();try {
  const store=createD1VideoGenerationTaskStore(db,network)
  for(let i=0;i<6;i++) await account(db,`u${i}`)
  const results=await Promise.allSettled(Array.from({length:6},(_,i)=>store.reserveAndCreate(`u${i}`,5,
    {workflowId:'test',duration:5,resolution:'768p',aspectRatio:'16:9'})))
  assert.equal(results.filter(r=>r.status==='fulfilled' && r.value).length,2)
  assert.equal(results.filter(r=>r.status==='rejected' && exceeded(r.reason)).length,4)
  assert.equal((await db.prepare('SELECT count(*) AS n FROM video_generation_task').first<{n:number}>())!.n,2)
  assert.equal((await db.prepare('SELECT sum(network_free_credits) AS n FROM generation_credit_reservation').first<{n:number}>())!.n,10)
 }finally{await dispose()}
})

test('guest images, guest videos and registered accounts share one pool, with paid continuation',async()=>{
 const {db,dispose}=await createD1TestDatabase();try {
  for(const id of ['gi','gv']) await account(db,id,true)
  await account(db,'registered')
  const store=createD1GenerationCreditStore(db,network)
  assert.ok(await store.reserve('gi',2,{unitCostMicros:30000}))
  assert.ok(await store.reserve('gv',5))
  await assert.rejects(store.reserve('registered',5),exceeded)
  assert.equal(await store.getBalance('registered'),105)
  const paid=await store.reserve('registered',20,{paidOnly:true});assert.ok(paid)
  assert.equal((await store.getBreakdown!('registered')).dailyRemaining,5)
  const mixed=await store.reserve('registered',8) // Five free + three paid would exceed the network.
    .then(()=>assert.fail('must not silently switch to paid'),e=>assert.ok(exceeded(e)))
  assert.equal(mixed,undefined)
  assert.ok(await store.reserve('registered',3))
  await assert.rejects(store.reserve('registered',1),exceeded)
 }finally{await dispose()}
})

test('refunds and partial image delivery release only unused network credits, idempotently',async()=>{
 const {db,dispose}=await createD1TestDatabase();try {
  for(const id of ['a','b','c'])await account(db,id)
  const store=createD1GenerationCreditStore(db,network)
  const a=await store.reserve('a',5),b=await store.reserve('b',5);assert.ok(a&&b)
  await assert.rejects(store.reserve('c',1),exceeded)
  await Promise.all([store.refund(a.id),store.refund(a.id)])
  await Promise.all([store.settle(b.id,2),store.settle(b.id,2)])
  assert.ok(await store.reserve('c',5))
  assert.ok(await store.reserve('a',3))
  await assert.rejects(store.reserve('a',1),exceeded)
 }finally{await dispose()}
})

test('network snapshot survives account IP changes; prior Beijing days do not count',async()=>{
 const {db,dispose}=await createD1TestDatabase();try {
  for(const id of ['a','b','c','d'])await account(db,id)
  const one=createD1GenerationCreditStore(db,network),two=createD1GenerationCreditStore(db,other)
  const a=await one.reserve('a',5),b=await one.reserve('b',5);assert.ok(a&&b)
  assert.ok(await two.reserve('c',5))
  await assert.rejects(one.reserve('d',5),exceeded)
  await db.prepare(`UPDATE generation_credit_reservation SET daily_credit_date=date('now','+8 hours','-1 day') WHERE id=?`).bind(a.id).run()
  assert.ok(await one.reserve('d',5))
  assert.equal((await db.prepare('SELECT free_network_hash AS h FROM generation_credit_reservation WHERE id=?').bind(a.id).first<{h:string}>())!.h,network)
 }finally{await dispose()}
})

test('network rejection prevents both image and video supplier calls',async()=>{
 const {db,dispose}=await createD1TestDatabase();try {
  for(const id of ['a','b','c'])await account(db,id)
  const store=createD1GenerationCreditStore(db,network)
  await store.reserve('a',5);await store.reserve('b',5)
  const request=new Request('https://seedance3-pro.com/api/images/generate',{method:'POST'})
  const getSession=async()=>({user:{id:'c'}})
  const image=await protectImageGeneration({request,getSession,creditStore:store,
    generate:async()=>assert.fail('image provider must not run')})
  assert.equal(image.status,402);assert.equal((await image.json() as {code:string}).code,'NETWORK_FREE_BUDGET_EXCEEDED')
  const video=await protectVideoGenerationStart({request,getSession,taskStore:createD1VideoGenerationTaskStore(db,network),
    preflight:async()=>({ok:true,payload:{prompt:'test',duration:5,resolution:'768p',aspectRatio:'16:9'}}),
    submit:async()=>assert.fail('video provider must not run')})
  assert.equal(video.status,402);assert.equal((await video.json() as {code:string}).code,'NETWORK_FREE_BUDGET_EXCEEDED')
 }finally{await dispose()}
})

test('only the trusted edge IP determines the request key; browser hints cannot choose a budget',async()=>{
 const secret='s'.repeat(32),url='https://seedance3-pro.com/api/images/generate'
 const hash=(headers:Record<string,string>)=>guestVideoNetworkHash(new Request(url,{headers}),secret,'daily-free-network')
 assert.equal(await hash({'cf-connecting-ip':'203.0.113.1'}),await hash({'cf-connecting-ip':'203.0.113.1','x-forwarded-for':'203.0.113.2','x-seedance-device':'spoof'}))
 assert.notEqual(await hash({'cf-connecting-ip':'203.0.113.1'}),await hash({'cf-connecting-ip':'203.0.113.2'}))
 await assert.rejects(hash({'x-forwarded-for':'203.0.113.1'}))
})
