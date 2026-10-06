import { eq, sql } from 'drizzle-orm'
import type { GenerationCreditStore } from '../lib/generation-credits'
import type { Database } from './index'
import { generationCreditReservation, user } from './schema'
import { availableDailyCredits, creditDay, creditRefundAccount, effectiveCreditBalance, reservationRefundFields } from './daily-credit-sql'

type ReservationRow = {
  id: string
  remaining_credits: number | string
}

type BalanceRow = {
  remaining_credits: number | string
}

function numericBalance(value: number | string | undefined) {
  const balance = Number(value)
  if (!Number.isSafeInteger(balance) || balance < 0) {
    throw new Error('Credit balance is invalid.')
  }
  return balance
}

async function refundStaleReservations(db: Database, userId: string) {
  await db.execute(sql`
    WITH expired AS (
      UPDATE "generation_credit_reservation" AS reservation
      SET "status" = 'refunded', "updated_at" = now()
      WHERE "user_id" = ${userId}
        AND "status" = 'reserved'
        AND "created_at" < now() - (15 * interval '1 minute')
        AND NOT EXISTS (
          SELECT 1
          FROM "video_generation_task"
          WHERE "video_generation_task"."reservation_id" = reservation."id"
            AND "video_generation_task"."status" IN ('submitting', 'queued', 'running')
        )
      RETURNING ${reservationRefundFields('reservation')}
    ), refund_total AS (
      SELECT "user_id", SUM("permanent_credits")::integer AS "permanent_credits",
             SUM("today_free_credits")::integer AS "today_free_credits"
      FROM expired
      GROUP BY "user_id"
    )
    ${creditRefundAccount('refund_total')}
  `)
}

export function createGenerationCreditStore(db: Database): GenerationCreditStore {
  return {
    async reserve(userId, credits) {
      if (!Number.isSafeInteger(credits) || credits <= 0) {
        throw new Error('Credit reservation amount must be a positive integer.')
      }

      await refundStaleReservations(db, userId)
      const reservationId = crypto.randomUUID()
      const result = await db.execute<ReservationRow>(sql`
        WITH account_plan AS MATERIALIZED (
          SELECT account."id", ${effectiveCreditBalance('account')} AS "balance",
                 ${availableDailyCredits('account')} AS "daily_credits"
          FROM "user" AS account WHERE account."id" = ${userId}
          FOR UPDATE OF account
        ), debited AS (
          UPDATE "user" AS account
          SET "credit_balance" = account_plan."balance" - ${credits},
              "daily_free_credits" = GREATEST(account_plan."daily_credits" - ${credits}, 0),
              "daily_credit_date" = ${creditDay},
              "updated_at" = now()
          FROM account_plan
          WHERE account."id" = account_plan."id" AND account_plan."balance" >= ${credits}
          RETURNING account."id", account."credit_balance",
                    LEAST(${credits}, account_plan."daily_credits") AS "daily_debit"
        )
        INSERT INTO "generation_credit_reservation" (
          "id", "user_id", "credits", "daily_free_credits", "daily_credit_date", "status", "created_at", "updated_at"
        )
        SELECT ${reservationId}, "id", ${credits}, "daily_debit", ${creditDay}, 'reserved', now(), now()
        FROM debited
        RETURNING "id", (SELECT "credit_balance" FROM debited) AS "remaining_credits"
      `)
      const reservation = result.rows[0]
      if (!reservation) return null
      return {
        id: reservation.id,
        remainingCredits: numericBalance(reservation.remaining_credits),
      }
    },

    async settle(reservationId) {
      await db.execute(sql`
        WITH settled AS (
          UPDATE "generation_credit_reservation" AS reservation
          SET "status" = 'settled', "updated_at" = now()
          WHERE "id" = ${reservationId}
            AND "status" = 'reserved'
          RETURNING "user_id"
        )
        UPDATE "user"
        SET "generation_count" = "generation_count" + 1,
            "monthly_generation_count" = "monthly_generation_count" + 1,
            "updated_at" = now()
        FROM settled
        WHERE "user"."id" = settled."user_id"
      `)
    },

    async refund(reservationId) {
      const result = await db.execute<BalanceRow>(sql`
        WITH refunded AS (
          UPDATE "generation_credit_reservation" AS reservation
          SET "status" = 'refunded', "updated_at" = now()
          WHERE "id" = ${reservationId}
            AND "status" = 'reserved'
          RETURNING ${reservationRefundFields('reservation')}
        ), credited AS (
          ${creditRefundAccount('refunded')}
        )
        SELECT "credit_balance" AS "remaining_credits"
        FROM credited
      `)
      const refunded = result.rows[0]
      if (refunded) {
        return { remainingCredits: numericBalance(refunded.remaining_credits) }
      }

      const current = await db.select({
        remainingCredits: sql<number>`${effectiveCreditBalance('user')}`,
      }).from(generationCreditReservation)
        .innerJoin(user, eq(user.id, generationCreditReservation.userId))
        .where(eq(generationCreditReservation.id, reservationId))
        .limit(1)
      if (!current[0]) throw new Error('Credit reservation was not found.')
      return { remainingCredits: numericBalance(current[0].remainingCredits) }
    },

    async getBalance(userId) {
      return getCurrentCreditBalance(db, userId)
    },
  }
}

export async function getCurrentCreditBalance(db: Database, userId: string) {
  const result = await db.execute<BalanceRow>(sql`
    UPDATE "user" AS account
    SET "credit_balance" = ${effectiveCreditBalance('account')},
        "daily_free_credits" = ${availableDailyCredits('account')},
        "daily_credit_date" = ${creditDay}
    WHERE account."id" = ${userId}
    RETURNING account."credit_balance" AS "remaining_credits"
  `)
  return result.rows[0] ? numericBalance(result.rows[0].remaining_credits) : 0
}
