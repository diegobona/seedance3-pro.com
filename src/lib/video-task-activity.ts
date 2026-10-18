import type { VideoGenerationTask, VideoGenerationTaskStore } from './protected-video-generation'

const PREFIX = 'video-reconciliation/v1/'
const TASK_PREFIX = `${PREFIX}tasks/`
const INITIALIZED_KEY = `${PREFIX}initialized`
const RETRY_KEY = `${PREFIX}retry`
const BOOTSTRAP_KEY = `${PREFIX}bootstrap`
const SNAPSHOT_TASK_LIMIT = 200
const TERMINAL = new Set(['succeeded', 'failed', 'expired', 'submission_unknown'])

export interface VideoActivitySnapshot {
  initialized: boolean
  failures: number
  retryAt: number
  bootstrapAfterId?: string
  tasks: Array<{ id: string; recordedAt: Date }>
}
export interface VideoTaskActivity {
  snapshot(): Promise<VideoActivitySnapshot>
  track(taskId: string): Promise<void>
  remove(taskIds: string | string[]): Promise<void>
  checkpoint(afterId: string): Promise<void>
  initialize(): Promise<void>
  defer(now: Date, failures: number): Promise<void>
  clearRetry(): Promise<void>
}

export function createVideoTaskActivity(bucket: R2Bucket): VideoTaskActivity {
  return {
    async snapshot() {
      const snapshot: VideoActivitySnapshot = { initialized: false, failures: 0, retryAt: 0, tasks: [] }
      let cursor: string | undefined
      do {
        const page = await bucket.list({ prefix: PREFIX, include: ['customMetadata'], limit: 1000, ...(cursor ? { cursor } : {}) })
        for (const object of page.objects) {
          if (object.key === BOOTSTRAP_KEY) snapshot.bootstrapAfterId = object.customMetadata?.afterId || undefined
          else if (object.key === INITIALIZED_KEY) snapshot.initialized = true
          else if (object.key === RETRY_KEY) {
            const failures = Number(object.customMetadata?.failures)
            const retryAt = Number(object.customMetadata?.retryAt)
            snapshot.failures = Number.isSafeInteger(failures) && failures > 0 ? failures : 0
            snapshot.retryAt = Number.isSafeInteger(retryAt) && retryAt > 0 ? retryAt : 0
          } else if (object.key.startsWith(TASK_PREFIX) && snapshot.tasks.length < SNAPSHOT_TASK_LIMIT) {
            snapshot.tasks.push({ id: object.key.slice(TASK_PREFIX.length), recordedAt: object.uploaded })
          }
        }
        cursor = page.truncated ? page.cursor : undefined
      } while (cursor && snapshot.tasks.length < SNAPSHOT_TASK_LIMIT)
      return snapshot
    },
    async track(taskId) { await bucket.put(`${TASK_PREFIX}${taskId}`, '') },
    async remove(taskIds) {
      const keys = [taskIds].flat().map(taskId => `${TASK_PREFIX}${taskId}`)
      for (let offset = 0; offset < keys.length; offset += 1000) await bucket.delete(keys.slice(offset, offset + 1000))
    },
    async checkpoint(afterId) { await bucket.put(BOOTSTRAP_KEY, '', { customMetadata: { afterId } }) },
    async initialize() { await bucket.put(INITIALIZED_KEY, '1') },
    async defer(now, failures) {
      const delay = Math.min(15, 2 ** Math.min(Math.max(failures - 1, 0), 4)) * 60_000
      await bucket.put(RETRY_KEY, '', { customMetadata: { failures: String(failures), retryAt: String(now.getTime() + delay) } })
    },
    async clearRetry() { await bucket.delete(RETRY_KEY) },
  }
}

export function createTrackedVideoTaskStore(
  store: VideoGenerationTaskStore,
  activity: VideoTaskActivity,
  logger: (message: string) => void = console.error,
): VideoGenerationTaskStore {
  async function removeSafely(taskIds: string | string[]) {
    try { await activity.remove(taskIds) }
    catch {
      try { logger(JSON.stringify({ event: 'video_activity_cleanup_deferred', count: [taskIds].flat().length })) }
      catch { /* Logging cannot undo a completed settlement or refund. */ }
    }
  }
  async function releaseTerminal(task: VideoGenerationTask) {
    if (TERMINAL.has(task.status)) await removeSafely(task.id)
  }
  return {
    ...store,
    async reserveAndCreate(userId, credits, metadata) {
      const taskId = crypto.randomUUID()
      // Persist recovery before SQL. A crash after debit must never hide a pending task.
      await activity.track(taskId)
      const result = await store.reserveAndCreate(userId, credits, metadata, taskId)
      if (!result) await removeSafely(taskId)
      return result
    },
    async finalizeSubmissionFailure(...args) {
      const result = await store.finalizeSubmissionFailure(...args)
      await releaseTerminal(result.task)
      return result
    },
    async finalizeSuccess(...args) {
      const result = await store.finalizeSuccess(...args)
      await releaseTerminal(result.task)
      return result
    },
    async finalizeFailure(...args) {
      const result = await store.finalizeFailure(...args)
      await releaseTerminal(result.task)
      return result
    },
    async expireOverdue(...args) {
      const expired = await store.expireOverdue(...args)
      const terminalIds = expired.filter(task => TERMINAL.has(task.status)).map(task => task.id)
      if (terminalIds.length) await removeSafely(terminalIds)
      return expired
    },
  }
}
