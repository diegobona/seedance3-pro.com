import { REGISTERED_FREE_CREDITS_ENABLED } from '../../app/credit-policy.mjs'
import { CreditPolicyError, DAILY_FREE_CREDIT_GRANT, LEGACY_TRIAL_CREDIT_GRANT, type CreditReservationOptions, type CreditBreakdown, type GenerationCreditStore } from '../lib/generation-credits'

export const D1_NOW_SQL = "CAST(unixepoch('subsec') * 1000 AS INTEGER)"
export const D1_CREDIT_DAY_SQL = "date('now', '+8 hours')"

function accountAlias(alias: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias)) throw new Error('Invalid SQL account alias.')
  return `"${alias}"`
}

export function d1AvailableDailyCredits(alias = 'account') {
  if (!REGISTERED_FREE_CREDITS_ENABLED) return '0'
  const account = accountAlias(alias)
  return `(CASE WHEN ${account}.daily_credit_date = ${D1_CREDIT_DAY_SQL} THEN ${account}.daily_free_credits
    WHEN ${account}.plan <> 'guest' THEN ${DAILY_FREE_CREDIT_GRANT} ELSE 0 END)`
}

export function d1EffectiveCreditBalance(alias = 'account') {
  const account = accountAlias(alias)
  if (!REGISTERED_FREE_CREDITS_ENABLED) return `(${account}.credit_balance - CASE
    WHEN ${account}.daily_credit_date IS NULL AND ${account}.plan = 'free'
      THEN min(${account}.credit_balance, ${LEGACY_TRIAL_CREDIT_GRANT})
    ELSE ${account}.daily_free_credits END)`
  return `(CASE WHEN ${account}.daily_credit_date IS NOT ${D1_CREDIT_DAY_SQL} THEN
    ${account}.credit_balance - CASE WHEN ${account}.daily_credit_date IS NULL
      THEN CASE WHEN ${account}.plan = 'free' THEN min(${account}.credit_balance, ${LEGACY_TRIAL_CREDIT_GRANT}) ELSE 0 END
      ELSE ${account}.daily_free_credits END
    + CASE WHEN ${account}.plan <> 'guest' THEN ${DAILY_FREE_CREDIT_GRANT} ELSE 0 END
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
        WHERE video.reservation_id = coalesce(generation_credit_reservation.guest_source_id,generation_credit_reservation.id)
          AND video.status IN ('submitting', 'queued', 'running'))`).bind(userId)
}

