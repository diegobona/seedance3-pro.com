import assert from 'node:assert/strict'
import test from 'node:test'
import { createD1TestDatabase } from './helpers/d1-test-db'
import { createD1GenerationCreditStore } from '../src/db/d1-generation-credits'
import { createGuestImageTrialStore } from '../src/db/guest-image-trials'
import { createGuestVideoTrialStore } from '../src/db/guest-video-trials'
import { resolveGuestImageTrial } from '../src/lib/guest-image-trial'
import { resolveGuestVideoTrial } from '../src/lib/guest-video-trial'
const secret='guest-reconciliation-test-secret-long-enough'
function req(cookie='') {return new Request('https://seedance3-pro.com/',{headers:{cookie,'cf-connecting-ip':'203.0.113.9'}})}
test('guest pending and successful usage merges once, retains cost and disables subsequent guest access', async()=>{
 const {db,dispose}=await createD1TestDatabase();try {
 const images=createGuestImageTrialStore(db),videos=createGuestVideoTrialStore(db),credits=createD1GenerationCreditStore(db)
 const image=(await resolveGuestImageTrial(req(),{store:images,secret,create:true}))!
 const video=(await resolveGuestVideoTrial(req(),{store:videos,secret,create:true}))!
 assert.equal(await images.getBalance(image.session.user.id),2)
 const a=await credits.reserve(image.session.user.id,1,{unitCostMicros:30000});assert.ok(a);await credits.settle(a.id)
 const b=await credits.reserve(video.session.user.id,10,{unitCostMicros:60000});assert.ok(b)
 await db.prepare(`INSERT INTO "user" (id,name,email) VALUES ('account','A','a@test')`).run()
 const {reconcileGuestCredits}=await import('../src/lib/guest-credit-reconciliation')
 const request=req(`${image.setCookie!.split(';')[0]}; ${video.setCookie!.split(';')[0]}`)
 await Promise.all([reconcileGuestCredits(request,'account',secret,db),reconcileGuestCredits(request,'account',secret,db)])
 assert.deepEqual(await credits.getBreakdown!('account'),{remaining:0,dailyRemaining:0,paidRemaining:0,freeBudgetRemainingMicros:370000})
 await credits.refund(b.id)
 assert.deepEqual(await credits.getBreakdown!('account'),{remaining:4,dailyRemaining:4,paidRemaining:0,freeBudgetRemainingMicros:370000})
 assert.equal(await credits.reserve(image.session.user.id,1,{unitCostMicros:30000}),null)
 await assert.rejects(resolveGuestImageTrial(request,{store:images,secret,create:true}),/already claimed/)
 await assert.rejects(resolveGuestVideoTrial(req(),{store:videos,secret,create:true}),/already claimed/)
 }finally{await dispose()}
})
test('signed-in network cannot claim either guest allowance after logout',async()=>{
 const {db,dispose}=await createD1TestDatabase();try {
 await db.prepare(`INSERT INTO "user" (id,name,email) VALUES ('account','A','a@test')`).run()
 const {reconcileGuestCredits}=await import('../src/lib/guest-credit-reconciliation')
 await reconcileGuestCredits(req(),'account',secret,db)
 await assert.rejects(resolveGuestImageTrial(req(),{store:createGuestImageTrialStore(db),secret,create:true}),/already claimed/)
 await assert.rejects(resolveGuestVideoTrial(req(),{store:createGuestVideoTrialStore(db),secret,create:true}),/already claimed/)
 }finally{await dispose()}
})

test('image and video guests on the same trusted network share the daily supplier-cost cap',async()=>{
 const {db,dispose}=await createD1TestDatabase();try {
 const image=(await resolveGuestImageTrial(req(),{store:createGuestImageTrialStore(db),secret,create:true}))!
 const video=(await resolveGuestVideoTrial(req(),{store:createGuestVideoTrialStore(db),secret,create:true}))!
 const credits=createD1GenerationCreditStore(db)
 const r=await credits.reserve(video.session.user.id,10,{unitCostMicros:60000});assert.ok(r);await credits.refund(r.id)
 const r2=await credits.reserve(video.session.user.id,6,{unitCostMicros:60000});assert.ok(r2);await credits.refund(r2.id)
 const r3=await credits.reserve(image.session.user.id,1,{unitCostMicros:30000});assert.ok(r3)
 await assert.rejects(credits.reserve(image.session.user.id,1,{unitCostMicros:30000}),e=>(e as {code:string}).code==='FREE_BUDGET_EXCEEDED')
 }finally{await dispose()}
})

test('reconciled pending video credits are protected from stale image reservation recovery',async()=>{
 const {db,dispose}=await createD1TestDatabase();try {
 const video=(await resolveGuestVideoTrial(req(),{store:createGuestVideoTrialStore(db),secret,create:true}))!
 const credits=createD1GenerationCreditStore(db)
 const r=await credits.reserve(video.session.user.id,6,{unitCostMicros:60000});assert.ok(r)
 await db.prepare(`INSERT INTO video_generation_task(id,user_id,reservation_id,workflow_id,duration,resolution,aspect_ratio,status)
 VALUES ('v',?,?,'minimax-h3',6,'768p','16:9','queued')`).bind(video.session.user.id,r.id).run()
 await db.prepare(`INSERT INTO "user" (id,name,email) VALUES ('account','A','a@test')`).run()
 const {reconcileGuestCredits}=await import('../src/lib/guest-credit-reconciliation')
 await reconcileGuestCredits(req(video.setCookie!.split(';')[0]),'account',secret,db)
 await db.prepare(`UPDATE generation_credit_reservation SET created_at=?`).bind(Date.now()-20*60_000).run()
 const next=await credits.reserve('account',1,{unitCostMicros:30000});assert.equal(next,null)
 assert.equal(await credits.getBalance('account'),0)
 }finally{await dispose()}
})
