import { and, eq, sql } from 'drizzle-orm'
import type {
  VideoGenerationTask,
  VideoGenerationTaskStatus,
  VideoGenerationTaskStore,
  VideoTaskMetadata,
  VideoTaskTransitionResult,
} from '../lib/protected-video-generation'
import type { Database } from './index'
import { user, videoGenerationTask } from './schema'

const TERMINAL_STATUSES = new Set<VideoGenerationTaskStatus>([
  'submission_unknown',
  'succeeded',
  'failed',
  'expired',
])
const MAX_PROVIDER_ERROR_LENGTH = 500
const MIN_POLL_DELAY_MS = 5_000
const MAX_POLL_DELAY_MS = 60_000
const DEFAULT_LEASE_MS = 30_000
const VIDEO_EXPIRY_MS = 2 * 60 * 60_000

type TaskRow = {
  id: string
  user_id: string
  reservation_id: string
  provider_task_id: string | null
  workflow_id: string
  duration: number
  resolution: string
  aspect_ratio: string
  status: VideoGenerationTaskStatus
  result_url: string | null
  provider_error: string | null
  poll_attempts: number
  next_poll_at: Date | string | null
  lease_until: Date | string | null
  last_polled_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
  completed_at: Date | string | null
  remaining_credits?: number | string
}

function toDate(value: Date | string): Date
function toDate(value: Date | string | null): Date | null
function toDate(value: Date | string | null) {
  return value === null ? null : value instanceof Date ? value : new Date(value)
}

function mapTask(row: TaskRow): VideoGenerationTask {
  return {
    id: row.id,
    userId: row.user_id,
    reservationId: row.reservation_id,
    providerTaskId: row.provider_task_id,
    workflowId: row.workflow_id,
    duration: Number(row.duration),
    resolution: row.resolution,
    aspectRatio: row.aspect_ratio,
    status: row.status,
    resultUrl: row.result_url,
    providerError: row.provider_error,
    pollAttempts: Number(row.poll_attempts),
    nextPollAt: toDate(row.next_poll_at),
    leaseUntil: toDate(row.lease_until),
    lastPolledAt: toDate(row.last_polled_at),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    completedAt: toDate(row.completed_at),
  }
}

function numericBalance(value: number | string | undefined) {
  const balance = Number(value)
  if (!Number.isSafeInteger(balance) || balance < 0) throw new Error('Credit balance is invalid.')
  return balance
}

export function boundProviderError(message: unknown) {
  const normalized = typeof message === 'string' && message
    ? message
    : 'Video provider request failed.'
  return normalized.slice(0, MAX_PROVIDER_ERROR_LENGTH)
}

export function getVideoPollDelayMs(pollAttempts: number, retryAfterSeconds?: number) {
  const attempts = Number.isSafeInteger(pollAttempts) && pollAttempts > 0 ? pollAttempts : 0
  const exponential = Math.min(MAX_POLL_DELAY_MS, MIN_POLL_DELAY_MS * (2 ** Math.min(attempts, 16)))
  const retryAfter = typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds)
    ? Math.max(0, retryAfterSeconds * 1_000)
    : 0
  return Math.min(MAX_POLL_DELAY_MS, Math.max(exponential, retryAfter))
}

async function taskAndBalance(db: Database, localTaskId: string): Promise<VideoTaskTransitionResult> {
  const rows = await db.select({
    task: videoGenerationTask,
    remainingCredits: user.creditBalance,
  }).from(videoGenerationTask)
    .innerJoin(user, eq(user.id, videoGenerationTask.userId))
    .where(eq(videoGenerationTask.id, localTaskId))
    .limit(1)
  const row = rows[0]
  if (!row) throw new Error('Video generation task was not found.')
  return { task: row.task as VideoGenerationTask, remainingCredits: numericBalance(row.remainingCredits) }
}

async function updatePollState(
  db: Database,
  localTaskId: string,
  status: 'queued' | 'running',
  now: Date,
  retryAfterSeconds?: number,
  expectedLeaseUntil?: Date,
) {
  const retryAfterMs = typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds)
    ? Math.max(0, Math.floor(retryAfterSeconds * 1_000))
    : 0
  const result = await db.execute<TaskRow>(sql`
    UPDATE "video_generation_task"
    SET "status" = ${status},
        "poll_attempts" = "poll_attempts" + 1,
        "last_polled_at" = ${now},
        "next_poll_at" = ${now} + (
          LEAST(
            ${MAX_POLL_DELAY_MS},
            GREATEST(
              ${MIN_POLL_DELAY_MS},
              ${MIN_POLL_DELAY_MS} * POWER(2, LEAST("poll_attempts", 16)),
              ${retryAfterMs}
            )
          ) * interval '1 millisecond'
        ),
        "lease_until" = NULL,
        "updated_at" = ${now}
    WHERE "id" = ${localTaskId}
      AND "status" IN ('queued', 'running')
      AND "provider_task_id" IS NOT NULL
      AND "lease_until" = ${expectedLeaseUntil ?? null}
    RETURNING *
  `)
  const row = result.rows[0]
  if (row) return mapTask(row)
  return (await taskAndBalance(db, localTaskId)).task
}

