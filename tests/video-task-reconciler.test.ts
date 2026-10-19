import assert from 'node:assert/strict'
import test from 'node:test'
import {
  reconcileVideoGenerationTasks,
  type VideoTaskReconcilerDependencies,
} from '../src/lib/video-task-reconciler'
import type { VideoGenerationTask } from '../src/lib/protected-video-generation'
import { createVideoTaskActivity } from '../src/lib/video-task-activity'
import { activityBucket } from './helpers/video-activity-bucket'
import { COMPSHARE_FIRST_FRAME_WORKFLOW_ID as compshare } from '../src/lib/video-providers'

function task(overrides: Partial<VideoGenerationTask> = {}): VideoGenerationTask {
  return {
    id: 'local-task-1',
    userId: 'user-1',
    reservationId: 'reservation-1',
    providerTaskId: 'provider-secret-1',
    workflowId: 'minimax_h3_lightx2v_no_pic',
    duration: 10,
    resolution: '480p',
    aspectRatio: '16:9',
    status: 'queued',
    resultUrl: null,
    providerError: null,
    pollAttempts: 0,
    nextPollAt: new Date('2026-09-21T00:00:00Z'),
    leaseUntil: new Date('2026-09-21T00:01:30Z'),
    lastPolledAt: null,
    createdAt: new Date('2026-09-21T00:00:00Z'),
    updatedAt: new Date('2026-09-21T00:01:00Z'),
    completedAt: null,
    ...overrides,
  }
}

test('missing reconciler configuration logs once and returns without creating a store', async () => {
  const logs: string[] = []
  let storeCreations = 0
  const result = await reconcileVideoGenerationTasks({}, {
    logger: (message) => logs.push(message),
    createStore: () => {
      storeCreations += 1
      throw new Error('must not create a store')
    },
  })

  assert.deepEqual(result, { expired: 0, claimed: 0, processed: 0 })
  assert.equal(storeCreations, 0)
  assert.equal(logs.length, 1)
  assert.ok(logs[0].length <= 500)
  assert.equal(logs[0].includes('secret-token'), false)
})

test('reconciliation expires first, claims a bounded batch, and retries transient queries without refunding', async () => {
  const calls: string[] = []
  const claimed = task()
  const store = {
    expireOverdue: async (now: Date) => {
      calls.push(`expire:${now.toISOString()}`)
      return [task({ id: 'expired-task', status: 'expired' })]
    },
    claimPending: async (limit: number, now: Date) => {
      calls.push(`claim:${limit}:${now.toISOString()}`)
      return [claimed]
    },
    scheduleNextPoll: async (...args: unknown[]) => {
      calls.push(`retry:${String(args[0])}:${String(args[3])}`)
      return { ...claimed, leaseUntil: null, pollAttempts: 1 }
    },
    markRunning: async () => {
      throw new Error('must not mark running')
    },
    finalizeSuccess: async () => {
      throw new Error('must not settle')
    },
    finalizeFailure: async () => {
      throw new Error('must not refund')
    },
  }
  const now = new Date('2026-09-21T00:01:00Z')
  const activity = createVideoTaskActivity(activityBucket().bucket)
  await activity.initialize()
  await activity.track(claimed.id)
  const dependencies: VideoTaskReconcilerDependencies = {
    activity,
    now: () => now,
    createStore: () => store as never,
    query: async (providerTaskId) => {
      calls.push(`query:${providerTaskId}`)
      throw Object.assign(new Error('temporary provider failure with secret-token'), {
        retriable: true,
        retryAfterSeconds: 20,
      })
    },
    logger: () => {},
  }
  Object.assign(store, { getTaskStates: async () => [{ id: claimed.id, status: 'queued' }] })

  const result = await reconcileVideoGenerationTasks({
    DATABASE_URL: 'postgresql://configured.example/db',
    AUTODL_TOKEN: 'secret-token',
  }, dependencies)

  assert.deepEqual(result, { expired: 1, claimed: 1, processed: 1 })
  assert.deepEqual(calls, [
    'expire:2026-09-21T00:01:00.000Z',
    'claim:6:2026-09-21T00:01:00.000Z',
    'query:provider-secret-1',
    'retry:local-task-1:20',
  ])
})

const configuredEnvironment = { DATABASE_URL: 'postgresql://configured.example/db', AUTODL_TOKEN: 'secret-token' }

