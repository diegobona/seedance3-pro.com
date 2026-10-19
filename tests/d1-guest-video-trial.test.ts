import assert from 'node:assert/strict'
import test from 'node:test'
import { createD1TestDatabase } from './helpers/d1-test-db'

test('D1 includes the guest trial identity table without altering existing credits', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    const row = await db.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type='table' AND name='guest_video_trial'").first<{ count: number }>()
    assert.equal(row?.count, 1)
    assert.equal((await db.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type='trigger' AND name LIKE 'credit_reservation_%'").first<{ count: number }>())?.count, 3)
  } finally { await dispose() }
})

async function guestStore(db: D1Database) {
  const { createGuestVideoTrialStore } = await import('../src/db/guest-video-trials')
  return createGuestVideoTrialStore(db)
}

test('D1 guest creation is atomic when simultaneous network claims collide', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    const store = await guestStore(db)
    const networkHash = 'a'.repeat(64)
    const results = await Promise.allSettled([1, 2].map(async number => store.create({
      id: crypto.randomUUID(), userId: `guest-${number}`, networkHash,
    })))
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
    assert.equal((await db.prepare('SELECT count(*) AS count FROM "user"').first<{ count: number }>())?.count, 1)
    assert.equal(await store.hasNetwork(networkHash), true)
    assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length, 0)
  } finally { await dispose() }
})

test('D1 guests spend five plus five seconds, cannot overspend, and refund only once', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    const store = await guestStore(db)
    const id = crypto.randomUUID()
    const userId = `guest-${id}`
    await store.create({ id, userId, networkHash: 'b'.repeat(64) })
    assert.equal((await store.getById(id))?.userId, userId)
    assert.equal(await store.getBalance(userId), 10)
    const { createVideoGenerationTaskStore } = await import('../src/db/video-generation-tasks')
    const { protectVideoGenerationStart } = await import('../src/lib/protected-video-generation')
    const tasks = createVideoGenerationTaskStore(db)
    let submissions = 0
    const start = () => protectVideoGenerationStart({
      request: new Request('https://seedance3-pro.com/api/videos/generate'),
      getSession: async () => ({ user: { id: userId, isGuest: true } }),
      taskStore: tasks,
      preflight: async () => ({ ok: true, payload: {
        prompt: 'Guest trial regression', duration: 5, resolution: '480p', aspectRatio: '16:9',
      } }),
      submit: async () => ({ providerTaskId: `test-provider-${++submissions}` }),
    })
    const first = await start()
    assert.equal(first.status, 202)
    assert.equal(first.headers.get('x-seedance-credit-remaining'), '5')
    assert.equal(first.headers.get('x-seedance-credit-scope'), 'guest-video')
    const firstTask = (await first.json()) as { task: { id: string } }
    const second = await start()
    assert.equal(second.status, 202)
    assert.equal(await store.getBalance(userId), 0)
    const exhausted = await start()
    assert.equal(exhausted.status, 402)
    assert.equal((await exhausted.json() as { code: string }).code, 'GUEST_TRIAL_INSUFFICIENT')
    assert.equal(submissions, 2)
    const claimed = await tasks.claimForPoll(firstTask.task.id, userId, new Date(), 30_000)
    assert.ok(claimed?.leaseUntil)
    await tasks.finalizeFailure(firstTask.task.id, 'Synthetic provider failure', claimed.leaseUntil)
    await tasks.finalizeFailure(firstTask.task.id, 'Repeated synthetic failure', claimed.leaseUntil)
    assert.equal(await store.getBalance(userId), 5)
    await db.prepare("UPDATE \"user\" SET daily_credit_date='2000-01-01' WHERE id=?").bind(userId).run()
    assert.equal(await store.getBalance(userId), 5, 'daily reset cannot replenish guest allowance')
  } finally { await dispose() }
})

test('D1 signed guest cookies survive refresh and cannot create authenticated image sessions', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    const store = await guestStore(db)
    const { resolveGuestVideoTrial, getGuestVideoBalance } = await import('../src/lib/guest-video-trial')
    const secret = 'guest-d1-test-secret-at-least-thirty-two-characters'
    const request = new Request('https://seedance3-pro.com/api/videos/generate', { headers: { 'cf-connecting-ip': '203.0.113.88' } })
    const guest = await resolveGuestVideoTrial(request, { secret, store, create: true })
    assert.ok(guest?.setCookie)
    const cookie = guest.setCookie.split(';')[0]
    const refreshed = new Request('https://seedance3-pro.com/api/credits/balance?guest_video=1', { headers: { cookie, 'cf-connecting-ip': '203.0.113.88' } })
    assert.equal((await resolveGuestVideoTrial(refreshed, { secret, store }))?.session.user.id, guest.session.user.id)
    assert.equal((await getGuestVideoBalance(refreshed, { secret, store })).remaining, 10)
    assert.equal((await getGuestVideoBalance(request, { secret, store })).remaining, 0, 'deleting cookies cannot claim a second allowance')
    const { createAuth } = await import('../src/lib/auth')
    const auth = createAuth(refreshed, { DB: db, DATABASE_BACKEND: 'd1', BETTER_AUTH_SECRET: secret })
    assert.equal(await auth.api.getSession({ headers: refreshed.headers }), null)
  } finally { await dispose() }
})

test('D1 can spend the full ten-second allowance in one video without daily credits', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    const store = await guestStore(db)
    const id = crypto.randomUUID()
    const userId = `guest-${id}`
    await store.create({ id, userId, networkHash: 'c'.repeat(64) })
    const { createVideoGenerationTaskStore } = await import('../src/db/video-generation-tasks')
    const tasks = createVideoGenerationTaskStore(db)
    assert.ok(await tasks.reserveAndCreate(userId, 10, { workflowId: 'test-workflow', duration: 10, resolution: '480p', aspectRatio: '16:9' }))
    assert.equal(await store.getBalance(userId), 0)
    const account = await db.prepare('SELECT plan,daily_free_credits FROM "user" WHERE id=?').bind(userId).first<{ plan: string; daily_free_credits: number }>()
    assert.equal(account?.plan, 'guest')
    assert.equal(account?.daily_free_credits, 0)
  } finally { await dispose() }
})
