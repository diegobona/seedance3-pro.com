import assert from 'node:assert/strict'
import test from 'node:test'
import {
  reconcileVideoGenerationTasks,
  type VideoTaskReconcilerDependencies,
} from '../src/lib/video-task-reconciler'
import type { VideoGenerationTask } from '../src/lib/protected-video-generation'

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
  const dependencies: VideoTaskReconcilerDependencies = {
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
