import assert from 'node:assert/strict'
import test from 'node:test'
import { createTrackedVideoTaskStore, createVideoTaskActivity } from '../src/lib/video-task-activity'
import type { VideoGenerationTaskStore, VideoGenerationTask } from '../src/lib/protected-video-generation'
import { activityBucket } from './helpers/video-activity-bucket'

test('submission marker is durable before the first credit reservation and uses the same local ID', async () => {
  const h = activityBucket()
  const activity = createVideoTaskActivity(h.bucket)
  const store = { reserveAndCreate: async (_userId: string, _credits: number, _metadata: unknown, taskId: string) => {
    const snapshot = await activity.snapshot()
    assert.deepEqual(snapshot.tasks.map(value => value.id), [taskId])
    return { task: { id: taskId, status: 'submitting' }, remainingCredits: 5 }
  } } as unknown as VideoGenerationTaskStore
  const tracked = createTrackedVideoTaskStore(store, activity)
  const result = await tracked.reserveAndCreate('user-1', 5, { workflowId: 'test', duration: 5, resolution: '480p', aspectRatio: '16:9' })
  assert.ok(result)
  assert.equal((await activity.snapshot()).tasks[0].id, result.task.id)
})

test('insufficient credits remove the unneeded marker, while ambiguous DB failures retain recovery', async () => {
  const h = activityBucket(), activity = createVideoTaskActivity(h.bucket)
  const metadata = { workflowId: 'test', duration: 5, resolution: '480p', aspectRatio: '16:9' }
  const rejected = createTrackedVideoTaskStore({ reserveAndCreate: async () => null } as never, activity)
  assert.equal(await rejected.reserveAndCreate('u', 5, metadata), null)
  assert.equal((await activity.snapshot()).tasks.length, 0)
  const ambiguous = createTrackedVideoTaskStore({ reserveAndCreate: async () => { throw new Error('unknown database outcome') } } as never, activity)
  await assert.rejects(ambiguous.reserveAndCreate('u', 5, metadata))
  assert.equal((await activity.snapshot()).tasks.length, 1)
})

test('only confirmed terminal transitions remove activity, and cleanup failure preserves a successful result', async () => {
  const h = activityBucket(), activity = createVideoTaskActivity(h.bucket)
  await activity.track('task-1')
  let task = { id: 'task-1', status: 'running' } as VideoGenerationTask
  const store = { finalizeSuccess: async () => ({ task, remainingCredits: 5 }) } as never
  const tracked = createTrackedVideoTaskStore(store, activity, () => {})
  await tracked.finalizeSuccess('task-1', 'https://example.com/video.mp4', new Date())
  assert.equal((await activity.snapshot()).tasks.length, 1)
  task = { ...task, status: 'succeeded' }
  h.bucket.delete = async () => { throw new Error('temporary R2 outage') }
  assert.equal((await tracked.finalizeSuccess('task-1', 'https://example.com/video.mp4', new Date())).task.status, 'succeeded')
  assert.equal((await activity.snapshot()).tasks.length, 1)
})

test('activity storage failure rejects submission before touching Neon or spending credits', async () => {
  const h = activityBucket()
  h.bucket.put = async () => { throw new Error('R2 unavailable') }
  let reservations = 0
  const tracked = createTrackedVideoTaskStore({ reserveAndCreate: async () => { reservations++; return null } } as never, createVideoTaskActivity(h.bucket))
  await assert.rejects(tracked.reserveAndCreate('u', 5, { workflowId: 'test', duration: 5, resolution: '480p', aspectRatio: '16:9' }), /R2 unavailable/)
  assert.equal(reservations, 0)
})

test('an empty intermediate R2 page is followed instead of being treated as idle', async () => {
  const h = activityBucket()
  const activity = createVideoTaskActivity(h.bucket)
  await activity.initialize()
  await activity.track('pending')
  const objects = [...h.objects.values()]
  const cursors: Array<string | undefined> = []
  h.bucket.list = (async (options: R2ListOptions) => {
    cursors.push(options.cursor)
    return options.cursor ? { objects, truncated: false, delimitedPrefixes: [] }
      : { objects: [], truncated: true, cursor: 'page-two', delimitedPrefixes: [] }
  }) as R2Bucket['list']
  assert.equal((await activity.snapshot()).tasks[0].id, 'pending')
  assert.deepEqual(cursors, [undefined, 'page-two'])
})

