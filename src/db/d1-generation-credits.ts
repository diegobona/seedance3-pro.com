import type { GenerationCreditStore } from '../lib/generation-credits'

export const D1_NOW_SQL = "CAST(unixepoch('subsec') * 1000 AS INTEGER)"
export const D1_CREDIT_DAY_SQL = "date('now', '+8 hours')"

function accountAlias(alias: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias)) throw new Error('Invalid SQL account alias.')
  return `"${alias}"`
}

export function d1AvailableDailyCredits(alias = 'account') {
  const account = accountAlias(alias)
  return `(CASE WHEN ${account}.daily_credit_date = ${D1_CREDIT_DAY_SQL} THEN ${account}.daily_free_credits
    WHEN ${account}.plan = 'free' THEN 15 ELSE 0 END)`
}

export function d1EffectiveCreditBalance(alias = 'account') {
  const account = accountAlias(alias)
  return `(CASE WHEN ${account}.daily_credit_date IS NOT ${D1_CREDIT_DAY_SQL} THEN
    ${account}.credit_balance - CASE WHEN ${account}.daily_credit_date IS NULL
      THEN CASE WHEN ${account}.plan = 'free' THEN min(${account}.credit_balance, 15) ELSE 0 END
      ELSE ${account}.daily_free_credits END
    + CASE WHEN ${account}.plan = 'free' THEN 15 ELSE 0 END
    ELSE ${account}.credit_balance END)`
}

export function prepareD1CreditRefresh(db: D1Database, userId: string) {
  return db.prepare(`UPDATE "user" AS account
    SET credit_balance = ${d1EffectiveCreditBalance()},
      daily_free_credits = ${d1AvailableDailyCredits()},
      daily_credit_date = ${D1_CREDIT_DAY_SQL}
    WHERE account.id = ? RETURNING credit_balance AS remaining_credits`).bind(userId)
}

export function prepareD1StaleCreditRefund(db: D1Database, userId: string) {
  return db.prepare(`UPDATE generation_credit_reservation
    SET status = 'refunded', updated_at = ${D1_NOW_SQL}
    WHERE user_id = ? AND status = 'reserved' AND created_at < ${D1_NOW_SQL} - 900000
      AND NOT EXISTS (SELECT 1 FROM video_generation_task AS video
        WHERE video.reservation_id = generation_credit_reservation.id
          AND video.status IN ('submitting', 'queued', 'running'))`).bind(userId)
}

/** Append a task insert to these statements and execute one D1 batch to reserve and create atomically. */
export function prepareD1CreditReservation(db: D1Database, userId: string, credits: number, reservationId: string) {
  if (!Number.isSafeInteger(credits) || credits <= 0) {
    throw new Error('Credit reservation amount must be a positive integer.')
  }
  return [
    prepareD1StaleCreditRefund(db, userId),
    prepareD1CreditRefresh(db, userId),
    db.prepare(`INSERT INTO generation_credit_reservation
      (id, user_id, credits, daily_free_credits, daily_credit_date, status, created_at, updated_at)
      SELECT ?, account.id, ?, min(?, ${d1AvailableDailyCredits()}), ${D1_CREDIT_DAY_SQL}, 'reserved', ${D1_NOW_SQL}, ${D1_NOW_SQL}
      FROM "user" AS account WHERE account.id = ? AND ${d1EffectiveCreditBalance()} >= ?`)
      .bind(reservationId, credits, credits, userId, credits),
  ]
}

type BalanceRow = { remaining_credits: number }

function numericBalance(value: unknown) {
  const balance = Number(value)
  if (!Number.isSafeInteger(balance) || balance < 0) throw new Error('Credit balance is invalid.')
  return balance
}

export async function getD1CurrentCreditBalance(db: D1Database, userId: string) {
  const row = await prepareD1CreditRefresh(db, userId).first<BalanceRow>()
  return row ? numericBalance(row.remaining_credits) : 0
}

export function createD1GenerationCreditStore(db: D1Database): GenerationCreditStore {
  return {
    async reserve(userId, credits) {
      const reservationId = crypto.randomUUID()
      const results = await db.batch<BalanceRow>([
        ...prepareD1CreditReservation(db, userId, credits, reservationId),
        db.prepare(`SELECT account.credit_balance AS remaining_credits
          FROM generation_credit_reservation AS reservation JOIN "user" AS account ON account.id = reservation.user_id
          WHERE reservation.id = ?`).bind(reservationId),
      ])
      const row = results[results.length - 1].results[0]
      return row ? { id: reservationId, remainingCredits: numericBalance(row.remaining_credits) } : null
    },

    async settle(reservationId) {
      await db.prepare(`UPDATE generation_credit_reservation SET status = 'settled', updated_at = ${D1_NOW_SQL}
        WHERE id = ? AND status = 'reserved'`).bind(reservationId).run()
    },

    async refund(reservationId) {
      const results = await db.batch<BalanceRow>([
        db.prepare(`UPDATE generation_credit_reservation SET status = 'refunded', updated_at = ${D1_NOW_SQL}
          WHERE id = ? AND status = 'reserved'`).bind(reservationId),
        db.prepare(`SELECT ${d1EffectiveCreditBalance()} AS remaining_credits
          FROM generation_credit_reservation AS reservation JOIN "user" AS account ON account.id = reservation.user_id
          WHERE reservation.id = ?`).bind(reservationId),
      ])
      const row = results[1].results[0]
      if (!row) throw new Error('Credit reservation was not found.')
      return { remainingCredits: numericBalance(row.remaining_credits) }
    },

    getBalance(userId) {
      return getD1CurrentCreditBalance(db, userId)
    },
  }
}
