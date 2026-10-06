import { sql } from 'drizzle-orm'
import { DAILY_CREDIT_TIME_ZONE, DAILY_FREE_CREDIT_GRANT } from '../lib/generation-credits'

// The database clock defines one shared day for every region and request.
export const creditDay = sql`(now() AT TIME ZONE ${DAILY_CREDIT_TIME_ZONE})::date`

export function availableDailyCredits(alias: string) {
  const account = sql.identifier(alias)
  return sql`CASE
    WHEN ${account}."daily_credit_date" = ${creditDay} THEN ${account}."daily_free_credits"
    WHEN ${account}."plan" = 'free' THEN ${DAILY_FREE_CREDIT_GRANT}
    ELSE 0 END`
}

export function effectiveCreditBalance(alias: string) {
  const account = sql.identifier(alias)
  return sql`CASE WHEN ${account}."daily_credit_date" IS DISTINCT FROM ${creditDay} THEN
    ${account}."credit_balance" - CASE
      WHEN ${account}."daily_credit_date" IS NULL THEN
        CASE WHEN ${account}."plan" = 'free'
          THEN LEAST(${account}."credit_balance", ${DAILY_FREE_CREDIT_GRANT}) ELSE 0 END
      ELSE ${account}."daily_free_credits" END
    + CASE WHEN ${account}."plan" = 'free' THEN ${DAILY_FREE_CREDIT_GRANT} ELSE 0 END
    ELSE ${account}."credit_balance" END`
}

export function reservationRefundFields(alias: string) {
  const reservation = sql.identifier(alias)
  return sql`${reservation}."user_id",
    ${reservation}."credits" - ${reservation}."daily_free_credits" AS "permanent_credits",
    CASE WHEN ${reservation}."daily_credit_date" = ${creditDay}
      THEN ${reservation}."daily_free_credits" ELSE 0 END AS "today_free_credits"`
}

export function creditRefundAccount(refundAlias: string) {
  const refund = sql.identifier(refundAlias)
  const daily = availableDailyCredits('account')
  return sql`UPDATE "user" AS account
    SET "credit_balance" = ${effectiveCreditBalance('account')}
          + ${refund}."permanent_credits"
          + LEAST(${DAILY_FREE_CREDIT_GRANT} - (${daily}), ${refund}."today_free_credits"),
        "daily_free_credits" = LEAST(${DAILY_FREE_CREDIT_GRANT}, (${daily}) + ${refund}."today_free_credits"),
        "daily_credit_date" = ${creditDay},
        "updated_at" = now()
    FROM ${refund}
    WHERE account."id" = ${refund}."user_id"
    RETURNING account."credit_balance"`
}
