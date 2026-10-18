import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createAuth } from '../src/lib/auth'
import { createD1TestDatabase } from './helpers/d1-test-db'

const origin = 'https://seedance3-pro.com'
const secret = 'd1-test-auth-secret-at-least-32-characters-long'

test('D1 schema preserves all product tables, integer millisecond defaults, and credit constraints', async () => {
  const { db, dispose } = await createD1TestDatabase({ migrations: false })
  try {
    const migration = await readFile(new URL('../migrations/d1/0001_schema.sql', import.meta.url), 'utf8')
    for (const statement of migration.split('--> statement-breakpoint').filter((value) => value.trim())) {
      await db.prepare(statement).run()
    }
    const tables = await db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_cf_*' ORDER BY name").all<{ name: string }>()
    assert.deepEqual(tables.results.map(({ name }) => name), [
      'account', 'generation_credit_reservation', 'launch_waitlist', 'referral_visit',
      'session', 'user', 'verification', 'video_generation_task',
    ])

    await db.prepare('INSERT INTO user (id, name, email) VALUES (?, ?, ?)').bind('schema-user', 'D1 User', 'schema@example.com').run()
    const user = await db.prepare('SELECT * FROM user WHERE id = ?').bind('schema-user').first<Record<string, unknown>>()
    assert.ok(user)
    assert.equal(user.email_verified, 0)
    assert.equal(user.credit_balance, 15)
    assert.equal(user.daily_free_credits, 0)
    assert.equal(user.daily_credit_date, null)
    assert.equal(typeof user.created_at, 'number')
    assert.ok(Math.abs(Number(user.created_at) - Date.now()) < 60_000)
    assert.equal(typeof user.trial_credits_granted_at, 'number')
    await assert.rejects(db.prepare('UPDATE user SET daily_free_credits = 16 WHERE id = ?').bind('schema-user').run(), /CHECK constraint failed/)

    assert.doesNotMatch(migration, /CREATE\s+TRIGGER/i, 'initial import schema must not debit existing reservations')
    await db.prepare('INSERT INTO generation_credit_reservation (id, user_id, credits) VALUES (?, ?, ?)').bind('imported-reservation', 'schema-user', 5).run()
    assert.equal((await db.prepare('SELECT credit_balance FROM user WHERE id = ?').bind('schema-user').first<{ credit_balance: number }>())?.credit_balance, 15, 'importing an existing reservation must not debit the imported balance')
    await db.prepare('DELETE FROM user WHERE id = ?').bind('schema-user').run()
    assert.equal(await db.prepare('SELECT id FROM generation_credit_reservation WHERE id = ?').bind('imported-reservation').first(), null)
  } finally {
    await dispose()
  }
})

test('Better Auth signs up and signs in through D1 without a Neon connection', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    const environment = { DATABASE_BACKEND: 'd1', DB: db, BETTER_AUTH_SECRET: secret }
    const auth = createAuth(new Request(origin), environment)
    const signup = await auth.handler(new Request(`${origin}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin, 'cf-connecting-ip': '203.0.113.20' },
      body: JSON.stringify({ name: 'D1 User', email: 'auth@example.com', password: 'strong-password-for-d1' }),
    }))
    assert.equal(signup.status, 200, await signup.clone().text())
    const signupBody = await signup.json() as { user: { id: string; emailVerified: boolean; creditBalance: number; createdAt: string; trialCreditsGrantedAt: string }; token: string }
    assert.equal(signupBody.user.emailVerified, false)
    assert.equal(signupBody.user.creditBalance, 15)
    assert.ok(Number.isFinite(Date.parse(signupBody.user.createdAt)))
    assert.ok(Number.isFinite(Date.parse(signupBody.user.trialCreditsGrantedAt)))
    assert.ok(signupBody.token)

    const stored = await db.prepare('SELECT * FROM user WHERE id = ?').bind(signupBody.user.id).first<Record<string, unknown>>()
    assert.equal(stored?.email_verified, 0)
    assert.equal(typeof stored?.created_at, 'number')
    assert.equal(typeof stored?.trial_credits_granted_at, 'number')

    const signin = await auth.handler(new Request(`${origin}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin, 'cf-connecting-ip': '203.0.113.20' },
      body: JSON.stringify({ email: 'auth@example.com', password: 'strong-password-for-d1' }),
    }))
    assert.equal(signin.status, 200, await signin.clone().text())
    const signinBody = await signin.json() as { token: string; user: { id: string; emailVerified: boolean } }
    assert.equal(signinBody.user.id, signupBody.user.id)
    assert.equal(signinBody.user.emailVerified, false)
    const subscriptionExpiry = Date.now() + 86400_000
    await db.prepare('UPDATE user SET email_verified = 1, subscription_expires_at = ? WHERE id = ?').bind(subscriptionExpiry, signupBody.user.id).run()
    const cookie = signin.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ')
    const session = await createAuth(new Request(origin), environment).handler(new Request(`${origin}/api/auth/get-session`, {
      headers: { cookie, 'cf-connecting-ip': '203.0.113.20' },
    }))
    assert.equal(session.status, 200, await session.clone().text())
    const sessionBody = await session.json() as { user: { id: string; creditBalance: number; emailVerified: boolean; subscriptionExpiresAt: string }; session: { expiresAt: string } }
    assert.equal(sessionBody.user.id, signupBody.user.id)
    assert.equal(sessionBody.user.creditBalance, 15)
    assert.equal(sessionBody.user.emailVerified, true)
    assert.equal(Date.parse(sessionBody.user.subscriptionExpiresAt), subscriptionExpiry)
    assert.ok(Date.parse(sessionBody.session.expiresAt) > Date.now())

    const storedSession = await db.prepare('SELECT expires_at, created_at FROM session WHERE token = ?').bind(signinBody.token).first<Record<string, unknown>>()
    assert.equal(typeof storedSession?.expires_at, 'number')
    assert.equal(typeof storedSession?.created_at, 'number')
  } finally {
    await dispose()
  }
})

test('a staged D1 binding leaves authentication on Neon until D1 is explicitly selected', async () => {
  const { db, dispose } = await createD1TestDatabase({ migrations: false })
  try {
    for (const DATABASE_BACKEND of [undefined, 'neon']) {
      const auth = createAuth(new Request(origin), {
        DATABASE_BACKEND,
        DB: db,
        DATABASE_URL: 'postgresql://test:test@example.invalid/test',
        BETTER_AUTH_SECRET: secret,
      })
      assert.equal((await auth.$context).adapter.options?.provider, 'pg')
    }
  } finally {
    await dispose()
  }
})

test('explicit D1 authentication requires its D1 binding', () => {
  assert.throws(() => createAuth(new Request(origin), {
    DATABASE_BACKEND: 'd1',
    DATABASE_URL: 'postgresql://test:test@example.invalid/test',
    BETTER_AUTH_SECRET: secret,
  }), /D1 database binding DB is required/)
})