test('mixed batch queries each persisted workflow with the correct token even after rollback', async () => {
  const tasks = [task(), task({ id: 'comp-local', providerTaskId: 'comp-provider', workflowId: compshare })]
  const activity = createVideoTaskActivity(activityBucket().bucket)
  await activity.initialize()
  await Promise.all(tasks.map(row => activity.track(row.id)))
  const calls: unknown[] = []
  const store = { expireOverdue: async () => [], claimPending: async () => tasks,
    scheduleNextPoll: async () => tasks[0], getTaskStates: async () => tasks,
  }
  const result = await reconcileVideoGenerationTasks({ ...configuredEnvironment,
    H3_REFERENCE_PROVIDER: 'autodl', COMPSHARE_API_KEY: 'comp-secret',
  }, { activity, createStore: () => store as never, logger: () => {},
    query: async (id, token, context) => { calls.push([id, token, context]); return { terminal: false, status: 'queued' } },
  })
  assert.equal(result.processed, 2)
  assert.deepEqual(calls, [
    ['provider-secret-1', 'secret-token', { workflowId: 'minimax_h3_lightx2v_no_pic', localTaskId: 'local-task-1' }],
    ['comp-provider', 'comp-secret', { workflowId: compshare, localTaskId: 'comp-local' }],
  ])
})

test('CompShare-only reconciliation does not require AutoDL; absent CompShare key retries without refund', async () => {
  for (const key of ['', 'comp-secret']) {
    const row = task({ workflowId: compshare })
    const activity = createVideoTaskActivity(activityBucket().bucket)
    await activity.initialize(); await activity.track(row.id)
    let retries = 0, queries = 0, refunds = 0
    const store = { expireOverdue: async () => [], claimPending: async () => [row], getTaskStates: async () => [row],
      scheduleNextPoll: async () => { retries++; return row }, finalizeFailure: async () => { refunds++; return row },
    }
    const response = await reconcileVideoGenerationTasks({ DATABASE_URL: configuredEnvironment.DATABASE_URL, COMPSHARE_API_KEY: key }, {
      activity, createStore: () => store as never, logger: () => {},
      query: async (_id, token) => { queries++; assert.equal(token, key); return { terminal: false, status: 'queued' } },
    })
    assert.equal(response.processed, 1)
    assert.equal(queries, key ? 1 : 0)
    assert.equal(retries, 1)
    assert.equal(refunds, 0)
  }
})

test('idle activity performs zero SQL and provider calls even when both provider credentials are absent', async () => {
  const activity = createVideoTaskActivity(activityBucket().bucket)
  await activity.initialize()
  let stores = 0, queries = 0
  await reconcileVideoGenerationTasks({ DATABASE_URL: configuredEnvironment.DATABASE_URL }, {
    activity, createStore: () => { stores++; throw new Error('idle must not query SQL') },
    query: async () => { queries++; throw new Error('idle must not query providers') }, logger: () => {},
  })
  assert.equal(stores, 0)
  assert.equal(queries, 0)
})

test('initialized idle cron never creates a Neon store, including repeated ticks', async () => {
  const activity = createVideoTaskActivity(activityBucket().bucket)
  await activity.initialize()
  let creations = 0
  for (let minute = 0; minute < 10; minute++) {
    assert.deepEqual(await reconcileVideoGenerationTasks(configuredEnvironment, {
      activity, createStore: () => { creations++; throw new Error('Neon must remain asleep') }, logger: () => {},
    }), { expired: 0, claimed: 0, processed: 0 })
  }
  assert.equal(creations, 0)
})

test('unavailable activity storage fails closed without waking Neon', async () => {
  let creations = 0
  const result = await reconcileVideoGenerationTasks(configuredEnvironment, {
    createStore: () => { creations++; throw new Error('must not connect') }, logger: () => {},
  })
  assert.equal(creations, 0)
  assert.deepEqual(result, { expired: 0, claimed: 0, processed: 0 })
})

test('bootstrap preserves existing submitting tasks and idle becomes zero-SQL after terminal cleanup', async () => {
  const activity = createVideoTaskActivity(activityBucket().bucket)
  let status = 'submitting', scans = 0, creations = 0
  const store = { listUnfinishedTasks: async () => { scans++; return [{ id: 'old-task', status }] },
    expireOverdue: async () => [], claimPending: async () => [],
    getTaskStates: async () => [{ id: 'old-task', status }],
  }
  const dependencies = { activity, createStore: () => { creations++; return store as never }, logger: () => {} }
  await reconcileVideoGenerationTasks(configuredEnvironment, dependencies)
  assert.equal((await activity.snapshot()).initialized, true)
  assert.equal((await activity.snapshot()).tasks.length, 1)
  status = 'succeeded'
  await reconcileVideoGenerationTasks(configuredEnvironment, dependencies)
  assert.equal((await activity.snapshot()).tasks.length, 0)
  const beforeIdle = creations
  await reconcileVideoGenerationTasks(configuredEnvironment, dependencies)
  assert.equal(creations, beforeIdle)
  assert.equal(scans, 1)
})

