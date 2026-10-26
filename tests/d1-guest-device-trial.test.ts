import assert from 'node:assert/strict'
import test from 'node:test'
import { createD1TestDatabase } from './helpers/d1-test-db'
import { createGuestImageTrialStore } from '../src/db/guest-image-trials'
import { createGuestVideoTrialStore } from '../src/db/guest-video-trials'
import { resolveGuestImageTrial, getGuestImageBalance } from '../src/lib/guest-image-trial'
import { resolveGuestVideoTrial, getGuestVideoBalance } from '../src/lib/guest-video-trial'
import { reconcileGuestCredits } from '../src/lib/guest-credit-reconciliation'

const secret = 'device-trial-test-secret-at-least-thirty-two-characters'
const fingerprint = `v1:${'a'.repeat(64)}`
function request(ip: string, cookie = '', device = fingerprint) {
  return new Request('https://seedance3-pro.com/api/credits/balance', {
    headers: { 'cf-connecting-ip': ip, cookie, 'x-seedance-device': device },
  })
}

for (const kind of ['image', 'video'] as const) {
  test(`${kind}: same device on another network without cookies cannot claim again`, async () => {
    const { db, dispose } = await createD1TestDatabase()
    try {
      const store = kind === 'image' ? createGuestImageTrialStore(db) : createGuestVideoTrialStore(db)
      const resolve = kind === 'image' ? resolveGuestImageTrial : resolveGuestVideoTrial
      const balance = kind === 'image' ? getGuestImageBalance : getGuestVideoBalance
      const options = { store, secret, create: true }
      assert.equal((await balance(request('203.0.113.1'), options)).remaining, kind === 'image' ? 2 : 10)
      const first = (await resolve(request('203.0.113.1'), options))!
      const cookie = first.setCookie!.split(';')[0]
      assert.equal((await balance(request('203.0.113.2'), options)).remaining, 0)
      await assert.rejects(resolve(request('203.0.113.2'), options), { code: 'GUEST_TRIAL_USED' })
      const resumed = (await resolve(request('203.0.113.2', cookie), options))!
      assert.equal(resumed.session.user.id, first.session.user.id, 'signed cookie retains its original allowance')
      assert.equal((await balance(request('203.0.113.2', cookie), options)).remaining, kind === 'image' ? 2 : 10)
      assert.ok(await resolve(request('203.0.113.3', '', `v1:${'b'.repeat(64)}`), options))
    } finally { await dispose() }
  })

  test(`${kind}: simultaneous claims across networks allocate exactly one guest`, async () => {
    const { db, dispose } = await createD1TestDatabase()
    try {
      const store = kind === 'image' ? createGuestImageTrialStore(db) : createGuestVideoTrialStore(db)
      const resolve = kind === 'image' ? resolveGuestImageTrial : resolveGuestVideoTrial
      const claims = await Promise.allSettled([1, 2].map(n => resolve(request(`203.0.113.${n}`), { store, secret, create: true })))
      assert.equal(claims.filter(r => r.status === 'fulfilled').length, 1)
      assert.equal((await db.prepare('SELECT count(*) AS n FROM "user"').first<{n:number}>())?.n, 1)
    } finally { await dispose() }
  })
}

test('a legacy signed guest cookie learns the device; image and video remain separate allowances', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    const images = { store: createGuestImageTrialStore(db), secret, create: true }
    const videos = { store: createGuestVideoTrialStore(db), secret, create: true }
    const first = (await resolveGuestImageTrial(request('203.0.113.1', '', ''), images))!
    await resolveGuestImageTrial(request('203.0.113.1', first.setCookie!.split(';')[0]), images)
    await assert.rejects(resolveGuestImageTrial(request('203.0.113.2'), images), { code: 'GUEST_TRIAL_USED' })
    assert.ok(await resolveGuestVideoTrial(request('203.0.113.2'), videos))
    const stored = await db.prepare('SELECT device_hash FROM guest_device_claim').all<{device_hash:string}>()
    assert.ok(stored.results.every(row => /^[a-f0-9]{64}$/.test(row.device_hash) && row.device_hash !== 'a'.repeat(64)))
  } finally { await dispose() }
})

test('sign-in marks the device so logout plus network change cannot create guest allowances', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    await db.prepare(`INSERT INTO "user" (id,name,email) VALUES ('account','A','a@test')`).run()
    await reconcileGuestCredits(request('203.0.113.1'), 'account', secret, db)
    await assert.rejects(resolveGuestImageTrial(request('203.0.113.2'), { store: createGuestImageTrialStore(db), secret, create: true }), { code: 'GUEST_TRIAL_USED' })
    await assert.rejects(resolveGuestVideoTrial(request('203.0.113.2'), { store: createGuestVideoTrialStore(db), secret, create: true }), { code: 'GUEST_TRIAL_USED' })
  } finally { await dispose() }
})