/** Append a task insert to these statements and execute one D1 batch to reserve and create atomically. */
export function prepareD1CreditReservation(db: D1Database, userId: string, credits: number, reservationId: string, options: CreditReservationOptions = {}) {
  if (!Number.isSafeInteger(credits) || credits <= 0) {
    throw new Error('Credit reservation amount must be a positive integer.')
  }
  const unitCost = options.unitCostMicros ?? 60_000
  if (!Number.isSafeInteger(unitCost) || unitCost <= 0 || unitCost > 1_000_000) throw new Error('Invalid supplier unit cost.')
  const dailyDebit = options.paidOnly ? '0' : `min(?, ${d1AvailableDailyCredits()})`
  const network = options.networkKey
  if (network !== undefined && !/^[a-f0-9]{64}$/.test(network)) throw new Error('Invalid free network key.')
  const networkDebit = options.paidOnly ? '0' : `CASE WHEN account.plan='guest' THEN ? ELSE ${dailyDebit} END`
  return [
    prepareD1StaleCreditRefund(db, userId),
    prepareD1CreditRefresh(db, userId),
    db.prepare(`INSERT INTO generation_credit_reservation
      (id, user_id, credits, daily_free_credits, daily_credit_date, status, created_at, updated_at, free_cost_micros${network ? ',free_network_hash,network_free_credits' : ''})
      SELECT ?, account.id, ?, ${dailyDebit}, ${D1_CREDIT_DAY_SQL}, 'reserved', ${D1_NOW_SQL}, ${D1_NOW_SQL},
        (CASE WHEN account.plan = 'guest' THEN ? ELSE ${dailyDebit} END) * ?
        ${network ? `,?,${networkDebit}` : ''}
      FROM "user" AS account WHERE account.id = ? AND ${d1EffectiveCreditBalance()} ${options.paidOnly ? `- ${d1AvailableDailyCredits()}` : ''} >= ?
        AND NOT EXISTS (SELECT 1 FROM guest_credit_claim WHERE guest_user_id = account.id)
        ${options.paidOnly ? "AND account.plan <> 'guest'" : ''}`)
      .bind(...[reservationId, credits, ...(options.paidOnly ? [] : [credits]), credits,
        ...(options.paidOnly ? [] : [credits]), unitCost,
        ...(network ? [network, ...(options.paidOnly ? [] : [credits, credits])] : []), userId, credits]),
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

export function createD1GenerationCreditStore(db: D1Database, networkKey?: string): GenerationCreditStore {
  return {
    async reserve(userId, credits, options) {
      const reservationId = crypto.randomUUID()
      const results = await creditBatch<BalanceRow>(db, [
        ...prepareD1CreditReservation(db, userId, credits, reservationId, { ...options, ...(networkKey ? { networkKey } : {}) }),
        db.prepare(`SELECT account.credit_balance AS remaining_credits
          FROM generation_credit_reservation AS reservation JOIN "user" AS account ON account.id = reservation.user_id
          WHERE reservation.id = ?`).bind(reservationId),
      ])
      const row = results[results.length - 1].results[0]
      return row ? { id: reservationId, remainingCredits: numericBalance(row.remaining_credits) } : null
    },

    async settle(reservationId, fulfilledCredits) {
      if (fulfilledCredits !== undefined && (!Number.isSafeInteger(fulfilledCredits) || fulfilledCredits < 0)) throw new Error('Invalid fulfilled credits.')
      await db.prepare(`UPDATE generation_credit_reservation SET status = 'settled',
        fulfilled_credits = coalesce(?,credits), updated_at = ${D1_NOW_SQL}
        WHERE id = ? AND status = 'reserved'`).bind(fulfilledCredits ?? null, reservationId).run()
    },

    async refund(reservationId) {
      const results = await creditBatch<BalanceRow>(db, [
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

    getBreakdown(userId) { return getD1CreditBreakdown(db,userId) },
    getBalance(userId) {
      return getD1CurrentCreditBalance(db, userId)
    },
  }
}

export async function creditBatch<T>(db: D1Database, statements: D1PreparedStatement[]) {
  try { return await db.batch<T>(statements) } catch (error) {
    const message = String(error)
    if (message.includes('NETWORK_FREE_BUDGET_EXCEEDED')) throw new CreditPolicyError('NETWORK_FREE_BUDGET_EXCEEDED')
    if (message.includes('FREE_BUDGET_EXCEEDED')) throw new CreditPolicyError('FREE_BUDGET_EXCEEDED')
    if (message.includes('BILLING_HOLD')) throw new CreditPolicyError('BILLING_HOLD')
    throw error
  }
}
export function d1FreeCostUsed(userIdSql: string) {
  return `(SELECT coalesce(sum(cost.free_cost_micros),0) FROM generation_credit_reservation AS cost
    WHERE cost.daily_credit_date = ${D1_CREDIT_DAY_SQL} AND (cost.user_id = ${userIdSql}
      OR cost.user_id IN (SELECT peer.id FROM "user" AS peer JOIN "user" AS owner ON owner.id=${userIdSql}
        WHERE peer.free_budget_key=owner.free_budget_key AND owner.plan='guest')
      OR cost.user_id IN (SELECT guest_user_id FROM guest_credit_claim WHERE user_id = ${userIdSql})))`
}
export async function getD1CreditBreakdown(db: D1Database,userId: string): Promise<CreditBreakdown> {
  const results = await db.batch([
    prepareD1CreditRefresh(db,userId),
    db.prepare(`SELECT ${d1EffectiveCreditBalance()} AS remaining, ${d1AvailableDailyCredits()} AS dailyRemaining,
      ${d1EffectiveCreditBalance()}-${d1AvailableDailyCredits()} AS paidRemaining,
      max(0,1000000-${d1FreeCostUsed('account.id')}) AS freeBudgetRemainingMicros FROM "user" AS account WHERE account.id=?`).bind(userId),
  ])
  return (results[1].results[0] as unknown as CreditBreakdown) ?? {remaining:0,dailyRemaining:0,paidRemaining:0,freeBudgetRemainingMicros:0}
}
