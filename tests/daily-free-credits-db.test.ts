import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { config } from 'dotenv'
import { eq, sql } from 'drizzle-orm'
import { createDb } from '../src/db'
import { createGenerationCreditStore } from '../src/db/generation-credits'
import { createVideoGenerationTaskStore } from '../src/db/video-generation-tasks'
import { creditDay } from '../src/db/daily-credit-sql'
import { generationCreditReservation, user } from '../src/db/schema'

config({ path: ['.env.local', '.env'], quiet: true })
const databaseUrl = process.env.DATABASE_URL

test('an existing free account receives 15 daily credits only once', { skip: !databaseUrl }, async () => {
  const db = createDb(databaseUrl!)
  const id = `daily-credit-test-${randomUUID()}`
  await db.insert(user).values({ id, name: 'Daily Credit Test', email: `${id}@example.test`, creditBalance: 0 })
  try {
    const store = createGenerationCreditStore(db)
    assert.equal(await store.getBalance(id), 15)
    const reserved = await store.reserve(id, 5)
    assert.ok(reserved)
    await store.settle(reserved.id)
    assert.equal(await store.getBalance(id), 10)
    assert.deepEqual(await Promise.all([store.getBalance(id), store.getBalance(id)]), [10, 10])
  } finally {
    await db.delete(user).where(eq(user.id, id))
  }
})

async function withAccount(balance: number, callback: (db: ReturnType<typeof createDb>, id: string) => Promise<void>, plan = 'free') {
  const db = createDb(databaseUrl!)
  const id = `daily-credit-test-${randomUUID()}`
  await db.insert(user).values({ id, name: 'Daily Credit Test', email: `${id}@example.test`, creditBalance: balance, plan })
  try { await callback(db, id) } finally { await db.delete(user).where(eq(user.id, id)) }
}

test('unused credits expire the next day while existing extra credits survive', { skip: !databaseUrl }, async () => {
  await withAccount(60, async (db, id) => {
    const store = createGenerationCreditStore(db)
    assert.equal(await store.getBalance(id), 60)
    const reservation = await store.reserve(id, 5)
    assert.ok(reservation)
    await store.settle(reservation.id)
    assert.equal(await store.getBalance(id), 55)
    await db.update(user).set({ dailyCreditDate: sql`${creditDay} - 1` }).where(eq(user.id, id))
    assert.equal(await store.getBalance(id), 60)
    assert.equal(await store.getBalance(id), 60)
    const [account] = await db.select().from(user).where(eq(user.id, id))
    assert.equal(account.dailyFreeCredits, 15)
  })
})

test('paid accounts do not receive daily free credits', { skip: !databaseUrl }, async () => {
  await withAccount(30, async (db, id) => {
    const store = createGenerationCreditStore(db)
    assert.equal(await store.getBalance(id), 30)
    await db.update(user).set({ dailyCreditDate: sql`${creditDay} - 1` }).where(eq(user.id, id))
    assert.equal(await store.getBalance(id), 30)
  }, 'paid')
})

const videoMetadata = { workflowId: 'minimax_h3_lightx2v_no_pic', duration: 5, resolution: '480p', aspectRatio: '16:9' }

test('concurrent image and video requests share one 15-credit daily limit', { skip: !databaseUrl }, async () => {
  await withAccount(0, async (db, id) => {
    const images = createGenerationCreditStore(db)
    const videos = createVideoGenerationTaskStore(db)
    const requests = await Promise.all([
      images.reserve(id, 5), videos.reserveAndCreate(id, 5, videoMetadata),
      images.reserve(id, 5), videos.reserveAndCreate(id, 5, videoMetadata),
      images.reserve(id, 5), videos.reserveAndCreate(id, 5, videoMetadata),
    ])
    assert.equal(requests.filter(Boolean).length, 3)
    assert.equal(await images.getBalance(id), 0)
    assert.equal(await videos.getBalance(id), 0)
    const reservations = await db.select().from(generationCreditReservation).where(eq(generationCreditReservation.userId, id))
    assert.equal(reservations.reduce((sum, row) => sum + row.dailyFreeCredits, 0), 15)
    assert.equal(await images.reserve(id, 5), null)
    assert.equal(await videos.reserveAndCreate(id, 5, videoMetadata), null)
  })
})

