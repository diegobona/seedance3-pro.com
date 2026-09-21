import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { createDb } from '../src/db'
import { createGenerationCreditStore } from '../src/db/generation-credits'
import {
  boundProviderError,
  createVideoGenerationTaskStore,
  getVideoPollDelayMs,
} from '../src/db/video-generation-tasks'
import { generationCreditReservation, user, videoGenerationTask } from '../src/db/schema'

config({ path: ['.env.local', '.env'] })

const databaseUrl = process.env.DATABASE_URL
const metadata = {
  workflowId: 'minimax_h3_lightx2v_no_pic',
  duration: 10,
  resolution: '480p',
  aspectRatio: '16:9',
}

test('poll backoff is exponential, bounded, and honors bounded Retry-After', () => {
  assert.equal(getVideoPollDelayMs(0), 5_000)
  assert.equal(getVideoPollDelayMs(1), 10_000)
  assert.equal(getVideoPollDelayMs(10), 60_000)
  assert.equal(getVideoPollDelayMs(0, 20), 20_000)
  assert.equal(getVideoPollDelayMs(0, 3_600), 60_000)
})

test('provider errors are bounded before persistence', () => {
  assert.equal(boundProviderError('x'.repeat(700)).length, 500)
  assert.equal(boundProviderError(undefined), 'Video provider request failed.')
})

test('video task schema contains lifecycle fields and never contains a prompt', () => {
  assert.equal('prompt' in videoGenerationTask, false)
  assert.ok(videoGenerationTask.providerTaskId)
  assert.ok(videoGenerationTask.reservationId)
  assert.ok(videoGenerationTask.nextPollAt)
  assert.ok(videoGenerationTask.leaseUntil)
  assert.ok(videoGenerationTask.completedAt)
})

test('Neon video store atomically reserves, owns, attaches, leases, and settles once', { skip: !databaseUrl }, async () => {
  const db = createDb(databaseUrl!)
  const userId = `video-task-${randomUUID()}`
  await db.insert(user).values({
    id: userId,
    name: 'Video Task Test',
    email: `${userId}@example.test`,
    creditBalance: 15,
  })

  try {
    const store = createVideoGenerationTaskStore(db)
    const reservations = await Promise.all([
      store.reserveAndCreate(userId, 10, metadata),
      store.reserveAndCreate(userId, 10, metadata),
    ])
    const created = reservations.filter((result) => result !== null)
    assert.equal(created.length, 1)
    const localTask = created[0]!.task
    assert.equal(created[0]!.remainingCredits, 5)
    assert.equal(localTask.status, 'submitting')
    assert.equal(await store.getForUser(localTask.id, 'another-user'), null)
    assert.equal((await store.getForUser(localTask.id, userId))?.id, localTask.id)

    const attached = await store.attachProviderTask(localTask.id, `provider-${randomUUID()}`)
    const attachedAgain = await store.attachProviderTask(localTask.id, attached.providerTaskId!)
    assert.equal(attachedAgain.providerTaskId, attached.providerTaskId)
    await assert.rejects(
      store.attachProviderTask(localTask.id, `conflict-${randomUUID()}`),
      /different provider task/i,
    )

    const now = new Date(Date.now() + 60_000)
    const claims = await Promise.all([
      store.claimForPoll(localTask.id, userId, now, 30_000),
      store.claimForPoll(localTask.id, userId, now, 30_000),
    ])
    assert.equal(claims.filter(Boolean).length, 1)

    const winningClaim = claims.find((claim) => claim !== null)!
    const running = await store.markRunning(localTask.id, now, undefined, winningClaim.leaseUntil!)
    assert.equal(running.status, 'running')
    assert.equal(running.pollAttempts, 1)
    assert.equal(running.leaseUntil, null)
    assert.equal(running.nextPollAt?.getTime(), now.getTime() + 5_000)

    const url = 'https://cdn.example.test/final.mp4'
    const finalClaim = await store.claimForPoll(
      localTask.id,
      userId,
      new Date(now.getTime() + 5_001),
      30_000,
    )
    assert.ok(finalClaim?.leaseUntil)
    const finalized = await Promise.all([
      store.finalizeSuccess(localTask.id, url, finalClaim.leaseUntil),
      store.finalizeSuccess(localTask.id, url, finalClaim.leaseUntil),
    ])
    assert.equal(finalized.every((result) => result.task.status === 'succeeded'), true)
    assert.equal(finalized.every((result) => result.task.resultUrl === url), true)
    const [account] = await db.select({
      balance: user.creditBalance,
      generations: user.generationCount,
      monthlyGenerations: user.monthlyGenerationCount,
    }).from(user).where(eq(user.id, userId))
    assert.deepEqual(account, { balance: 5, generations: 1, monthlyGenerations: 1 })
  } finally {
    await db.delete(user).where(eq(user.id, userId))
  }
})