export function createVideoGenerationTaskStore(db: Database): VideoGenerationTaskStore {
  return {
    async reserveAndCreate(userId: string, credits: number, metadata: VideoTaskMetadata) {
      if (!Number.isSafeInteger(credits) || credits <= 0) {
        throw new Error('Credit reservation amount must be a positive integer.')
      }
      const reservationId = crypto.randomUUID()
      const localTaskId = crypto.randomUUID()
      const result = await db.execute<TaskRow>(sql`
        WITH stale AS (
          UPDATE "generation_credit_reservation" AS reservation
          SET "status" = 'refunded', "updated_at" = now()
          WHERE reservation."user_id" = ${userId}
            AND reservation."status" = 'reserved'
            AND reservation."created_at" < now() - (15 * interval '1 minute')
            AND NOT EXISTS (
              SELECT 1
              FROM "video_generation_task" AS video
              WHERE video."reservation_id" = reservation."id"
                AND video."status" IN ('submitting', 'queued', 'running')
            )
          RETURNING "credits"
        ), refund_total AS (
          SELECT COALESCE(SUM("credits"), 0)::integer AS "credits"
          FROM stale
        ), account_plan AS MATERIALIZED (
          SELECT account."id", refund_total."credits" AS "refund_credits",
                 account."credit_balance" + refund_total."credits" >= ${credits} AS "can_reserve"
          FROM "user" AS account
          CROSS JOIN refund_total
          WHERE account."id" = ${userId}
          FOR UPDATE OF account
        ), debited AS (
          UPDATE "user" AS account
          SET "credit_balance" = account."credit_balance" + account_plan."refund_credits"
                - CASE WHEN account_plan."can_reserve" THEN ${credits} ELSE 0 END,
              "updated_at" = now()
          FROM account_plan
          WHERE account."id" = account_plan."id"
          RETURNING account."id", account."credit_balance", account_plan."can_reserve"
        ), reservation AS (
          INSERT INTO "generation_credit_reservation" (
            "id", "user_id", "credits", "status", "created_at", "updated_at"
          )
          SELECT ${reservationId}, "id", ${credits}, 'reserved', now(), now()
          FROM debited
          WHERE "can_reserve"
          RETURNING "id", "user_id"
        ), task AS (
          INSERT INTO "video_generation_task" (
            "id", "user_id", "reservation_id", "workflow_id", "duration",
            "resolution", "aspect_ratio", "status", "poll_attempts", "created_at", "updated_at"
          )
          SELECT ${localTaskId}, "user_id", "id", ${metadata.workflowId}, ${metadata.duration},
                 ${metadata.resolution}, ${metadata.aspectRatio}, 'submitting', 0, now(), now()
          FROM reservation
          RETURNING *
        )
        SELECT task.*, debited."credit_balance" AS "remaining_credits"
        FROM task
        JOIN debited ON debited."id" = task."user_id"
      `)
      const row = result.rows[0]
      if (!row) return null
      return { task: mapTask(row), remainingCredits: numericBalance(row.remaining_credits) }
    },

    async attachProviderTask(localTaskId, providerTaskId) {
      if (!providerTaskId.trim()) throw new Error('Provider task ID is required.')
      const result = await db.execute<TaskRow>(sql`
        UPDATE "video_generation_task"
        SET "provider_task_id" = COALESCE("provider_task_id", ${providerTaskId}),
            "status" = CASE WHEN "status" = 'submitting' THEN 'queued' ELSE "status" END,
            "next_poll_at" = CASE WHEN "status" = 'submitting' THEN now() ELSE "next_poll_at" END,
            "updated_at" = CASE WHEN "status" = 'submitting' THEN now() ELSE "updated_at" END
        WHERE "id" = ${localTaskId}
          AND (
            ("status" = 'submitting' AND "provider_task_id" IS NULL)
            OR "provider_task_id" = ${providerTaskId}
          )
        RETURNING *
      `)
      if (result.rows[0]) return mapTask(result.rows[0])
      const current = await db.select().from(videoGenerationTask)
        .where(eq(videoGenerationTask.id, localTaskId)).limit(1)
      if (!current[0]) throw new Error('Video generation task was not found.')
      if (current[0].providerTaskId && current[0].providerTaskId !== providerTaskId) {
        throw new Error('Video generation task is attached to a different provider task.')
      }
      throw new Error('Video generation task cannot accept a provider task.')
    },

    async finalizeSubmissionFailure(localTaskId, status, message) {
      const result = await db.execute<TaskRow>(sql`
        WITH finalized AS (
          UPDATE "video_generation_task" AS task
          SET "status" = ${status}, "provider_error" = ${boundProviderError(message)},
              "next_poll_at" = NULL, "lease_until" = NULL,
              "completed_at" = now(), "updated_at" = now()
          FROM "generation_credit_reservation" AS reservation
          WHERE task."id" = ${localTaskId}
            AND task."status" = 'submitting'
            AND reservation."id" = task."reservation_id"
            AND reservation."status" = 'reserved'
          RETURNING task.*
        ), refunded AS (
          UPDATE "generation_credit_reservation" AS reservation
          SET "status" = 'refunded', "updated_at" = now()
          FROM finalized
          WHERE reservation."id" = finalized."reservation_id"
            AND reservation."status" = 'reserved'
          RETURNING reservation."user_id", reservation."credits"
        ), credited AS (
          UPDATE "user" AS account
          SET "credit_balance" = account."credit_balance" + refunded."credits",
              "updated_at" = now()
          FROM refunded
          WHERE account."id" = refunded."user_id"
          RETURNING account."credit_balance"
        )
        SELECT finalized.*, credited."credit_balance" AS "remaining_credits"
        FROM finalized, credited
      `)
      if (result.rows[0]) {
        return { task: mapTask(result.rows[0]), remainingCredits: numericBalance(result.rows[0].remaining_credits) }
      }
      const current = await taskAndBalance(db, localTaskId)
      if (current.task.status !== status) throw new Error('Video submission is no longer pending.')
      return current
    },

    async getForUser(localTaskId, userId) {
      const rows = await db.select().from(videoGenerationTask)
        .where(and(eq(videoGenerationTask.id, localTaskId), eq(videoGenerationTask.userId, userId)))
        .limit(1)
      return (rows[0] as VideoGenerationTask | undefined) ?? null
    },

    async claimForPoll(localTaskId, userId, now, leaseDurationMs) {
      const leaseUntil = new Date(now.getTime() + Math.max(1, leaseDurationMs))
      const result = await db.execute<TaskRow>(sql`
        UPDATE "video_generation_task"
        SET "lease_until" = ${leaseUntil}, "updated_at" = ${now}
        WHERE "id" = ${localTaskId}
          AND "user_id" = ${userId}
          AND "provider_task_id" IS NOT NULL
          AND "status" IN ('queued', 'running')
          AND "next_poll_at" <= ${now}
          AND ("lease_until" IS NULL OR "lease_until" <= ${now})
        RETURNING *
      `)
      return result.rows[0] ? mapTask(result.rows[0]) : null
    },

    async claimPending(limit, now = new Date(), leaseDurationMs = DEFAULT_LEASE_MS) {
      if (!Number.isSafeInteger(limit) || limit <= 0) return []
      const leaseUntil = new Date(now.getTime() + Math.max(1, leaseDurationMs))
      const result = await db.execute<TaskRow>(sql`
        WITH candidates AS (
          SELECT "id"
          FROM "video_generation_task"
          WHERE "provider_task_id" IS NOT NULL
            AND "status" IN ('queued', 'running')
            AND "next_poll_at" <= ${now}
            AND ("lease_until" IS NULL OR "lease_until" <= ${now})
          ORDER BY "next_poll_at", "created_at", "id"
          FOR UPDATE SKIP LOCKED
          LIMIT ${limit}
        ), claimed AS (
          UPDATE "video_generation_task" AS task
          SET "lease_until" = ${leaseUntil}, "updated_at" = ${now}
          FROM candidates
          WHERE task."id" = candidates."id"
          RETURNING task.*
        )
        SELECT * FROM claimed ORDER BY "next_poll_at", "created_at", "id"
      `)
      return result.rows.map(mapTask)
    },

    scheduleNextPoll(localTaskId, status, now, retryAfterSeconds, expectedLeaseUntil) {
      return updatePollState(db, localTaskId, status, now, retryAfterSeconds, expectedLeaseUntil)
    },

    markRunning(localTaskId, now, retryAfterSeconds, expectedLeaseUntil) {
      return updatePollState(db, localTaskId, 'running', now, retryAfterSeconds, expectedLeaseUntil)
    },

    async finalizeSuccess(localTaskId, resultUrl, expectedLeaseUntil) {
      const result = await db.execute<TaskRow>(sql`
        WITH finalized AS (
          UPDATE "video_generation_task" AS task
          SET "status" = 'succeeded', "result_url" = ${resultUrl}, "provider_error" = NULL,
              "next_poll_at" = NULL, "lease_until" = NULL,
              "completed_at" = now(), "updated_at" = now()
          FROM "generation_credit_reservation" AS reservation
          WHERE task."id" = ${localTaskId}
            AND task."status" IN ('queued', 'running')
            AND task."lease_until" = ${expectedLeaseUntil}
            AND task."reservation_id" = reservation."id"
            AND reservation."status" = 'reserved'
          RETURNING task.*
        ), settled AS (
          UPDATE "generation_credit_reservation" AS reservation
          SET "status" = 'settled', "updated_at" = now()
          FROM finalized
          WHERE reservation."id" = finalized."reservation_id"
            AND reservation."status" = 'reserved'
          RETURNING reservation."user_id"
        ), counted AS (
          UPDATE "user" AS account
          SET "generation_count" = account."generation_count" + 1,
              "monthly_generation_count" = account."monthly_generation_count" + 1,
              "updated_at" = now()
          FROM settled
          WHERE account."id" = settled."user_id"
          RETURNING account."credit_balance"
        )
        SELECT finalized.*, counted."credit_balance" AS "remaining_credits"
        FROM finalized, counted
      `)
      if (result.rows[0]) {
        return { task: mapTask(result.rows[0]), remainingCredits: numericBalance(result.rows[0].remaining_credits) }
      }
      return taskAndBalance(db, localTaskId)
    },

    async finalizeFailure(localTaskId, message, expectedLeaseUntil) {
      const result = await db.execute<TaskRow>(sql`
        WITH finalized AS (
          UPDATE "video_generation_task" AS task
          SET "status" = 'failed', "provider_error" = ${boundProviderError(message)},
              "result_url" = NULL, "next_poll_at" = NULL, "lease_until" = NULL,
              "completed_at" = now(), "updated_at" = now()
          FROM "generation_credit_reservation" AS reservation
          WHERE task."id" = ${localTaskId}
            AND task."status" IN ('queued', 'running')
            AND task."lease_until" = ${expectedLeaseUntil}
            AND task."reservation_id" = reservation."id"
            AND reservation."status" = 'reserved'
          RETURNING task.*
        ), refunded AS (
          UPDATE "generation_credit_reservation" AS reservation
          SET "status" = 'refunded', "updated_at" = now()
          FROM finalized
          WHERE reservation."id" = finalized."reservation_id"
            AND reservation."status" = 'reserved'
          RETURNING reservation."user_id", reservation."credits"
        ), credited AS (
          UPDATE "user" AS account
          SET "credit_balance" = account."credit_balance" + refunded."credits",
              "updated_at" = now()
          FROM refunded
          WHERE account."id" = refunded."user_id"
          RETURNING account."credit_balance"
        )
        SELECT finalized.*, credited."credit_balance" AS "remaining_credits"
        FROM finalized, credited
      `)
      if (result.rows[0]) {
        return { task: mapTask(result.rows[0]), remainingCredits: numericBalance(result.rows[0].remaining_credits) }
      }
      return taskAndBalance(db, localTaskId)
    },

    async expireOverdue(now = new Date()) {
      const cutoff = new Date(now.getTime() - VIDEO_EXPIRY_MS)
      const result = await db.execute<TaskRow>(sql`
        WITH expired AS (
          UPDATE "video_generation_task"
          SET "status" = 'expired', "result_url" = NULL,
              "next_poll_at" = NULL, "lease_until" = NULL,
              "completed_at" = ${now}, "updated_at" = ${now}
          WHERE "status" IN ('submitting', 'queued', 'running')
            AND "created_at" < ${cutoff}
          RETURNING *
        ), refunded AS (
          UPDATE "generation_credit_reservation" AS reservation
          SET "status" = 'refunded', "updated_at" = ${now}
          FROM expired
          WHERE reservation."id" = expired."reservation_id"
            AND reservation."status" = 'reserved'
          RETURNING reservation."user_id", reservation."credits"
        ), refund_totals AS (
          SELECT "user_id", SUM("credits")::integer AS "credits"
          FROM refunded
          GROUP BY "user_id"
        ), credited AS (
          UPDATE "user" AS account
          SET "credit_balance" = account."credit_balance" + refund_totals."credits",
              "updated_at" = ${now}
          FROM refund_totals
          WHERE account."id" = refund_totals."user_id"
        )
        SELECT * FROM expired ORDER BY "created_at", "id"
      `)
      return result.rows.map(mapTask)
    },

    async getBalance(userId) {
      const accounts = await db.select({ balance: user.creditBalance }).from(user)
        .where(eq(user.id, userId)).limit(1)
      return accounts[0] ? numericBalance(accounts[0].balance) : 0
    },
  }
}

export { TERMINAL_STATUSES }