test('activity snapshots cap captured tasks at 200 without deleting markers or losing control state', async () => {
  const h = activityBucket(), activity = createVideoTaskActivity(h.bucket)
  const now = new Date('2026-10-19T00:00:00Z')
  await activity.initialize()
  await activity.checkpoint('legacy-0099')
  await activity.defer(now, 3)
  const ids = Array.from({ length: 405 }, (_, index) => `task-${String(index).padStart(4, '0')}`)
  for (const id of ids) await activity.track(id)

  const snapshot = await activity.snapshot()
  assert.equal(snapshot.tasks.length, 200)
  assert.deepEqual(snapshot.tasks.map(value => value.id), ids.slice(0, 200))
  assert.equal(snapshot.initialized, true)
  assert.equal(snapshot.bootstrapAfterId, 'legacy-0099')
  assert.equal(snapshot.failures, 3)
  assert.equal(snapshot.retryAt, now.getTime() + 4 * 60_000)
  assert.equal([...h.objects.keys()].filter(key => key.includes('/tasks/')).length, 405)

  await activity.remove(snapshot.tasks.map(value => value.id))
  const remaining = await createVideoTaskActivity(h.bucket).snapshot()
  assert.equal(remaining.tasks.length, 200)
  assert.deepEqual(remaining.tasks.map(value => value.id), ids.slice(200, 400))
  assert.equal([...h.objects.keys()].filter(key => key.includes('/tasks/')).length, 205)
})

test('a capped activity snapshot stops following R2 cursors once 200 task markers are captured', async () => {
  const h = activityBucket(), activity = createVideoTaskActivity(h.bucket)
  await activity.initialize()
  await activity.checkpoint('legacy-0199')
  await activity.defer(new Date('2026-10-19T00:00:00Z'), 1)
  for (let index = 0; index < 405; index++) await activity.track(`task-${String(index).padStart(4, '0')}`)
  const listedCursors: Array<string | undefined> = []
  h.bucket.list = (async (options: R2ListOptions) => {
    listedCursors.push(options.cursor)
    const objects = [...h.objects.values()].filter(value => value.key.startsWith(options.prefix ?? ''))
      .sort((left, right) => left.key.localeCompare(right.key))
    const offset = Number(options.cursor ?? 0)
    const page = objects.slice(offset, offset + Math.min(75, options.limit ?? 1000))
    const nextOffset = offset + page.length
    return { objects: page, truncated: nextOffset < objects.length, cursor: String(nextOffset), delimitedPrefixes: [] }
  }) as unknown as R2Bucket['list']

  const snapshot = await activity.snapshot()
  assert.equal(snapshot.tasks.length, 200)
  assert.equal(snapshot.tasks[199].id, 'task-0199')
  assert.equal(snapshot.initialized, true)
  assert.equal(snapshot.bootstrapAfterId, 'legacy-0199')
  assert.equal(snapshot.failures, 1)
  assert.equal(listedCursors.length, 3)
})

test('expiring a large task batch uses one bulk marker deletion and preserves every refund result', async () => {
  const h = activityBucket(), activity = createVideoTaskActivity(h.bucket)
  const expired = Array.from({ length: 250 }, (_, index) => ({
    id: `expired-${index}`, status: 'expired',
  } as VideoGenerationTask))
  for (const task of expired) await activity.track(task.id)
  const deletions: Array<string | string[]> = []
  const originalDelete = h.bucket.delete.bind(h.bucket)
  h.bucket.delete = async keys => { deletions.push(keys); await originalDelete(keys) }
  const tracked = createTrackedVideoTaskStore({ expireOverdue: async () => expired } as never, activity)

  assert.deepEqual(await tracked.expireOverdue(), expired)
  assert.equal(deletions.length, 1)
  assert.ok(Array.isArray(deletions[0]))
  assert.equal(new Set(deletions.flat()).size, 250)
  assert.equal((await activity.snapshot()).tasks.length, 0)
})