test('refunds restore the original pools once and never carry yesterday’s free credits forward', { skip: !databaseUrl }, async () => {
  await withAccount(25, async (db, id) => {
    const store = createGenerationCreditStore(db)
    const reservation = await store.reserve(id, 20)
    assert.ok(reservation)
    assert.equal(reservation.remainingCredits, 5)
    const refunds = await Promise.all([store.refund(reservation.id), store.refund(reservation.id)])
    assert.deepEqual(refunds.map(row => row.remainingCredits), [25, 25])
    const next = await store.reserve(id, 20)
    assert.ok(next)
    await db.update(user).set({ dailyCreditDate: sql`${creditDay} - 1` }).where(eq(user.id, id))
    await db.update(generationCreditReservation).set({ dailyCreditDate: sql`${creditDay} - 1` }).where(eq(generationCreditReservation.id, next.id))
    assert.equal(await store.getBalance(id), 20)
    assert.equal((await store.refund(next.id)).remainingCredits, 25)
    assert.equal((await store.refund(next.id)).remainingCredits, 25)
    const [account] = await db.select().from(user).where(eq(user.id, id))
    assert.equal(account.dailyFreeCredits, 15)
  })
})

test('stale image reservations from yesterday do not enlarge today’s allowance', { skip: !databaseUrl }, async () => {
  await withAccount(0, async (db, id) => {
    const store = createGenerationCreditStore(db)
    const old = await store.reserve(id, 5)
    assert.ok(old)
    await db.update(user).set({ dailyCreditDate: sql`${creditDay} - 1` }).where(eq(user.id, id))
    await db.update(generationCreditReservation).set({
      dailyCreditDate: sql`${creditDay} - 1`, createdAt: new Date(Date.now() - 20 * 60_000),
    }).where(eq(generationCreditReservation.id, old.id))
    const today = await store.reserve(id, 15)
    assert.ok(today)
    assert.equal(today.remainingCredits, 0)
    assert.equal(await store.reserve(id, 5), null)
  })
})

test('a late video failure cannot add expired free credits to the new day', { skip: !databaseUrl }, async () => {
  await withAccount(0, async (db, id) => {
    const videos = createVideoGenerationTaskStore(db)
    const task = await videos.reserveAndCreate(id, 5, videoMetadata)
    assert.ok(task)
    await db.update(user).set({ dailyCreditDate: sql`${creditDay} - 1` }).where(eq(user.id, id))
    await db.update(generationCreditReservation).set({ dailyCreditDate: sql`${creditDay} - 1` })
      .where(eq(generationCreditReservation.id, task.task.reservationId))
    assert.equal(await videos.getBalance(id), 15)
    const failed = await videos.finalizeSubmissionFailure(task.task.id, 'failed', 'Test failure')
    assert.equal(failed.remainingCredits, 15)
    assert.equal((await videos.finalizeSubmissionFailure(task.task.id, 'failed', 'Repeated')).remainingCredits, 15)
    const second = await videos.reserveAndCreate(id, 5, videoMetadata)
    assert.ok(second)
    await videos.attachProviderTask(second.task.id, `test-provider-${randomUUID()}`)
    const claim = await videos.claimForPoll(second.task.id, id, new Date(Date.now() + 1000), 30_000)
    assert.ok(claim?.leaseUntil)
    assert.equal((await videos.finalizeFailure(second.task.id, 'Test failure', claim.leaseUntil)).remainingCredits, 15)
    assert.equal(await videos.getBalance(id), 15)
  })
})
