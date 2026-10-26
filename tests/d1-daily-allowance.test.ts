import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'
import { createD1GenerationCreditStore } from '../src/db/d1-generation-credits'
import { createD1TestDatabase } from './helpers/d1-test-db'

test('registered accounts can spend five shared daily credits on images and video', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    const store = createD1GenerationCreditStore(db)
    for (const id of ['images', 'video', 'mixed']) {
      await db.prepare('INSERT INTO "user" (id,name,email) VALUES (?,?,?)').bind(id,id,`${id}@test`).run()
      assert.equal((await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind(id).first<{credit_balance:number}>())!.credit_balance, 5)
      assert.equal(await store.getBalance(id), 5)
    }
    for (let i = 0; i < 5; i++) {
      const image = await store.reserve('images',1,{unitCostMicros:30_000})
      assert.ok(image)
      await store.settle(image.id)
    }
    assert.equal(await store.reserve('images',1,{unitCostMicros:30_000}),null)
    assert.equal(await store.reserve('video',15,{unitCostMicros:60_000}),null)
    assert.equal(await store.reserve('video',10,{unitCostMicros:60_000}),null)
    assert.ok(await store.reserve('video',5,{unitCostMicros:60_000}))
    assert.equal(await store.reserve('video',5,{unitCostMicros:60_000}),null)
    assert.ok(await store.reserve('mixed',3,{unitCostMicros:30_000}))
    assert.ok(await store.reserve('mixed',2,{unitCostMicros:30_000}))
    assert.equal(await store.reserve('mixed',1,{unitCostMicros:30_000}),null)
  } finally { await dispose() }
})

test('five-credit migration accounts for today’s usage, preserves paid credits and leaves guests unchanged', async () => {
  const { db, dispose } = await createD1TestDatabase({migrations:false})
  try {
    const directory = new URL('../migrations/d1/',import.meta.url)
    const names = (await readdir(directory)).filter(name=>name.endsWith('.sql')).sort()
    const apply = async (name:string) => {
      for (const statement of (await readFile(new URL(name,directory),'utf8')).split(/^\s*--> statement-breakpoint\s*$/m)) {
        if (statement.trim()) await db.prepare(statement).run()
      }
    }
    for (const name of names.filter(name=>name<'0009')) await apply(name)
    for (const [id,plan,balance,daily] of [
      ['fresh','free',10,10], ['used','free',7,7], ['exhausted','free',3,3],
      ['paid','paid',508,8], ['guest','guest',10,0],
    ] as const) {
      await db.prepare(`INSERT INTO "user" (id,name,email,plan,credit_balance,daily_free_credits,daily_credit_date)
        VALUES (?,?,?,?,?,?,date('now','+8 hours'))`).bind(id,id,`${id}@test`,plan,balance,daily).run()
    }
    for (const name of names.filter(name=>name>='0009')) await apply(name)
    const store = createD1GenerationCreditStore(db)
    for (const [id,balance,daily,paid] of [
      ['fresh',5,5,0], ['used',2,2,0], ['exhausted',0,0,0],
      ['paid',503,3,500], ['guest',10,0,10],
    ] as const) {
      assert.equal(await store.getBalance(id),balance)
      const breakdown = await store.getBreakdown!(id)
      assert.equal(breakdown.dailyRemaining,daily)
      assert.equal(breakdown.paidRemaining,paid)
    }
    assert.equal(await store.getBalance('fresh'),5)
    assert.ok(await store.reserve('fresh',5,{unitCostMicros:60_000}))
    assert.equal(await store.reserve('fresh',1,{unitCostMicros:30_000}),null)
  } finally { await dispose() }
})

test('next-day renewal and refunds keep the five-credit daily cap and purchased balance', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    await db.prepare(`INSERT INTO "user" (id,name,email,plan,credit_balance,daily_free_credits,daily_credit_date)
      VALUES ('renew','Renew','renew@test','paid',502,2,date('now','+8 hours','-1 day'))`).run()
    const store = createD1GenerationCreditStore(db)
    assert.equal(await store.getBalance('renew'),505)
    const reservation = await store.reserve('renew',7,{unitCostMicros:30_000})
    assert.ok(reservation)
    assert.equal((await store.refund(reservation.id)).remainingCredits,505)
    assert.equal((await store.refund(reservation.id)).remainingCredits,505)
    const partial = await store.reserve('renew',7,{unitCostMicros:30_000})
    assert.ok(partial)
    await store.settle(partial.id,3)
    assert.equal((await store.getBreakdown!('renew')).dailyRemaining,2)
    assert.equal((await store.getBreakdown!('renew')).paidRemaining,500)
  } finally { await dispose() }
})
