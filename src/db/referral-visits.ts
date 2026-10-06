import { sql } from 'drizzle-orm'
import type { Database } from './index'
import { referralVisit } from './schema'

export type Visit = {
  visitId: string
  visitorId: string
  entryPath: string
}

export type ReferralVisit = Visit
export type ReferralSource = 'anyposes' | 'pixal3d'

export type ReferralCounts = {
  visitors: number
  visits: number
}

export type ReferralStats = {
  source: ReferralSource
  timeZone: 'Asia/Shanghai'
  trackedSince: string | null
  totals: ReferralCounts
  today: ReferralCounts
  last7Days: ReferralCounts
  last30Days: ReferralCounts
  days: (ReferralCounts & { date: string })[]
}

export type ReferralVisitStore = {
  recordVisit(visit: Visit): Promise<void>
  getStats(now?: Date): Promise<ReferralStats>
}

type CountValue = number | string

type SummaryRow = {
  tracked_since: string | Date | null
  total_visitors: CountValue
  total_visits: CountValue
  today_visitors: CountValue
  today_visits: CountValue
  last7_visitors: CountValue
  last7_visits: CountValue
  last30_visitors: CountValue
  last30_visits: CountValue
}

type DailyRow = {
  date: string
  visitors: CountValue
  visits: CountValue
}

const DAY_MS = 24 * 60 * 60 * 1000
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000

function normalizeCount(value: CountValue): number {
  const count = Number(value)
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error('Referral count is invalid.')
  }
  return count
}

function counts(visitors: CountValue, visits: CountValue): ReferralCounts {
  return { visitors: normalizeCount(visitors), visits: normalizeCount(visits) }
}

export function createReferralVisitStore(db: Database, source: ReferralSource = 'anyposes'): ReferralVisitStore {
  return {
    async recordVisit(visit) {
      await db.insert(referralVisit).values({
        visitId: visit.visitId,
        visitorId: visit.visitorId,
        source,
        entryPath: visit.entryPath,
      }).onConflictDoNothing()
    },

    async getStats(now = new Date()) {
      const todayDate = new Date(now.getTime() + SHANGHAI_OFFSET_MS).toISOString().slice(0, 10)
      const todayStartMs = new Date(`${todayDate}T00:00:00+08:00`).getTime()
      const todayStart = new Date(todayStartMs).toISOString()
      const tomorrowStart = new Date(todayStartMs + DAY_MS).toISOString()
      const last7Start = new Date(todayStartMs - 6 * DAY_MS).toISOString()
      const last30StartMs = todayStartMs - 29 * DAY_MS
      const last30Start = new Date(last30StartMs).toISOString()

      const summary = await db.execute<SummaryRow>(sql`
        SELECT MIN("created_at") AS "tracked_since",
          COUNT(DISTINCT "visitor_id") AS "total_visitors",
          COUNT(*) AS "total_visits",
          COUNT(DISTINCT "visitor_id") FILTER (
            WHERE "created_at" >= ${todayStart}::timestamptz AND "created_at" < ${tomorrowStart}::timestamptz
          ) AS "today_visitors",
          COUNT(*) FILTER (
            WHERE "created_at" >= ${todayStart}::timestamptz AND "created_at" < ${tomorrowStart}::timestamptz
          ) AS "today_visits",
          COUNT(DISTINCT "visitor_id") FILTER (
            WHERE "created_at" >= ${last7Start}::timestamptz AND "created_at" < ${tomorrowStart}::timestamptz
          ) AS "last7_visitors",
          COUNT(*) FILTER (
            WHERE "created_at" >= ${last7Start}::timestamptz AND "created_at" < ${tomorrowStart}::timestamptz
          ) AS "last7_visits",
          COUNT(DISTINCT "visitor_id") FILTER (
            WHERE "created_at" >= ${last30Start}::timestamptz AND "created_at" < ${tomorrowStart}::timestamptz
          ) AS "last30_visitors",
          COUNT(*) FILTER (
            WHERE "created_at" >= ${last30Start}::timestamptz AND "created_at" < ${tomorrowStart}::timestamptz
          ) AS "last30_visits"
        FROM "referral_visit"
        WHERE "source" = ${source}
          AND "entry_path" = '/app/image/gpt-image-2'
      `)
      const daily = await db.execute<DailyRow>(sql`
        SELECT TO_CHAR("created_at" AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD') AS "date",
          COUNT(DISTINCT "visitor_id") AS "visitors", COUNT(*) AS "visits"
        FROM "referral_visit"
        WHERE "source" = ${source}
          AND "entry_path" = '/app/image/gpt-image-2'
          AND "created_at" >= ${last30Start}::timestamptz
          AND "created_at" < ${tomorrowStart}::timestamptz
        GROUP BY TO_CHAR("created_at" AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD')
        ORDER BY "date"
      `)

      const row = summary.rows[0]
      if (!row) throw new Error('Referral statistics query returned no result.')
      const dailyByDate = new Map(daily.rows.map((day) => [day.date, counts(day.visitors, day.visits)]))
      const days = Array.from({ length: 30 }, (_, index) => {
        const date = new Date(last30StartMs + index * DAY_MS + SHANGHAI_OFFSET_MS).toISOString().slice(0, 10)
        return { date, ...(dailyByDate.get(date) ?? { visitors: 0, visits: 0 }) }
      })

      return {
        source,
        timeZone: 'Asia/Shanghai',
        trackedSince: row.tracked_since === null ? null : new Date(row.tracked_since).toISOString(),
        totals: counts(row.total_visitors, row.total_visits),
        today: counts(row.today_visitors, row.today_visits),
        last7Days: counts(row.last7_visitors, row.last7_visits),
        last30Days: counts(row.last30_visitors, row.last30_visits),
        days,
      }
    },
  }
}
