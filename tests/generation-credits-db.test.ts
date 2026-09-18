import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { createDb } from '../src/db'
import { createGenerationCreditStore } from '../src/db/generation-credits'
import { generationCreditReservation, user } from '../src/db/schema'

config({ path: ['.env.local', '.env'] })

const databaseUrl = process.env.DATABASE_URL

test('Neon atomically prevents concurrent overspend and duplicate refunds', { skip: !databaseUrl }, async () => {
  const db = createDb(databaseUrl!)
  const userId = `credit-test-${randomUUID()}`
  await db.insert(user).values({
    id: userId,
    name: 'Credit Test',
    email: `${userId}@example.test`,
    creditBalance: 5,
  })

  try {
    const store = createGenerationCreditStore(db)
    const reservations = await Promise.all([
      store.reserve(userId, 5),
      store.reserve(userId, 5),
    ])
    const successful = reservations.filter((reservation) => reservation !== null)
    assert.equal(successful.length, 1)
    assert.equal(successful[0]?.remainingCredits, 0)

    const [account] = await db.select({ balance: user.creditBalance }).from(user).where(eq(user.id, userId))
    assert.equal(account.balance, 0)

    const reservedRows = await db.select().from(generationCreditReservation).where(eq(generationCreditReservation.userId, userId))
    assert.equal(reservedRows.length, 1)
    assert.equal(reservedRows[0]?.status, 'reserved')

    const reservationId = successful[0]!.id
    const refunds = await Promise.all([
      store.refund(reservationId),
      store.refund(reservationId),
    ])
    assert.deepEqual(refunds.map((refund) => refund.remainingCredits), [5, 5])

    const [refundedAccount] = await db.select({ balance: user.creditBalance }).from(user).where(eq(user.id, userId))
    assert.equal(refundedAccount.balance, 5)
    const [refundedReservation] = await db.select().from(generationCreditReservation).where(eq(generationCreditReservation.id, reservationId))
    assert.equal(refundedReservation.status, 'refunded')

    const settledReservation = await store.reserve(userId, 5)
    assert.ok(settledReservation)
    await store.settle(settledReservation.id)

    const [settledAccount] = await db.select({
      balance: user.creditBalance,
      generations: user.generationCount,
      monthlyGenerations: user.monthlyGenerationCount,
    }).from(user).where(eq(user.id, userId))
    assert.deepEqual(settledAccount, { balance: 0, generations: 1, monthlyGenerations: 1 })

    const staleReservationId = `stale-${randomUUID()}`
    const staleAt = new Date(Date.now() - 20 * 60 * 1000)
    await db.insert(generationCreditReservation).values({
      id: staleReservationId,
      userId,
      credits: 5,
      status: 'reserved',
      createdAt: staleAt,
      updatedAt: staleAt,
    })

    const recoveredReservations = await Promise.all([
      store.reserve(userId, 5),
      store.reserve(userId, 5),
    ])
    const recovered = recoveredReservations.filter((reservation) => reservation !== null)
    assert.equal(recovered.length, 1)
    assert.equal(recovered[0]?.remainingCredits, 0)

    const [recoveredStale] = await db.select({ status: generationCreditReservation.status })
      .from(generationCreditReservation)
      .where(eq(generationCreditReservation.id, staleReservationId))
    assert.equal(recoveredStale.status, 'refunded')
  } finally {
    await db.delete(user).where(eq(user.id, userId))
  }
})