test('database failures retain activity and skip subsequent ticks until the persisted retry deadline', async () => {
  const activity = createVideoTaskActivity(activityBucket().bucket)
  await activity.initialize()
  await activity.track('pending-task')
  let now = new Date('2026-10-18T00:00:00Z'), creations = 0
  const dependencies = { activity, now: () => now, logger: () => {}, createStore: () => {
    creations++; return { expireOverdue: async () => { throw new Error('Neon quota exhausted') } } as never
  } }
  await reconcileVideoGenerationTasks(configuredEnvironment, dependencies)
  now = new Date('2026-10-18T00:00:30Z')
  await reconcileVideoGenerationTasks(configuredEnvironment, dependencies)
  assert.equal(creations, 1)
  assert.equal((await activity.snapshot()).tasks.length, 1)
  now = new Date('2026-10-18T00:01:00Z')
  await reconcileVideoGenerationTasks(configuredEnvironment, dependencies)
  assert.equal(creations, 2)
  now = new Date('2026-10-18T00:02:00Z')
  await reconcileVideoGenerationTasks(configuredEnvironment, dependencies)
  assert.equal(creations, 2)
})

test('cleanup only removes the captured terminal task, never a concurrent new arrival', async () => {
  const activity = createVideoTaskActivity(activityBucket().bucket)
  await activity.initialize()
  await activity.track('finished-task')
  await reconcileVideoGenerationTasks(configuredEnvironment, { activity, logger: () => {}, createStore: () => ({
    expireOverdue: async () => [], claimPending: async () => [],
    getTaskStates: async () => { await activity.track('new-task'); return [{ id: 'finished-task', status: 'succeeded' }] },
  } as never) })
  assert.deepEqual((await activity.snapshot()).tasks.map(value => value.id), ['new-task'])
})

test('R2 read errors defer all reconciliation without a database fallback', async () => {
  const h = activityBucket()
  h.bucket.list = async () => { throw new Error('R2 unavailable') }
  let creations = 0
  await reconcileVideoGenerationTasks(configuredEnvironment, { activity: createVideoTaskActivity(h.bucket), logger: () => {},
    createStore: () => { creations++; throw new Error('must not connect') },
  })
  assert.equal(creations, 0)
})

test('unfinished legacy tasks are not marked bootstrapped after partial marker writes fail', async () => {
  const h = activityBucket(), activity = createVideoTaskActivity(h.bucket)
  const originalPut = h.bucket.put.bind(h.bucket)
  let failWrites = true, now = new Date()
  h.bucket.put = ((key: string, value: string, options: R2PutOptions) => {
    if (failWrites && key.endsWith('/legacy-two')) throw new Error('partial R2 outage')
    return originalPut(key, value, options)
  }) as R2Bucket['put']
  const rows = [{ id: 'legacy-one', status: 'submitting' }, { id: 'legacy-two', status: 'running' }]
  const dependencies = { activity, now: () => now, logger: () => {}, createStore: () => ({
    listUnfinishedTasks: async () => rows, expireOverdue: async () => [], claimPending: async () => [], getTaskStates: async () => rows,
  } as never) }
  await reconcileVideoGenerationTasks(configuredEnvironment, dependencies)
  assert.equal((await activity.snapshot()).initialized, false)
  failWrites = false
  now = new Date(now.getTime() + 60_000)
  await reconcileVideoGenerationTasks(configuredEnvironment, dependencies)
  const snapshot = await activity.snapshot()
  assert.equal(snapshot.initialized, true)
  assert.deepEqual(snapshot.tasks.map(value => value.id).sort(), ['legacy-one', 'legacy-two'])
})

test('a missing reservation remains recoverable through expiry, then orphan activity is removed', async () => {
  const h = activityBucket(), activity = createVideoTaskActivity(h.bucket)
  await activity.initialize()
  await activity.track('uncertain-submission')
  const recordedAt = [...h.objects.values()].find(value => value.key.endsWith('/uncertain-submission'))!.uploaded
  let now = new Date(recordedAt.getTime() + 2 * 60 * 60_000)
  const dependencies = { activity, now: () => now, logger: () => {}, createStore: () => ({
    expireOverdue: async () => [], claimPending: async () => [], getTaskStates: async () => [],
  } as never) }
  await reconcileVideoGenerationTasks(configuredEnvironment, dependencies)
  assert.equal((await activity.snapshot()).tasks.length, 1)
  now = new Date(recordedAt.getTime() + 3 * 60 * 60_000)
  await reconcileVideoGenerationTasks(configuredEnvironment, dependencies)
  assert.equal((await activity.snapshot()).tasks.length, 0)
})