test('Neon failure, stale cleanup exclusion, ordered claims, and expiry are credit-safe', { skip: !databaseUrl }, async () => {
  const db = createDb(databaseUrl!)
  const userId = `video-expiry-${randomUUID()}`
  await db.insert(user).values({
    id: userId,
    name: 'Video Expiry Test',
    email: `${userId}@example.test`,
    creditBalance: 50,
  })

  try {
    const store = createVideoGenerationTaskStore(db)
    const credits = createGenerationCreditStore(db)
    const first = await store.reserveAndCreate(userId, 10, metadata)
    const second = await store.reserveAndCreate(userId, 10, metadata)
    const third = await store.reserveAndCreate(userId, 10, metadata)
    assert.ok(first && second && third)
    await store.attachProviderTask(first.task.id, `provider-${randomUUID()}`)
    await store.attachProviderTask(second.task.id, `provider-${randomUUID()}`)
    await store.attachProviderTask(third.task.id, `provider-${randomUUID()}`)

    const twentyMinutesAgo = new Date(Date.now() - 20 * 60_000)
    await db.update(generationCreditReservation).set({ createdAt: twentyMinutesAgo, updatedAt: twentyMinutesAgo })
      .where(eq(generationCreditReservation.id, first.task.reservationId))
    await db.update(videoGenerationTask).set({
      status: 'running',
      createdAt: twentyMinutesAgo,
      updatedAt: twentyMinutesAgo,
      leaseUntil: null,
      nextPollAt: twentyMinutesAgo,
    }).where(eq(videoGenerationTask.id, first.task.id))

    const ordinary = await credits.reserve(userId, 5)
    assert.ok(ordinary)
    const [protectedReservation] = await db.select({ status: generationCreditReservation.status })
      .from(generationCreditReservation)
      .where(eq(generationCreditReservation.id, first.task.reservationId))
    assert.equal(protectedReservation.status, 'reserved')

    const dueBase = new Date(Date.now() - 60_000)
    await db.update(videoGenerationTask).set({ nextPollAt: new Date(dueBase.getTime() + 2_000), leaseUntil: null })
      .where(eq(videoGenerationTask.id, second.task.id))
    await db.update(videoGenerationTask).set({ nextPollAt: new Date(dueBase.getTime() + 1_000), leaseUntil: null })
      .where(eq(videoGenerationTask.id, third.task.id))
    const claimed = await store.claimPending(2, new Date(), 30_000)
    assert.deepEqual(claimed.map((task) => task.id), [first.task.id, third.task.id])

    const failureClaim = await store.claimForPoll(second.task.id, userId, new Date(), 30_000)
    assert.ok(failureClaim?.leaseUntil)
    await store.finalizeFailure(second.task.id, 'x'.repeat(700), failureClaim.leaseUntil)
    await store.finalizeFailure(second.task.id, 'again', failureClaim.leaseUntil)
    const failed = await store.getForUser(second.task.id, userId)
    assert.equal(failed?.providerError?.length, 500)

    const overdue = new Date(Date.now() - (2 * 60 * 60_000) - 1)
    await db.update(videoGenerationTask).set({ createdAt: overdue, leaseUntil: null })
      .where(eq(videoGenerationTask.id, first.task.id))
    const expired = await store.expireOverdue(new Date())
    assert.equal(expired.some((task) => task.id === first.task.id), true)
    const staleLease = claimed.find((task) => task.id === first.task.id)?.leaseUntil
    assert.ok(staleLease)
    const late = await store.finalizeSuccess(first.task.id, 'https://cdn.example.test/late.mp4', staleLease)
    assert.equal(late.task.status, 'expired')
    assert.equal(late.task.resultUrl, null)

    const [account] = await db.select({ balance: user.creditBalance }).from(user).where(eq(user.id, userId))
    assert.equal(account.balance, 35)
  } finally {
    await db.delete(user).where(eq(user.id, userId))
  }
})
