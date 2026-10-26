import assert from 'node:assert/strict'
import test from 'node:test'
import { createD1GenerationCreditStore } from '../src/db/d1-generation-credits'
import { createD1TestDatabase } from './helpers/d1-test-db'

test('all accounts receive daily five, spending free first with separate paid balance', async () => {
 const {db,dispose}=await createD1TestDatabase(); try {
 await db.prepare(`INSERT INTO "user" (id,name,email,plan,credit_balance) VALUES ('p','P','p@test','paid',500)`).run()
 const store=createD1GenerationCreditStore(db)
 assert.equal(await store.getBalance('p'),505)
 const r=await store.reserve('p',20,{unitCostMicros:30000}); assert.ok(r)
 assert.deepEqual(await store.getBreakdown!('p'),{remaining:485,dailyRemaining:0,paidRemaining:485,freeBudgetRemainingMicros:850000})
 } finally {await dispose()}
})
test('refunded retries retain supplier budget and explicit paid-only remains available', async () => {
 const {db,dispose}=await createD1TestDatabase(); try {
 await db.prepare(`INSERT INTO "user" (id,name,email,plan,credit_balance) VALUES ('p','P','p@test','paid',500)`).run()
 const store=createD1GenerationCreditStore(db)
 for (let i=0;i<3;i++) {
  const r=await store.reserve('p',5,{unitCostMicros:60000}); assert.ok(r); await store.refund(r.id)
 }
 assert.equal(await store.getBalance('p'),505)
 await assert.rejects(store.reserve('p',2,{unitCostMicros:60000}), e=>(e as {code:string}).code==='FREE_BUDGET_EXCEEDED')
 assert.ok(await store.reserve('p',2,{unitCostMicros:60000,paidOnly:true}))
 assert.deepEqual(await store.getBreakdown!('p'),{remaining:503,dailyRemaining:5,paidRemaining:498,freeBudgetRemainingMicros:100000})
 } finally {await dispose()}
})
test('partial settlement refunds paid portion first once without releasing supplier budget', async () => {
 const {db,dispose}=await createD1TestDatabase(); try {
 await db.prepare(`INSERT INTO "user" (id,name,email,plan,credit_balance) VALUES ('p','P','p@test','paid',50)`).run()
 const store=createD1GenerationCreditStore(db)
 const r=await store.reserve('p',20,{unitCostMicros:30000}); assert.ok(r)
 await Promise.all([store.settle(r.id,3),store.settle(r.id,3)])
 assert.deepEqual(await store.getBreakdown!('p'),{remaining:52,dailyRemaining:2,paidRemaining:50,freeBudgetRemainingMicros:850000})
 } finally {await dispose()}
})

test('free budget reservations serialize concurrent retries and billing holds block paid continuation',async()=>{
 const {db,dispose}=await createD1TestDatabase();try {
 await db.prepare(`INSERT INTO "user" (id,name,email,plan,credit_balance) VALUES ('p','P','p@test','paid',500)`).run()
 const store=createD1GenerationCreditStore(db)
 for (let i=0;i<3;i++) {
  const r=await store.reserve('p',5,{unitCostMicros:60000});assert.ok(r);await store.refund(r.id)
 }
 const attempts=await Promise.allSettled([store.reserve('p',1,{unitCostMicros:60000}),store.reserve('p',1,{unitCostMicros:60000})])
 assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1)
 assert.equal(attempts.filter(r=>r.status==='rejected').length,1)
 await db.prepare(`UPDATE "user" SET billing_hold=1 WHERE id='p'`).run()
 await assert.rejects(store.reserve('p',1,{paidOnly:true,unitCostMicros:30000}),e=>(e as {code:string}).code==='BILLING_HOLD')
 }finally{await dispose()}
})

test('migration converts existing guest image balance and pending refunds from five credits to one',async()=>{
 const {readFile,readdir}=await import('node:fs/promises')
 const {db,dispose}=await createD1TestDatabase({migrations:false});try {
 const directory=new URL('../migrations/d1/',import.meta.url)
 const apply=async(name:string)=>{for(const statement of (await readFile(new URL(name,directory),'utf8')).split(/^\s*--> statement-breakpoint\s*$/m)){if(statement.trim())await db.prepare(statement).run()}}
 for(const name of (await readdir(directory)).filter(n=>n.endsWith('.sql')&&n<'0005').sort())await apply(name)
 await db.prepare(`INSERT INTO "user" (id,name,email,plan,credit_balance) VALUES ('guest-image-old','G','g@test','guest',10)`).run()
 await db.prepare(`INSERT INTO guest_image_trial(id,user_id,network_hash) VALUES ('old','guest-image-old','legacy')`).run()
 await db.prepare(`INSERT INTO generation_credit_reservation(id,user_id,credits,daily_free_credits,daily_credit_date,status)
 VALUES ('legacy-res','guest-image-old',5,0,date('now','+8 hours'),'reserved')`).run()
 await apply('0005_credit_budget.sql')
 const store=createD1GenerationCreditStore(db)
 assert.equal(await store.getBalance('guest-image-old'),1)
 assert.deepEqual(await db.prepare(`SELECT credits,free_cost_micros FROM generation_credit_reservation WHERE id='legacy-res'`).first(),{credits:1,free_cost_micros:30000})
 assert.equal((await store.refund('legacy-res')).remainingCredits,2)
 }finally{await dispose()}
})
