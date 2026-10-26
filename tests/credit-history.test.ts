import assert from 'node:assert/strict'
import test from 'node:test'
import { createD1TestDatabase } from './helpers/d1-test-db'

test('credit history is authenticated and cannot expose another account reservations', async () => {
  const module = await import('../src/lib/credit-history-response').catch(() => null)
  assert.ok(module?.creditHistoryResponse, 'credit history handler exists')
  const { db, dispose } = await createD1TestDatabase()
  try {
    for (const id of ['history-a', 'history-b']) {
      await db.prepare(`INSERT INTO "user" (id,name,email) VALUES (?,?,?)`).bind(id, id, `${id}@example.test`).run()
      await db.prepare(`INSERT INTO generation_credit_reservation
        (id,user_id,credits,daily_free_credits,daily_credit_date,status)
        VALUES (?,?,1,1,date('now','+8 hours'),'reserved')`).bind(`${id}-task`, id).run()
    }
    const request = new Request('http://localhost/api/credits/history?userId=history-b')
    const anonymous = await module.creditHistoryResponse(request, db, async () => null)
    assert.equal(anonymous.status, 401)
    const own = await module.creditHistoryResponse(request, db, async () => ({ user: { id: 'history-a' } }))
    const body = await own.json() as { entries: Array<{id: string; credits: number; dailyCredits: number; paidCredits: number}> }
    assert.equal(own.status, 200)
    assert.deepEqual(body.entries.map(e => e.id), ['history-a-task'])
    assert.equal(body.entries[0].credits, 1)
    assert.equal(body.entries[0].dailyCredits, 1)
    assert.equal(body.entries[0].paidCredits, 0)
    assert.equal(own.headers.get('cache-control'), 'no-store')
  } finally { await dispose() }
})
