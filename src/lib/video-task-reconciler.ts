import { queryAutodlVideoTask } from '../../scripts/autodl-video.mjs'
import { createDb } from '../db'
import { createVideoGenerationTaskStore } from '../db/video-generation-tasks'
import type {
  VideoGenerationTask,
  VideoGenerationTaskStore,
  VideoProviderQueryResult,
} from './protected-video-generation'

const RECONCILE_BATCH_SIZE = 6
const RECONCILE_CONCURRENCY = 2
const MAX_LOG_LENGTH = 500

type ReconcilerEnvironment = {
  DATABASE_URL?: string
  AUTODL_TOKEN?: string
}

export interface VideoTaskReconcilerDependencies {
  now?: () => Date
  createStore?: (databaseUrl: string) => VideoGenerationTaskStore
  query?: (providerTaskId: string, token: string) => Promise<VideoProviderQueryResult>
  logger?: (message: string) => void
}

type ReconciliationResult = {
  expired: number
  claimed: number
  processed: number
}

function emitLog(logger: (message: string) => void, event: string, details: Record<string, unknown> = {}) {
  let message = JSON.stringify({ event, ...details })
  if (message.length > MAX_LOG_LENGTH) message = message.slice(0, MAX_LOG_LENGTH)
  try {
    logger(message)
  } catch {
    // Logging must never prevent a later reconciliation attempt.
  }
}

function safeErrorDetails(error: unknown) {
  const value = error as {
    code?: unknown
    providerStatus?: unknown
    retriable?: unknown
  } | null
  const rawCode = typeof value?.code === 'string' ? value.code : 'UNCLASSIFIED'
  const code = /^[A-Z0-9_]{1,64}$/.test(rawCode) ? rawCode : 'UNCLASSIFIED'
  const providerStatus = typeof value?.providerStatus === 'number'
    && Number.isSafeInteger(value.providerStatus)
    && value.providerStatus >= 100
    && value.providerStatus <= 599
    ? value.providerStatus
    : undefined
  return {
    code,
    retriable: value?.retriable === true,
    ...(providerStatus === undefined ? {} : { providerStatus }),
  }
}

function retryAfterSeconds(error: unknown) {
  const value = (error as { retryAfterSeconds?: unknown } | null)?.retryAfterSeconds
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined
}

function isUsableMp4Url(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
      && !url.username
      && !url.password
      && url.pathname.toLowerCase().endsWith('.mp4')
  } catch {
    return false
  }
}

async function reconcileClaimedTask(
  task: VideoGenerationTask,
  store: VideoGenerationTaskStore,
  query: NonNullable<VideoTaskReconcilerDependencies['query']>,
  token: string,
  now: Date,
  logger: (message: string) => void,
) {
  if (!task.providerTaskId || !task.leaseUntil || (task.status !== 'queued' && task.status !== 'running')) {
    emitLog(logger, 'video_reconciler_invalid_claim', { taskId: task.id.slice(0, 64) })
    return
  }

  let providerResult: VideoProviderQueryResult
  try {
    providerResult = await query(task.providerTaskId, token)
  } catch (error) {
    const details = safeErrorDetails(error)
    emitLog(logger, 'video_reconciler_provider_error', {
      taskId: task.id.slice(0, 64),
      ...details,
    })
    if (details.retriable) {
      await store.scheduleNextPoll(
        task.id,
        task.status,
        now,
        retryAfterSeconds(error),
        task.leaseUntil,
      )
      return
    }
    await store.finalizeFailure(
      task.id,
      'Video provider returned an invalid response.',
      task.leaseUntil,
    )
    return
  }

  if (!providerResult.terminal) {
    if (providerResult.status === 'running') {
      await store.markRunning(
        task.id,
        now,
        providerResult.retryAfterSeconds,
        task.leaseUntil,
      )
    } else {
      await store.scheduleNextPoll(
        task.id,
        task.status,
        now,
        providerResult.retryAfterSeconds,
        task.leaseUntil,
      )
    }
    return
  }

  if (providerResult.status === 'failed') {
    await store.finalizeFailure(task.id, 'Video generation failed.', task.leaseUntil)
    return
  }

  if (!isUsableMp4Url(providerResult.videoUrl)) {
    await store.finalizeFailure(
      task.id,
      'Video provider returned an unusable result.',
      task.leaseUntil,
    )
    return
  }
  await store.finalizeSuccess(task.id, providerResult.videoUrl, task.leaseUntil)
}

async function processWithBoundedConcurrency(
  tasks: VideoGenerationTask[],
  processTask: (task: VideoGenerationTask) => Promise<void>,
) {
  let nextIndex = 0
  const worker = async () => {
    while (nextIndex < tasks.length) {
      const task = tasks[nextIndex]
      nextIndex += 1
      if (task) await processTask(task)
    }
  }
  const workerCount = Math.min(RECONCILE_CONCURRENCY, tasks.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
}

export async function reconcileVideoGenerationTasks(
  environment: ReconcilerEnvironment,
  dependencies: VideoTaskReconcilerDependencies = {},
): Promise<ReconciliationResult> {
  const databaseUrl = environment.DATABASE_URL?.trim() ?? ''
  const token = environment.AUTODL_TOKEN?.trim() ?? ''
  const logger = dependencies.logger ?? console.error
  if (!databaseUrl || !token) {
    const missing = [
      ...(!databaseUrl ? ['DATABASE_URL'] : []),
      ...(!token ? ['AUTODL_TOKEN'] : []),
    ]
    emitLog(logger, 'video_reconciler_unavailable', {
      reason: 'missing_configuration',
      missing,
    })
    return { expired: 0, claimed: 0, processed: 0 }
  }

  const createStore = dependencies.createStore
    ?? ((url: string) => createVideoGenerationTaskStore(createDb(url)))
  const query = dependencies.query
    ?? (async (providerTaskId: string, providerToken: string): Promise<VideoProviderQueryResult> => (
      await queryAutodlVideoTask(providerTaskId, { token: providerToken }) as VideoProviderQueryResult
    ))
  const now = dependencies.now?.() ?? new Date()

  let store: VideoGenerationTaskStore
  let expiredCount = 0
  let claimed: VideoGenerationTask[] = []
  try {
    store = createStore(databaseUrl)
    const expired = await store.expireOverdue(now)
    expiredCount = expired.length
    claimed = await store.claimPending(RECONCILE_BATCH_SIZE, now)
  } catch (error) {
    emitLog(logger, 'video_reconciler_store_error', safeErrorDetails(error))
    return { expired: expiredCount, claimed: 0, processed: 0 }
  }

  let processed = 0
  await processWithBoundedConcurrency(claimed, async (task) => {
    try {
      await reconcileClaimedTask(task, store, query, token, now, logger)
    } catch (error) {
      emitLog(logger, 'video_reconciler_transition_error', {
        taskId: task.id.slice(0, 64),
        ...safeErrorDetails(error),
      })
    } finally {
      processed += 1
    }
  })
  return { expired: expiredCount, claimed: claimed.length, processed }
}
