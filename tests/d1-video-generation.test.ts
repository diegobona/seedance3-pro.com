import assert from 'node:assert/strict'
import test from 'node:test'
import * as videoStore from '../src/db/video-generation-tasks'
import type { Database } from '../src/db'
import { createD1TestDatabase } from './helpers/d1-test-db'
import { activityBucket } from './helpers/video-activity-bucket'
import { createTrackedVideoTaskStore, createVideoTaskActivity } from '../src/lib/video-task-activity'
import { reconcileVideoGenerationTasks } from '../src/lib/video-task-reconciler'

const metadata = { workflowId: 'minimax_h3_lightx2v_no_pic', duration: 5, resolution: '480p', aspectRatio: '16:9' }
async function fixture(balance = 15) {
  const h = await createD1TestDatabase()
  const userId = crypto.randomUUID()
  await h.db.prepare('INSERT INTO "user" (id,name,email,plan,credit_balance) VALUES (?,?,?,\'paid\',?)')
    .bind(userId, 'D1 test', `${userId}@example.test`, balance).run()
  return { ...h, userId, store: videoStore.createVideoGenerationTaskStore(h.db as unknown as Database) }
}

test('D1 video reserves and creates atomically under concurrency, rolling back a task insert failure', async () => {
  const h = await fixture(15)
  try {
    const id = crypto.randomUUID()
    assert.ok(await h.store.reserveAndCreate(h.userId, 5, metadata, id))
    assert.equal(await h.store.reserveAndCreate(h.userId, 50, metadata, id), null)
    await assert.rejects(h.store.reserveAndCreate(h.userId, 5, metadata, id))
    assert.equal(await h.store.getBalance(h.userId), 10)
    const results = await Promise.all(Array.from({ length: 4 }, () => h.store.reserveAndCreate(h.userId, 5, metadata)))
    assert.equal(results.filter(Boolean).length, 2)
    assert.equal(await h.store.getBalance(h.userId), 0)
    assert.equal((await h.store.listUnfinishedTasks()).length, 3)
  } finally { await h.dispose() }
})

test('D1 video leases reject stale transitions and success settles only once', async () => {
  const h = await fixture()
  try {
    const reservation = (await h.store.reserveAndCreate(h.userId, 5, metadata))!
    await h.store.attachProviderTask(reservation.task.id, crypto.randomUUID())
    assert.equal(await h.store.getForUser(reservation.task.id, 'another-user'), null)
    const now = new Date(Date.now() + 1000)
    const claims = await Promise.all([1, 2].map(() => h.store.claimForPoll(reservation.task.id, h.userId, now, 30_000)))
    assert.equal(claims.filter(Boolean).length, 1)
    const claimed = claims.find(Boolean)!
    const stale = await h.store.finalizeSuccess(claimed.id, 'https://example.test/stale.mp4', new Date(now.getTime() - 1))
    assert.equal(stale.task.status, 'queued')
    const result = await h.store.finalizeSuccess(claimed.id, 'https://example.test/result.mp4', claimed.leaseUntil!)
    assert.equal(result.task.status, 'succeeded')
    assert.equal(result.remainingCredits, 10)
    await h.store.finalizeSuccess(claimed.id, 'https://example.test/result.mp4', claimed.leaseUntil!)
    assert.equal((await h.db.prepare('SELECT generation_count FROM "user" WHERE id=?').bind(h.userId).first<{generation_count:number}>())!.generation_count, 1)
  } finally { await h.dispose() }
})

test('D1 video failure and crashed submission expiry refund once and preserve terminal state', async () => {
  const h = await fixture()
  try {
    const first = (await h.store.reserveAndCreate(h.userId, 5, metadata))!
    await h.store.finalizeSubmissionFailure(first.task.id, 'submission_unknown', 'uncertain')
    await h.store.finalizeSubmissionFailure(first.task.id, 'submission_unknown', 'uncertain')
    assert.equal(await h.store.getBalance(h.userId), 15)
    const second = (await h.store.reserveAndCreate(h.userId, 5, metadata))!
    await h.db.prepare('UPDATE video_generation_task SET created_at=? WHERE id=?').bind(Date.now() - 2 * 60 * 60_000 - 10_000, second.task.id).run()
    const expired = await h.store.expireOverdue()
    assert.equal(expired.length, 1)
    assert.equal(expired[0].status, 'expired')
    assert.equal(await h.store.getBalance(h.userId), 15)
    assert.equal((await h.store.expireOverdue()).length, 0)
    assert.equal((await h.store.finalizeSuccess(second.task.id, 'https://example.test/late.mp4', new Date())).task.status, 'expired')
  } finally { await h.dispose() }
})

test('D1 video retry uses bounded delays and global claims include only due unleased tasks', async () => {
  const h = await fixture()
  try {
    const created = (await h.store.reserveAndCreate(h.userId, 5, metadata))!
    await h.store.attachProviderTask(created.task.id, crypto.randomUUID())
    const now = new Date(Date.now() + 1000)
    const claimed = (await h.store.claimPending(6, now))[0]
    const running = await h.store.markRunning(claimed.id, now, 20, claimed.leaseUntil!)
    assert.equal(running.pollAttempts, 1)
    assert.equal(running.nextPollAt!.getTime(), now.getTime() + 20_000)
    assert.equal((await h.store.claimPending(6, now)).length, 0)
    assert.equal((await h.store.claimPending(6, new Date(now.getTime() + 21_000))).length, 1)
  } finally { await h.dispose() }
})

test('D1 cron works without Neon credentials and returns to zero database work after terminal cleanup', async () => {
  const h = await fixture()
  try {
    const bucket = activityBucket().bucket, activity = createVideoTaskActivity(bucket)
    await activity.initialize()
    const tracked = createTrackedVideoTaskStore(h.store, activity)
    const created = (await tracked.reserveAndCreate(h.userId, 5, metadata))!
    await tracked.attachProviderTask(created.task.id, 'fake-provider-task')
    const environment = { DB: h.db, DATABASE_BACKEND: 'd1', AUTODL_TOKEN: 'fake-provider-token', VIDEO_REFERENCES: bucket }
    const result = await reconcileVideoGenerationTasks(environment, {
      now: () => new Date(Date.now() + 1000),
      query: async () => ({ terminal: true, status: 'succeeded', videoUrl: 'https://example.test/result.mp4' }),
      logger: () => {},
    })
    assert.equal(result.processed, 1)
    assert.equal((await activity.snapshot()).tasks.length, 0)
    await reconcileVideoGenerationTasks(environment, {
      createStore: () => { throw new Error('Idle D1 cron must not create a store') }, logger: () => {},
    })
  } finally { await h.dispose() }
})
