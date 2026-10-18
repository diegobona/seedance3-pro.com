import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { fileURLToPath } from 'node:url'
import { eq } from 'drizzle-orm'
import type { Database } from '../src/db'
import * as schema from '../src/db/schema'
import { user } from '../src/db/schema'
import { createVideoGenerationTaskStore } from '../src/db/video-generation-tasks'
import { createTrackedVideoTaskStore, createVideoTaskActivity } from '../src/lib/video-task-activity'
import { reconcileVideoGenerationTasks } from '../src/lib/video-task-reconciler'
import { activityBucket } from './helpers/video-activity-bucket'

const postgres = new PGlite()
const localDb = drizzle(postgres, { schema })
const db = localDb as unknown as Database
before(async () => { await migrate(localDb, { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) }) })
after(async () => { await postgres.close() })
const metadata = { workflowId: 'minimax_h3_lightx2v_no_pic', duration: 5, resolution: '480p', aspectRatio: '16:9' }
const configured = { DATABASE_URL: 'local-test-only', AUTODL_TOKEN: 'not-a-provider-credential' }

test('actual SQL uses the pre-recorded ID and background completion clears activity without browser polling', async () => {
  const userId = crypto.randomUUID()
  const activity = createVideoTaskActivity(activityBucket().bucket)
  await activity.initialize()
  const store = createVideoGenerationTaskStore(db)
  const tracked = createTrackedVideoTaskStore(store, activity)
  await db.insert(user).values({ id: userId, name: 'Test', email: `${userId}@example.test`, plan: 'paid', creditBalance: 15 })
  try {
    const reserved = await tracked.reserveAndCreate(userId, 5, metadata)
    assert.ok(reserved)
    assert.equal((await activity.snapshot()).tasks[0].id, reserved.task.id)
    assert.deepEqual(await store.listUnfinishedTasks(), [{ id: reserved.task.id, status: 'submitting' }])
    assert.deepEqual(await store.listUnfinishedTasks(reserved.task.id), [])
    await tracked.attachProviderTask(reserved.task.id, crypto.randomUUID())
    const result = await reconcileVideoGenerationTasks(configured, { activity, createStore: () => store,
      now: () => new Date(Date.now() + 1000), query: async () => ({ status: 'succeeded', terminal: true, videoUrl: 'https://example.com/video.mp4' }),
      logger: () => {},
    })
    assert.equal(result.processed, 1)
    assert.deepEqual(await store.getTaskStates([reserved.task.id]), [{ id: reserved.task.id, status: 'succeeded' }])
    assert.equal((await activity.snapshot()).tasks.length, 0)
    assert.equal(await store.getBalance(userId), 10)
  } finally { await db.delete(user).where(eq(user.id, userId)) }
})

test('a crashed submitting task keeps its marker until expiry refunds, then all future ticks avoid SQL', async () => {
  const userId = crypto.randomUUID()
  const activity = createVideoTaskActivity(activityBucket().bucket)
  await activity.initialize()
  const store = createVideoGenerationTaskStore(db)
  await db.insert(user).values({ id: userId, name: 'Test', email: `${userId}@example.test`, plan: 'paid', creditBalance: 15 })
  try {
    const reserved = await createTrackedVideoTaskStore(store, activity).reserveAndCreate(userId, 5, metadata)
    assert.ok(reserved)
    await reconcileVideoGenerationTasks(configured, { activity, createStore: () => store, logger: () => {} })
    assert.equal((await activity.snapshot()).tasks.length, 1)
    const result = await reconcileVideoGenerationTasks(configured, { activity, createStore: () => store,
      now: () => new Date(Date.now() + 2 * 60 * 60_000 + 1000), logger: () => {},
    })
    assert.equal(result.expired, 1)
    assert.equal(await store.getBalance(userId), 15)
    assert.equal((await activity.snapshot()).tasks.length, 0)
    await reconcileVideoGenerationTasks(configured, { activity, createStore: () => { throw new Error('Idle cron woke Neon') }, logger: () => {} })
  } finally { await db.delete(user).where(eq(user.id, userId)) }
})
