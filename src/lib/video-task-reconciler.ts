import { queryAutodlVideoTask } from '../../scripts/autodl-video.mjs'
import { createAppDatabase, databaseConfigured } from '../db'
import { createVideoGenerationTaskStore } from '../db/video-generation-tasks'
import { createTrackedVideoTaskStore, createVideoTaskActivity, type VideoTaskActivity, type VideoActivitySnapshot } from './video-task-activity'
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
  DATABASE_BACKEND?: string
  DB?: D1Database
  AUTODL_TOKEN?: string
  VIDEO_REFERENCES?: R2Bucket
}

export interface VideoTaskReconcilerDependencies {
  activity?: VideoTaskActivity
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
  if (!databaseConfigured(environment) || !token) {
    const missing = [
      ...(!databaseConfigured(environment) ? [environment.DATABASE_BACKEND === 'd1' ? 'DB' : 'DATABASE_URL'] : []),
      ...(!token ? ['AUTODL_TOKEN'] : []),
    ]
    emitLog(logger, 'video_reconciler_unavailable', {
      reason: 'missing_configuration',
      missing,
    })
    return { expired: 0, claimed: 0, processed: 0 }
  }

  const idle = { expired: 0, claimed: 0, processed: 0 }
  const activity = dependencies.activity ?? (environment.VIDEO_REFERENCES ? createVideoTaskActivity(environment.VIDEO_REFERENCES) : null)
  if (!activity) {
    emitLog(logger, 'video_reconciler_unavailable', { reason: 'missing_activity_storage' })
    return idle
  }
  const now = dependencies.now?.() ?? new Date()
  let snapshot: VideoActivitySnapshot
  try { snapshot = await activity.snapshot() }
  catch {
    emitLog(logger, 'video_reconciler_activity_unavailable')
    return idle
  }
  // No Neon client is created on routine idle ticks, or during an outage cooldown.
  if ((snapshot.initialized && !snapshot.tasks.length) || snapshot.retryAt > now.getTime()) return idle

  async function deferDatabase(error: unknown) {
    emitLog(logger, 'video_reconciler_store_error', safeErrorDetails(error))
    try { await activity!.defer(now, snapshot.failures + 1) }
    catch { emitLog(logger, 'video_reconciler_retry_state_unavailable') }
  }

  const createStore: NonNullable<VideoTaskReconcilerDependencies['createStore']> = dependencies.createStore
    ?? (() => createVideoGenerationTaskStore(createAppDatabase(environment)))
  const query = dependencies.query
    ?? (async (providerTaskId: string, providerToken: string): Promise<VideoProviderQueryResult> => (
      await queryAutodlVideoTask(providerTaskId, { token: providerToken }) as VideoProviderQueryResult
    ))

  let store: VideoGenerationTaskStore
  let expiredCount = 0
  let claimed: VideoGenerationTask[] = []
  try {
    store = createTrackedVideoTaskStore(createStore(databaseUrl), activity, logger)
    if (!snapshot.initialized) {
      // Persist only a fully seeded page; a failed write retries the same page.
      const existing = await store.listUnfinishedTasks(snapshot.bootstrapAfterId, 100)
      await Promise.all(existing.map(task => activity.track(task.id)))
      if (existing.length < 100) await activity.initialize()
      else await activity.checkpoint(existing[existing.length - 1].id)
      snapshot = await activity.snapshot()
      if (!snapshot.tasks.length) {
        await activity.clearRetry()
        return idle
      }
    }
    const expired = await store.expireOverdue(now)
    expiredCount = expired.length
    claimed = await store.claimPending(RECONCILE_BATCH_SIZE, now)
  } catch (error) {
    await deferDatabase(error)
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
  try {
    for (let offset = 0; offset < snapshot.tasks.length; offset += 100) {
      const markers = snapshot.tasks.slice(offset, offset + 100)
      const states = new Map((await store.getTaskStates(markers.map(marker => marker.id))).map(task => [task.id, task.status]))
      const removable: string[] = []
      for (const marker of markers) {
        const status = states.get(marker.id)
        const terminal = status && !['submitting', 'queued', 'running'].includes(status)
        // Missing rows can be in-flight reservations. Keep recovery beyond the 2h task expiry.
        const orphan = !status && now.getTime() - marker.recordedAt.getTime() >= 3 * 60 * 60_000
        if (terminal || orphan) removable.push(marker.id)
      }
      if (removable.length) {
        try { await activity.remove(removable) }
        catch { emitLog(logger, 'video_activity_cleanup_deferred', { count: removable.length }) }
      }
    }
    try { await activity.clearRetry() }
    catch { emitLog(logger, 'video_reconciler_retry_state_unavailable') }
  } catch (error) { await deferDatabase(error) }
  return { expired: expiredCount, claimed: claimed.length, processed }
}
