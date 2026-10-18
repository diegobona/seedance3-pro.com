import type { VideoGenerationTask, VideoGenerationTaskStore, VideoTaskTransitionResult } from '../lib/protected-video-generation'
import { D1_NOW_SQL, d1EffectiveCreditBalance, getD1CurrentCreditBalance, prepareD1CreditReservation } from './d1-generation-credits'

type TaskRow = Record<string, string | number | null>
const ACTIVE = "('submitting','queued','running')"
const POLLABLE = "('queued','running')"

function mapTask(row: TaskRow): VideoGenerationTask {
  const date = (key: string) => row[key] == null ? null : new Date(Number(row[key]))
  return {
    id: String(row.id), userId: String(row.user_id), reservationId: String(row.reservation_id),
    providerTaskId: row.provider_task_id as string | null, workflowId: String(row.workflow_id),
    duration: Number(row.duration), resolution: String(row.resolution), aspectRatio: String(row.aspect_ratio),
    status: row.status as VideoGenerationTask['status'], resultUrl: row.result_url as string | null,
    providerError: row.provider_error as string | null, pollAttempts: Number(row.poll_attempts),
    nextPollAt: date('next_poll_at'), leaseUntil: date('lease_until'), lastPolledAt: date('last_polled_at'),
    createdAt: date('created_at')!, updatedAt: date('updated_at')!, completedAt: date('completed_at'),
  }
}
function transition(row: TaskRow | undefined): VideoTaskTransitionResult {
  if (!row) throw new Error('Video generation task was not found.')
  const remainingCredits = Number(row.remaining_credits)
  if (!Number.isSafeInteger(remainingCredits) || remainingCredits < 0) throw new Error('Credit balance is invalid.')
  return { task: mapTask(row), remainingCredits }
}
function errorMessage(message: unknown) {
  return (typeof message === 'string' && message ? message : 'Video provider request failed.').slice(0, 500)
}

