import { eq, sql } from 'drizzle-orm'
import type { GenerationCreditStore } from '../lib/generation-credits'
import type { Database } from './index'
import { generationCreditReservation, user } from './schema'

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
      UPDATE "generation_credit_reservation"
      SET "status" = 'refunded', "updated_at" = now()
      WHERE "user_id" = ${userId}
        AND "status" = 'reserved'
        AND "created_at" < now() - (15 * interval '1 minute')
        AND NOT EXISTS (
          SELECT 1
          FROM "video_generation_task"
          WHERE "video_generation_task"."reservation_id" = "generation_credit_reservation"."id"
            AND "video_generation_task"."status" IN ('submitting', 'queued', 'running')
        )
      RETURNING "credits"
    ), refund_total AS (
      SELECT COALESCE(SUM("credits"), 0)::integer AS "credits"
      FROM expired
    )
    UPDATE "user"
    SET "credit_balance" = "credit_balance" + refund_total."credits",
        "updated_at" = now()
    FROM refund_total
    WHERE "user"."id" = ${userId}
      AND refund_total."credits" > 0
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
        WITH debited AS (
          UPDATE "user"
          SET "credit_balance" = "credit_balance" - ${credits},
              "updated_at" = now()
          WHERE "id" = ${userId}
            AND "credit_balance" >= ${credits}
          RETURNING "id", "credit_balance"
        )
        INSERT INTO "generation_credit_reservation" (
          "id", "user_id", "credits", "status", "created_at", "updated_at"
        )
        SELECT ${reservationId}, "id", ${credits}, 'reserved', now(), now()
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
          UPDATE "generation_credit_reservation"
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
          UPDATE "generation_credit_reservation"
          SET "status" = 'refunded', "updated_at" = now()
          WHERE "id" = ${reservationId}
            AND "status" = 'reserved'
          RETURNING "user_id", "credits"
        ), credited AS (
          UPDATE "user"
          SET "credit_balance" = "credit_balance" + refunded."credits",
              "updated_at" = now()
          FROM refunded
          WHERE "user"."id" = refunded."user_id"
          RETURNING "user"."credit_balance"
        )
        SELECT "credit_balance" AS "remaining_credits"
        FROM credited
      `)
      const refunded = result.rows[0]
      if (refunded) {
        return { remainingCredits: numericBalance(refunded.remaining_credits) }
      }

      const current = await db.select({
        remainingCredits: user.creditBalance,
      }).from(generationCreditReservation)
        .innerJoin(user, eq(user.id, generationCreditReservation.userId))
        .where(eq(generationCreditReservation.id, reservationId))
        .limit(1)
      if (!current[0]) throw new Error('Credit reservation was not found.')
      return { remainingCredits: numericBalance(current[0].remainingCredits) }
    },

    async getBalance(userId) {
      const account = await db.select({
        balance: user.creditBalance,
      }).from(user).where(eq(user.id, userId)).limit(1)
      return account[0] ? numericBalance(account[0].balance) : 0
    },
  }
}
