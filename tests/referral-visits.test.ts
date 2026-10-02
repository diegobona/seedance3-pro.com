import assert from 'node:assert/strict'
import test from 'node:test'
import type { NeonQueryFunction } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { getTableConfig } from 'drizzle-orm/pg-core'
import * as schema from '../src/db/schema'
import { createReferralVisitStore } from '../src/db/referral-visits'

function databaseWithResults(results: Record<string, unknown>[][]) {
  const queries: { sql: string; params: unknown[] }[] = []
  const client = Object.assign(() => {}, {
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params })
      return { rows: results.shift() ?? [] }
    },
  }) as unknown as NeonQueryFunction<false, false>
  return { db: drizzle(client, { schema }), queries }
}

test('referral visits store anonymous IDs with indexes for the source, time, and visitor', () => {
  const config = getTableConfig(schema.referralVisit)
  assert.equal(config.name, 'referral_visit')
  assert.deepEqual(config.columns.map((column) => column.name), [
    'visit_id', 'visitor_id', 'source', 'entry_path', 'created_at',
  ])
  assert.equal(config.columns.find((column) => column.name === 'visit_id')?.primary, true)
  assert.equal(config.columns.find((column) => column.name === 'source')?.default, 'anyposes')
  assert.equal(config.columns.find((column) => column.name === 'created_at')?.hasDefault, true)
  assert.deepEqual(config.indexes.map((entry) => entry.config.columns.map((column) => 'name' in column ? column.name : null)), [
    ['source', 'created_at'],
    ['visitor_id'],
  ])
})

test('recording a visit persists only the fixed source and ignores duplicate visit IDs', async () => {
  const { db, queries } = databaseWithResults([[]])
  const visit = {
    visitId: '7c8a3d08-dac7-436a-835f-d75f840e9143',
    visitorId: '3c9c957a-fcfe-4f45-beda-cf21b36f798d',
    entryPath: '/app/image/gpt-image-2',
  }
  const result = await createReferralVisitStore(db).recordVisit(visit)
  assert.equal(result, undefined)
  assert.equal(queries.length, 1)
  assert.match(queries[0].sql, /insert into "referral_visit"/i)
  assert.match(queries[0].sql, /on conflict.*do nothing/i)
  assert.deepEqual(queries[0].params, [visit.visitId, visit.visitorId, 'anyposes', visit.entryPath])
})

test('stats use Beijing calendar windows and distinct aggregate counts instead of summing daily visitors', async () => {
  const { db, queries } = databaseWithResults([
    [{
      tracked_since: '2026-07-01T16:10:00.000Z',
      total_visitors: '4', total_visits: '9',
      today_visitors: '1', today_visits: '2',
      last7_visitors: '2', last7_visits: '5',
      last30_visitors: '3', last30_visits: '7',
    }],
    [{ date: '2026-10-01', visitors: '2', visits: '3' }, { date: '2026-10-02', visitors: '1', visits: '2' }],
  ])
  const stats = await createReferralVisitStore(db).getStats(new Date('2026-10-01T16:01:00.000Z'))
  assert.deepEqual({ ...stats, days: [] }, {
    source: 'anyposes', timeZone: 'Asia/Shanghai', trackedSince: '2026-07-01T16:10:00.000Z',
    totals: { visitors: 4, visits: 9 }, today: { visitors: 1, visits: 2 },
    last7Days: { visitors: 2, visits: 5 }, last30Days: { visitors: 3, visits: 7 }, days: [],
  })
  assert.equal(stats.days.length, 30)
  assert.deepEqual(stats.days[0], { date: '2026-09-03', visitors: 0, visits: 0 })
  assert.deepEqual(stats.days.at(-2), { date: '2026-10-01', visitors: 2, visits: 3 })
  assert.deepEqual(stats.days.at(-1), { date: '2026-10-02', visitors: 1, visits: 2 })
  assert.equal(queries.length, 2)
  const query = queries[0]
  assert.equal((query.sql.match(/count\(distinct "visitor_id"\)/gi) ?? []).length, 4)
  assert.equal((query.sql.match(/filter\s*\(/gi) ?? []).length, 6)
  assert.ok(query.params.includes('2026-10-01T16:00:00.000Z'))
  assert.ok(query.params.includes('2026-09-25T16:00:00.000Z'))
  assert.ok(query.params.includes('2026-09-02T16:00:00.000Z'))
  assert.ok(query.params.includes('2026-10-02T16:00:00.000Z'))
  assert.equal(queries.every((entry) => /"source" = 'anyposes'/.test(entry.sql)), true)
  assert.equal(queries.every((entry) => /"entry_path" = '\/app\/image\/gpt-image-2'/.test(entry.sql)), true)
  assert.match(queries[1].sql, /at time zone 'Asia\/Shanghai'/i)
  assert.match(queries[1].sql, /group by/i)
})

test('empty referral history returns null tracking start and zero days through Beijing today', async () => {
  const { db } = databaseWithResults([
    [{
      tracked_since: null,
      total_visitors: 0, total_visits: 0,
      today_visitors: 0, today_visits: 0,
      last7_visitors: 0, last7_visits: 0,
      last30_visitors: 0, last30_visits: 0,
    }],
    [],
  ])
  const stats = await createReferralVisitStore(db).getStats(new Date('2026-10-01T15:59:59.000Z'))
  assert.equal(stats.trackedSince, null)
  assert.deepEqual(stats.totals, { visitors: 0, visits: 0 })
  assert.deepEqual(stats.today, { visitors: 0, visits: 0 })
  assert.deepEqual(stats.last7Days, { visitors: 0, visits: 0 })
  assert.deepEqual(stats.last30Days, { visitors: 0, visits: 0 })
  assert.equal(stats.days.at(-1)?.date, '2026-10-01')
  assert.equal(stats.days.every((day) => day.visitors === 0 && day.visits === 0), true)
})
