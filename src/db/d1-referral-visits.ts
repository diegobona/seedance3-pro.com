import type { ReferralCounts, ReferralSource, ReferralVisitStore } from './referral-visits'

const DAY_MS = 86_400_000
const SHANGHAI_MS = 8 * 60 * 60_000
type SummaryRow = Record<string, number | null>

export function createD1ReferralVisitStore(db: D1Database, source: ReferralSource): ReferralVisitStore {
  const counts = (visitors: number | null, visits: number | null): ReferralCounts => ({ visitors: Number(visitors), visits: Number(visits) })
  return {
    async recordVisit(visit) {
      await db.prepare('INSERT INTO referral_visit (visit_id,visitor_id,source,entry_path) VALUES (?,?,?,?) ON CONFLICT DO NOTHING')
        .bind(visit.visitId, visit.visitorId, source, visit.entryPath).run()
    },
    async getStats(now = new Date()) {
      const date = new Date(now.getTime() + SHANGHAI_MS).toISOString().slice(0, 10)
      const start = Date.parse(`${date}T00:00:00+08:00`), end = start + DAY_MS
      const last7 = start - 6 * DAY_MS, last30 = start - 29 * DAY_MS
      const results = await db.batch<SummaryRow>([
        db.prepare(`SELECT min(created_at) AS tracked_since,count(DISTINCT visitor_id) AS total_visitors,count(*) AS total_visits,
          count(DISTINCT visitor_id) FILTER(WHERE created_at>=? AND created_at<?) AS today_visitors,
          count(*) FILTER(WHERE created_at>=? AND created_at<?) AS today_visits,
          count(DISTINCT visitor_id) FILTER(WHERE created_at>=? AND created_at<?) AS last7_visitors,
          count(*) FILTER(WHERE created_at>=? AND created_at<?) AS last7_visits,
          count(DISTINCT visitor_id) FILTER(WHERE created_at>=? AND created_at<?) AS last30_visitors,
          count(*) FILTER(WHERE created_at>=? AND created_at<?) AS last30_visits
          FROM referral_visit WHERE source=? AND entry_path='/app/image/gpt-image-2'`)
          .bind(start, end, start, end, last7, end, last7, end, last30, end, last30, end, source),
        db.prepare(`SELECT date(created_at/1000,'unixepoch','+8 hours') AS date,
          count(DISTINCT visitor_id) AS visitors,count(*) AS visits FROM referral_visit
          WHERE source=? AND entry_path='/app/image/gpt-image-2' AND created_at>=? AND created_at<? GROUP BY date ORDER BY date`)
          .bind(source, last30, end),
      ])
      const row = results[0].results[0]
      if (!row) throw new Error('Referral statistics query returned no result.')
      const daily = new Map(results[1].results.map(day => [String(day.date), counts(day.visitors, day.visits)]))
      return {
        source, timeZone: 'Asia/Shanghai', trackedSince: row.tracked_since === null ? null : new Date(row.tracked_since).toISOString(),
        totals: counts(row.total_visitors, row.total_visits), today: counts(row.today_visitors, row.today_visits),
        last7Days: counts(row.last7_visitors, row.last7_visits), last30Days: counts(row.last30_visitors, row.last30_visits),
        days: Array.from({ length: 30 }, (_, index) => {
          const date = new Date(last30 + index * DAY_MS + SHANGHAI_MS).toISOString().slice(0, 10)
          return { date, ...(daily.get(date) ?? { visitors: 0, visits: 0 }) }
        }),
      }
    },
  }
}