test('legacy bootstrap seeds one bounded page per tick, resumes its persisted cursor, and reconciles partial progress', async () => {
  const h = activityBucket()
  const rows = Array.from({ length: 205 }, (_, index) => ({
    id: `legacy-${String(index).padStart(4, '0')}`,
    status: 'running' as const,
  }))
  const scans: Array<{ afterId: string | undefined; limit: number | undefined }> = []
  let expirations = 0, claims = 0
  const store = {
    listUnfinishedTasks: async (afterId?: string, limit?: number) => {
      scans.push({ afterId, limit })
      return rows.filter(row => !afterId || row.id > afterId).slice(0, limit)
    },
    expireOverdue: async () => { expirations++; return [] },
    claimPending: async () => { claims++; return [] },
    getTaskStates: async (ids: string[]) => rows.filter(row => ids.includes(row.id)),
  }
  const dependencies = { createStore: () => store as never, logger: () => {} }
  const reconcileTick = () => reconcileVideoGenerationTasks(configuredEnvironment, {
    ...dependencies,
    // Recreate the adapter to verify that progress survives a Worker invocation.
    activity: createVideoTaskActivity(h.bucket),
  })

  await reconcileTick()
  let snapshot = await createVideoTaskActivity(h.bucket).snapshot()
  assert.deepEqual(scans, [{ afterId: undefined, limit: 100 }])
  assert.equal(snapshot.tasks.length, 100)
  assert.equal(snapshot.bootstrapAfterId, 'legacy-0099')
  assert.equal(snapshot.initialized, false)
  assert.equal(expirations, 1)
  assert.equal(claims, 1)

  await reconcileTick()
  snapshot = await createVideoTaskActivity(h.bucket).snapshot()
  assert.deepEqual(scans[1], { afterId: 'legacy-0099', limit: 100 })
  assert.equal(scans.length, 2)
  assert.equal(snapshot.tasks.length, 200)
  assert.equal(snapshot.bootstrapAfterId, 'legacy-0199')
  assert.equal(snapshot.initialized, false)
  assert.equal(expirations, 2)
  assert.equal(claims, 2)

  await reconcileTick()
  snapshot = await createVideoTaskActivity(h.bucket).snapshot()
  assert.deepEqual(scans[2], { afterId: 'legacy-0199', limit: 100 })
  assert.equal(scans.length, 3)
  assert.equal(snapshot.tasks.length, 200)
  assert.equal([...h.objects.keys()].filter(key => key.includes('/tasks/')).length, 205)
  assert.equal(snapshot.initialized, true)
  assert.equal(expirations, 3)
  assert.equal(claims, 3)
})

test('a failed bootstrap page retains the last completed cursor and retries that page after backoff', async () => {
  const h = activityBucket()
  const rows = Array.from({ length: 205 }, (_, index) => ({
    id: `legacy-${String(index).padStart(4, '0')}`,
    status: 'submitting' as const,
  }))
  const scans: Array<string | undefined> = []
  let now = new Date(), failSecondPage = false
  const originalPut = h.bucket.put.bind(h.bucket)
  h.bucket.put = ((key: string, value: string, options: R2PutOptions) => {
    if (failSecondPage && key.endsWith('/legacy-0125')) throw new Error('partial R2 outage')
    return originalPut(key, value, options)
  }) as R2Bucket['put']
  const store = {
    listUnfinishedTasks: async (afterId?: string, limit?: number) => {
      scans.push(afterId)
      return rows.filter(row => !afterId || row.id > afterId).slice(0, limit)
    },
    expireOverdue: async () => [],
    claimPending: async () => [],
    getTaskStates: async (ids: string[]) => rows.filter(row => ids.includes(row.id)),
  }
  const reconcileTick = () => reconcileVideoGenerationTasks(configuredEnvironment, {
    activity: createVideoTaskActivity(h.bucket), now: () => now,
    createStore: () => store as never, logger: () => {},
  })

  await reconcileTick()
  failSecondPage = true
  await reconcileTick()
  let snapshot = await createVideoTaskActivity(h.bucket).snapshot()
  assert.deepEqual(scans, [undefined, 'legacy-0099'])
  assert.equal(snapshot.bootstrapAfterId, 'legacy-0099')
  assert.equal(snapshot.initialized, false)
  assert.equal(snapshot.failures, 1)

  failSecondPage = false
  now = new Date(now.getTime() + 60_000)
  await reconcileTick()
  snapshot = await createVideoTaskActivity(h.bucket).snapshot()
  assert.deepEqual(scans, [undefined, 'legacy-0099', 'legacy-0099'])
  assert.equal(snapshot.bootstrapAfterId, 'legacy-0199')
  assert.equal(snapshot.initialized, false)
  assert.equal(snapshot.failures, 0)
})
