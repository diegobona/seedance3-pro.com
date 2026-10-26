import assert from 'node:assert/strict'
import test from 'node:test'
import { createAuth } from '../src/lib/auth'
import { createD1TestDatabase } from './helpers/d1-test-db'

const origin = 'https://seedance3-pro.com'
const secret = 'google-only-auth-test-secret-at-least-32-characters'
const request = (path: string, body: object) => new Request(`${origin}/api/auth/${path}`, {
  method: 'POST', headers: { 'content-type': 'application/json', origin, 'cf-connecting-ip': '203.0.113.20' }, body: JSON.stringify(body),
})

test('direct email sign-up and password sign-in are disabled without creating users or sessions', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    const auth = createAuth(new Request(origin), { DATABASE_BACKEND: 'd1', DB: db, BETTER_AUTH_SECRET: secret })
    const signup = await auth.handler(request('sign-up/email', {
      name: 'Blocked registration', email: 'blocked@example.test', password: 'strong-password-for-test',
    }))
    assert.equal(signup.status, 400)
    assert.equal((await signup.json() as { code: string }).code, 'EMAIL_PASSWORD_SIGN_UP_DISABLED')
    const signin = await auth.handler(request('sign-in/email', {
      email: 'blocked@example.test', password: 'strong-password-for-test',
    }))
    assert.equal(signin.status, 400)
    assert.equal((await signin.json() as { code: string }).code, 'EMAIL_PASSWORD_DISABLED')
    for (const table of ['user', 'account', 'session']) {
      assert.equal((await db.prepare(`SELECT count(*) AS count FROM "${table}"`).first<{ count: number }>())!.count, 0, table)
    }
  } finally { await dispose() }
})

test('Google OAuth still returns a provider redirect with the original callback and creates no account before verification', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    const auth = createAuth(new Request(origin), {
      DATABASE_BACKEND: 'd1', DB: db, BETTER_AUTH_SECRET: secret,
      GOOGLE_CLIENT_ID: 'test-google-client.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'test-google-secret',
    })
    const response = await auth.handler(request('sign-in/social', {
      provider: 'google', callbackURL: `${origin}/zh/app?model=seedance-2-5`, disableRedirect: true,
    }))
    assert.equal(response.status, 200, await response.clone().text())
    const result = await response.json() as { url: string }
    const url = new URL(result.url)
    assert.equal(url.origin, 'https://accounts.google.com')
    assert.equal(url.searchParams.get('redirect_uri'), `${origin}/api/auth/callback/google`)
    assert.ok(url.searchParams.get('state'))
    assert.ok(url.searchParams.get('code_challenge'))
    assert.equal((await db.prepare('SELECT count(*) AS count FROM "user"').first<{ count: number }>())!.count, 0)
    const unavailable = await auth.handler(request('sign-in/social', { provider: 'github', callbackURL: origin }))
    assert.equal(unavailable.status, 404)
  } finally { await dispose() }
})
