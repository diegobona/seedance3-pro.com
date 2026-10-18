import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'
import {
  createD1GenerationCreditStore,
  getD1CurrentCreditBalance,
  prepareD1CreditReservation,
} from '../src/db/d1-generation-credits'
import { createD1TestDatabase } from './helpers/d1-test-db'

async function addUser(db: D1Database, id: string, balance: number, plan = 'paid', daily = 0, day: string | null = null) {
  await db.prepare(`INSERT INTO "user" (id, name, email, plan, credit_balance, daily_free_credits, daily_credit_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(id, id, `${id}@example.test`, plan, balance, daily, day).run()
}

async function day(db: D1Database, offset = 0) {
  const row = await db.prepare(`SELECT date('now', '+8 hours', ?) AS day`).bind(`${offset} days`).first<{ day: string }>()
  return row!.day
}

test('D1 reservations prevent concurrent overspending and duplicate refunds', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    await addUser(db, 'concurrent', 5)
    const store = createD1GenerationCreditStore(db)
    const attempts = await Promise.all([store.reserve('concurrent', 5), store.reserve('concurrent', 5)])
    const reservations = attempts.filter((reservation) => reservation !== null)
    assert.equal(reservations.length, 1)
    assert.equal(reservations[0]!.remainingCredits, 0)
    assert.equal(await store.getBalance('concurrent'), 0)
    assert.equal((await db.prepare('SELECT count(*) AS count FROM generation_credit_reservation').first<{ count: number }>())!.count, 1)
    const refunds = await Promise.all([store.refund(reservations[0]!.id), store.refund(reservations[0]!.id)])
    assert.deepEqual(refunds.map((refund) => refund.remainingCredits), [5, 5])
    assert.equal(await store.getBalance('concurrent'), 5)
  } finally {
    await dispose()
  }
})

test('D1 daily grants replace yesterday free credits while preserving permanent credits', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    await addUser(db, 'daily', 70, 'free', 5, await day(db, -1))
    const store = createD1GenerationCreditStore(db)
    assert.equal(await getD1CurrentCreditBalance(db, 'daily'), 80)
    const reservation = await store.reserve('daily', 20)
    assert.ok(reservation)
    assert.equal(reservation.remainingCredits, 60)
    const row = await db.prepare('SELECT daily_free_credits, daily_credit_date FROM generation_credit_reservation WHERE id = ?')
      .bind(reservation.id).first<{ daily_free_credits: number; daily_credit_date: string }>()
    assert.equal(row!.daily_free_credits, 15)
    assert.equal(row!.daily_credit_date, await day(db))
    assert.equal(await store.getBalance('daily'), 60)
  } finally {
    await dispose()
  }
})

test('D1 settlement increments generation counts once and cannot later refund', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    await addUser(db, 'settle', 10)
    const store = createD1GenerationCreditStore(db)
    const reservation = await store.reserve('settle', 5)
    assert.ok(reservation)
    await Promise.all([store.settle(reservation.id), store.settle(reservation.id)])
    assert.deepEqual(await store.refund(reservation.id), { remainingCredits: 5 })
    const row = await db.prepare('SELECT credit_balance, generation_count, monthly_generation_count FROM "user" WHERE id = ?')
      .bind('settle').first()
    assert.deepEqual(row, { credit_balance: 5, generation_count: 1, monthly_generation_count: 1 })
  } finally {
    await dispose()
  }
})

test('D1 cross-day refunds return permanent credits without carrying yesterday free credits', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    const today = await day(db)
    const yesterday = await day(db, -1)
    await addUser(db, 'cross-day', 35, 'free', 15, today)
    const store = createD1GenerationCreditStore(db)
    const reservation = await store.reserve('cross-day', 20)
    assert.ok(reservation)
    await db.batch([
      db.prepare('UPDATE "user" SET daily_credit_date = ? WHERE id = ?').bind(yesterday, 'cross-day'),
      db.prepare('UPDATE generation_credit_reservation SET daily_credit_date = ? WHERE id = ?').bind(yesterday, reservation.id),
    ])
    assert.deepEqual(await store.refund(reservation.id), { remainingCredits: 35 })
    assert.deepEqual(await store.refund(reservation.id), { remainingCredits: 35 })
    const row = await db.prepare('SELECT daily_free_credits, daily_credit_date FROM "user" WHERE id = ?').bind('cross-day').first()
    assert.deepEqual(row, { daily_free_credits: 15, daily_credit_date: today })
  } finally {
    await dispose()
  }
})

test('D1 recovers abandoned image reservations but protects active video reservations', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    await addUser(db, 'stale', 30)
    const store = createD1GenerationCreditStore(db)
    const image = await store.reserve('stale', 5)
    const video = await store.reserve('stale', 5)
    assert.ok(image)
    assert.ok(video)
    await db.batch([
      db.prepare('UPDATE generation_credit_reservation SET created_at = ? WHERE user_id = ?').bind(Date.now() - 20 * 60_000, 'stale'),
      db.prepare(`INSERT INTO video_generation_task (id, user_id, reservation_id, workflow_id, duration, resolution, aspect_ratio, status)
        VALUES ('live-video', 'stale', ?, 'minimax-h3', 5, '480p', '16:9', 'submitting')`).bind(video.id),
    ])
    const recovered = await store.reserve('stale', 25)
    assert.ok(recovered)
    assert.equal(recovered.remainingCredits, 0)
    const rows = await db.prepare('SELECT id, status FROM generation_credit_reservation WHERE id IN (?, ?) ORDER BY id')
      .bind(image.id, video.id).all<{ id: string; status: string }>()
    assert.equal(rows.results.find((row) => row.id === image.id)!.status, 'refunded')
    assert.equal(rows.results.find((row) => row.id === video.id)!.status, 'reserved')
  } finally {
    await dispose()
  }
})

test('D1 reservation helpers roll back the debit when the following task insert fails', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    await addUser(db, 'rollback', 5)
    await assert.rejects(db.batch([
      ...prepareD1CreditReservation(db, 'rollback', 5, 'rollback-reservation'),
      db.prepare(`INSERT INTO video_generation_task (id, user_id, reservation_id, workflow_id, duration, resolution, aspect_ratio)
        VALUES ('bad-task', 'missing-user', 'rollback-reservation', 'minimax-h3', 5, '480p', '16:9')`),
    ]))
    assert.equal(await getD1CurrentCreditBalance(db, 'rollback'), 5)
    assert.equal(await db.prepare('SELECT id FROM generation_credit_reservation WHERE id = ?').bind('rollback-reservation').first(), null)
  } finally {
    await dispose()
  }
})

test('D1 normalizes legacy daily dates and rejects invalid credit amounts', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    await addUser(db, 'legacy-free', 20, 'free')
    await addUser(db, 'legacy-paid', 20)
    const store = createD1GenerationCreditStore(db)
    assert.equal(await store.getBalance('legacy-free'), 20)
    assert.equal(await store.getBalance('legacy-paid'), 20)
    assert.equal(await store.getBalance('missing'), 0)
    for (const amount of [0, -1, 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      await assert.rejects(store.reserve('legacy-paid', amount), /positive integer/)
    }
    await assert.rejects(store.refund('missing'), /not found/)
    await store.settle('missing')
  } finally {
    await dispose()
  }
})

test('D1 enables credit triggers after import without charging existing reservations twice', async () => {
  const { db, dispose } = await createD1TestDatabase({ migrations: false })
  try {
    const directory = new URL('../migrations/d1/', import.meta.url)
    const names = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort()
    const apply = async (name: string) => {
      const source = await readFile(new URL(name, directory), 'utf8')
      for (const statement of source.split(/^\s*--> statement-breakpoint\s*$/m)) {
        if (statement.trim()) await db.prepare(statement).run()
      }
    }
    await apply(names[0])
    await addUser(db, 'imported', 5)
    await db.prepare('UPDATE "user" SET generation_count = 3, monthly_generation_count = 2 WHERE id = ?').bind('imported').run()
    await db.prepare(`INSERT INTO generation_credit_reservation (id, user_id, credits, status)
      VALUES ('imported-reservation', 'imported', 5, 'reserved')`).run()
    await apply('0002_credit_triggers.sql')
    const store = createD1GenerationCreditStore(db)
    assert.equal(await store.getBalance('imported'), 5)
    assert.deepEqual(await store.refund('imported-reservation'), { remainingCredits: 10 })
    const reservation = await store.reserve('imported', 5)
    assert.ok(reservation)
    await store.settle(reservation.id)
    const account = await db.prepare('SELECT credit_balance, generation_count, monthly_generation_count FROM "user" WHERE id = ?')
      .bind('imported').first()
    assert.deepEqual(account, { credit_balance: 5, generation_count: 4, monthly_generation_count: 3 })
  } finally {
    await dispose()
  }
})

test('D1 reservation insert applies the current daily grant when an earlier refresh becomes stale', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    const today = await day(db)
    await addUser(db, 'midnight', 70, 'free', 5, await day(db, -1))
    const statements = prepareD1CreditReservation(db, 'midnight', 20, 'midnight-reservation')
    // A preceding refresh can have run before midnight. The insert must independently
    // refresh yesterday's stored fields and debit against the insert's shared clock.
    await statements[statements.length - 1].run()
    const account = await db.prepare('SELECT credit_balance, daily_free_credits, daily_credit_date FROM "user" WHERE id = ?')
      .bind('midnight').first()
    assert.deepEqual(account, { credit_balance: 60, daily_free_credits: 0, daily_credit_date: today })
    const reservation = await db.prepare('SELECT daily_free_credits, daily_credit_date FROM generation_credit_reservation WHERE id = ?')
      .bind('midnight-reservation').first()
    assert.deepEqual(reservation, { daily_free_credits: 15, daily_credit_date: today })
  } finally {
    await dispose()
  }
})