export function createD1VideoGenerationTaskStore(db: D1Database): VideoGenerationTaskStore {
  const current = (id: string, reservationId?: string) => db.prepare(`SELECT task.*, ${d1EffectiveCreditBalance()} AS remaining_credits
    FROM video_generation_task AS task JOIN "user" AS account ON account.id=task.user_id WHERE task.id=?
    ${reservationId ? 'AND task.reservation_id=?' : ''}`).bind(...(reservationId ? [id, reservationId] : [id]))
  async function updatePoll(id: string, status: 'queued' | 'running', now: Date, retry: number | undefined, lease: Date | undefined) {
    const retryMs = typeof retry === 'number' && Number.isFinite(retry) ? Math.max(0, Math.min(60_000, Math.floor(retry * 1000))) : 0
    const results = await db.batch<TaskRow>([
      db.prepare(`UPDATE video_generation_task SET status=?, poll_attempts=poll_attempts+1,
        last_polled_at=?, next_poll_at=? + min(60000,max(5000,5000 * (1 << min(poll_attempts,16)),?)),
        lease_until=NULL,updated_at=?
        WHERE id=? AND status IN ${POLLABLE} AND provider_task_id IS NOT NULL AND lease_until=?`)
        .bind(status, now.getTime(), now.getTime(), retryMs, now.getTime(), id, lease?.getTime() ?? null),
      current(id),
    ])
    return transition(results[1].results[0]).task
  }
  async function finalize(id: string, succeeded: boolean, messageOrUrl: string, lease: Date) {
    const status = succeeded ? 'succeeded' : 'failed'
    const results = await db.batch<TaskRow>([
      db.prepare(`UPDATE video_generation_task SET status=?,result_url=?,provider_error=?,
        next_poll_at=NULL,lease_until=NULL,completed_at=${D1_NOW_SQL},updated_at=${D1_NOW_SQL}
        WHERE id=? AND status IN ${POLLABLE} AND lease_until=?
          AND EXISTS(SELECT 1 FROM generation_credit_reservation AS reservation
            WHERE reservation.id=video_generation_task.reservation_id AND reservation.status='reserved')`)
        .bind(status, succeeded ? messageOrUrl : null, succeeded ? null : errorMessage(messageOrUrl), id, lease.getTime()),
      db.prepare(`UPDATE generation_credit_reservation SET status=?,updated_at=${D1_NOW_SQL}
        WHERE status='reserved' AND id=(SELECT reservation_id FROM video_generation_task WHERE id=? AND status=?)`)
        .bind(succeeded ? 'settled' : 'refunded', id, status),
      current(id),
    ])
    return transition(results[2].results[0])
  }
  return {
    async reserveAndCreate(userId, credits, metadata, localTaskId = crypto.randomUUID()) {
      const reservationId = crypto.randomUUID()
      const results = await db.batch<TaskRow>([
        ...prepareD1CreditReservation(db, userId, credits, reservationId),
        db.prepare(`INSERT INTO video_generation_task
          (id,user_id,reservation_id,workflow_id,duration,resolution,aspect_ratio,status,poll_attempts,created_at,updated_at)
          SELECT ?,user_id,id,?,?,?,?, 'submitting',0,${D1_NOW_SQL},${D1_NOW_SQL}
          FROM generation_credit_reservation WHERE id=?`)
          .bind(localTaskId, metadata.workflowId, metadata.duration, metadata.resolution, metadata.aspectRatio, reservationId),
        current(localTaskId, reservationId),
      ])
      const row = results[results.length - 1].results[0]
      return row ? transition(row) : null
    },
    async listUnfinishedTasks(afterId, limit = 100) {
      const rows = await db.prepare(`SELECT id,status FROM video_generation_task WHERE status IN ${ACTIVE}
        AND (? IS NULL OR id>?) ORDER BY id LIMIT ?`).bind(afterId ?? null, afterId ?? null, Math.min(100, Math.max(1, limit))).all<TaskRow>()
      return rows.results.map(row => ({ id: String(row.id), status: row.status as VideoGenerationTask['status'] }))
    },
    async getTaskStates(ids) {
      const states: Array<Pick<VideoGenerationTask, 'id' | 'status'>> = []
      for (let offset = 0; offset < ids.length; offset += 100) {
        const page = ids.slice(offset, offset + 100)
        const rows = await db.prepare(`SELECT id,status FROM video_generation_task WHERE id IN (${page.map(() => '?').join(',')})`).bind(...page).all<TaskRow>()
        states.push(...rows.results.map(row => ({ id: String(row.id), status: row.status as VideoGenerationTask['status'] })))
      }
      return states
    },
    async attachProviderTask(id, providerId) {
      if (!providerId.trim()) throw new Error('Provider task ID is required.')
      const row = await db.prepare(`UPDATE video_generation_task SET provider_task_id=coalesce(provider_task_id,?),
        status=CASE WHEN status='submitting' THEN 'queued' ELSE status END,
        next_poll_at=CASE WHEN status='submitting' THEN ${D1_NOW_SQL} ELSE next_poll_at END,
        updated_at=CASE WHEN status='submitting' THEN ${D1_NOW_SQL} ELSE updated_at END
        WHERE id=? AND ((status='submitting' AND provider_task_id IS NULL) OR provider_task_id=?) RETURNING *`)
        .bind(providerId, id, providerId).first<TaskRow>()
      if (row) return mapTask(row)
      throw new Error('Video generation task cannot accept a provider task.')
    },
    async finalizeSubmissionFailure(id, status, message) {
      const results = await db.batch<TaskRow>([
        db.prepare(`UPDATE video_generation_task SET status=?,provider_error=?,next_poll_at=NULL,lease_until=NULL,
          completed_at=${D1_NOW_SQL},updated_at=${D1_NOW_SQL} WHERE id=? AND status='submitting'
          AND EXISTS(SELECT 1 FROM generation_credit_reservation AS reservation
            WHERE reservation.id=video_generation_task.reservation_id AND reservation.status='reserved')`)
          .bind(status, errorMessage(message), id),
        db.prepare(`UPDATE generation_credit_reservation SET status='refunded',updated_at=${D1_NOW_SQL}
          WHERE status='reserved' AND id=(SELECT reservation_id FROM video_generation_task WHERE id=? AND status=?)`).bind(id, status),
        current(id),
      ])
      const result = transition(results[2].results[0])
      if (result.task.status !== status) throw new Error('Video submission is no longer pending.')
      return result
    },
    async getForUser(id, userId) {
      const row = await db.prepare('SELECT * FROM video_generation_task WHERE id=? AND user_id=?').bind(id, userId).first<TaskRow>()
      return row ? mapTask(row) : null
    },
    async claimForPoll(id, userId, now, duration) {
      const row = await db.prepare(`UPDATE video_generation_task SET lease_until=?,updated_at=?
        WHERE id=? AND user_id=? AND provider_task_id IS NOT NULL AND status IN ${POLLABLE}
        AND next_poll_at<=? AND (lease_until IS NULL OR lease_until<=?) RETURNING *`)
        .bind(now.getTime() + Math.max(1, duration), now.getTime(), id, userId, now.getTime(), now.getTime()).first<TaskRow>()
      return row ? mapTask(row) : null
    },
    async claimPending(limit, now = new Date(), duration = 30_000) {
      if (!Number.isSafeInteger(limit) || limit <= 0) return []
      const result = await db.prepare(`UPDATE video_generation_task SET lease_until=?,updated_at=? WHERE id IN
        (SELECT id FROM video_generation_task WHERE provider_task_id IS NOT NULL AND status IN ${POLLABLE}
          AND next_poll_at<=? AND (lease_until IS NULL OR lease_until<=?)
          ORDER BY next_poll_at,created_at,id LIMIT ?) RETURNING *`)
        .bind(now.getTime() + Math.max(1, duration), now.getTime(), now.getTime(), now.getTime(), limit).all<TaskRow>()
      return result.results.map(mapTask).sort((a, b) => a.nextPollAt!.getTime() - b.nextPollAt!.getTime() || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
    },
    scheduleNextPoll: updatePoll,
    markRunning(id, now, retry, lease) { return updatePoll(id, 'running', now, retry, lease) },
    finalizeSuccess(id, url, lease) { return finalize(id, true, url, lease) },
    finalizeFailure(id, message, lease) { return finalize(id, false, message, lease) },
    async expireOverdue(now = new Date()) {
      const result = await db.batch<TaskRow>([
        db.prepare(`UPDATE video_generation_task SET status='expired',result_url=NULL,next_poll_at=NULL,
          lease_until=NULL,completed_at=?,updated_at=? WHERE status IN ${ACTIVE} AND created_at<? RETURNING *`)
          .bind(now.getTime(), now.getTime(), now.getTime() - 2 * 60 * 60_000),
        db.prepare(`UPDATE generation_credit_reservation SET status='refunded',updated_at=? WHERE status='reserved'
          AND EXISTS (SELECT 1 FROM video_generation_task AS task
            WHERE task.reservation_id=generation_credit_reservation.id AND task.status='expired' AND task.completed_at=?)`)
          .bind(now.getTime(), now.getTime()),
      ])
      return result[0].results.map(mapTask).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
    },
    getBalance(userId) { return getD1CurrentCreditBalance(db, userId) },
  }
}
