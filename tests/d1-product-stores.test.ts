import assert from 'node:assert/strict'
import test from 'node:test'
import { createReferralVisitStore } from '../src/db/referral-visits'
import { createLaunchWaitlistStore } from '../src/db/launch-waitlist'
import type { Database } from '../src/db'
import { createD1TestDatabase } from './helpers/d1-test-db'

test('D1 referral statistics retain Shanghai day boundaries, deduplicate visits and isolate sources', async () => {
  const h = await createD1TestDatabase()
  try {
    const store = createReferralVisitStore(h.db as unknown as Database)
    const visit = { visitId: 'visit-1', visitorId: 'visitor-1', entryPath: '/app/image/gpt-image-2' }
    await store.recordVisit(visit)
    await store.recordVisit(visit)
    await createReferralVisitStore(h.db as unknown as Database, 'pixal3d').recordVisit({ ...visit, visitId: 'other-source' })
    await h.db.prepare('UPDATE referral_visit SET created_at=?').bind(Date.parse('2026-10-18T16:00:00Z')).run()
    await h.db.prepare('INSERT INTO referral_visit (visit_id,visitor_id,source,entry_path,created_at) VALUES (?,?,?,?,?)')
      .bind('visit-2', 'visitor-2', 'anyposes', visit.entryPath, Date.parse('2026-10-18T15:59:59Z')).run()
    const stats = await store.getStats(new Date('2026-10-19T01:00:00Z'))
    assert.deepEqual(stats.today, { visitors: 1, visits: 1 })
    assert.deepEqual(stats.totals, { visitors: 2, visits: 2 })
    assert.equal(stats.days.length, 30)
    assert.deepEqual(stats.days.at(-1), { date: '2026-10-19', visitors: 1, visits: 1 })
  } finally { await h.dispose() }
})

test('D1 launch waitlist enrollment is idempotent and never changes credits', async () => {
  const h = await createD1TestDatabase()
  try {
    await h.db.prepare('INSERT INTO "user" (id,name,email,credit_balance) VALUES (\'u\',\'Test\',\'u@example.test\',15)').run()
    const store = createLaunchWaitlistStore(h.db as unknown as Database)
    assert.deepEqual(await store.getStatus('u'), { joined: false, bonusCredits: 5 })
    await Promise.all([store.join('u'), store.join('u')])
    assert.deepEqual(await store.getStatus('u'), { joined: true, bonusCredits: 5 })
    assert.equal((await h.db.prepare('SELECT credit_balance FROM "user" WHERE id=\'u\'').first<{credit_balance:number}>())!.credit_balance, 15)
  } finally { await h.dispose() }
})
