import assert from 'node:assert/strict'
import test from 'node:test'
import { createD1TestDatabase } from './helpers/d1-test-db'
import { createGuestVideoTrialStore } from '../src/db/guest-video-trials'
import { createGuestImageTrialStore } from '../src/db/guest-image-trials'
import { createD1GenerationCreditStore } from '../src/db/d1-generation-credits'
import { getGuestVideoBalance, guestVideoNetworkHash, resolveGuestVideoTrial } from '../src/lib/guest-video-trial'
import { resolveGuestImageTrial } from '../src/lib/guest-image-trial'

const secret = 'roaming-guest-test-secret-at-least-32-characters'
function request(ip: string, cookie = '') {
  // Deliberately omit the optional device hint, as in the affected production guests.
  return new Request('https://seedance3-pro.com/api/videos/generate', {
    method: 'POST', headers: { 'cf-connecting-ip': ip, cookie },
  })
}

test('a guest keeps the last five seconds after roaming, but deleting its cookie cannot claim again', async () => {
  const h = await createD1TestDatabase()
  try {
    const store = createGuestVideoTrialStore(h.db)
    const options = { store, secret, create: true }
    const first = (await resolveGuestVideoTrial(request('203.0.113.1'), options))!
    const cookie = first.setCookie!.split(';')[0]
    const credits = createD1GenerationCreditStore(h.db)
    const spent = (await credits.reserve(first.session.user.id, 5))!
    await credits.settle(spent.id)

    const moved = (await resolveGuestVideoTrial(request('203.0.113.2', cookie), options))!
    assert.equal(moved.session.user.id, first.session.user.id)
    assert.equal((await getGuestVideoBalance(request('203.0.113.2', cookie), options)).remaining, 5)
    assert.equal((await getGuestVideoBalance(request('203.0.113.2'), options)).remaining, 0)
    await assert.rejects(resolveGuestVideoTrial(request('203.0.113.2'), options), { code: 'GUEST_TRIAL_USED' })

    // The database must also reject a stale pre-check, rolling back the new wallet.
    const networkHash = await guestVideoNetworkHash(request('203.0.113.2'), secret)
    await assert.rejects(store.create({ id: crypto.randomUUID(), userId: 'stale-new-guest', networkHash }), /GUEST_TRIAL_USED/)
    assert.equal((await h.db.prepare('SELECT count(*) AS n FROM "user"').first<{n:number}>())?.n, 1)

    const second = await credits.reserve(moved.session.user.id, 5)
    assert.ok(second, 'the existing guest can still spend the final five seconds')
    await credits.settle(second.id)
    assert.equal(await credits.reserve(moved.session.user.id, 5), null)
  } finally { await h.dispose() }
})

test('balance lookups, status resolution and exhausted cookies do not claim additional networks', async () => {
  const h = await createD1TestDatabase()
  try {
    const store = createGuestVideoTrialStore(h.db)
    const options = { store, secret, create: true }
    const first = (await resolveGuestVideoTrial(request('203.0.113.1'), options))!
    const cookie = first.setCookie!.split(';')[0]
    const secondNetwork = request('203.0.113.2', cookie)
    await getGuestVideoBalance(secondNetwork, options)
    await resolveGuestVideoTrial(secondNetwork, { store, secret })
    assert.equal(await store.hasNetwork(await guestVideoNetworkHash(secondNetwork, secret)), false)

    const credits = createD1GenerationCreditStore(h.db)
    const spent = (await credits.reserve(first.session.user.id, 10))!
    await credits.settle(spent.id)
    await resolveGuestVideoTrial(secondNetwork, options)
    assert.equal(await store.hasNetwork(await guestVideoNetworkHash(secondNetwork, secret)), false)
  } finally { await h.dispose() }
})

test('roaming onto an already claimed network preserves both signed wallets and the separate image trial', async () => {
  const h = await createD1TestDatabase()
  try {
    const store = createGuestVideoTrialStore(h.db)
    const options = { store, secret, create: true }
    const a = (await resolveGuestVideoTrial(request('203.0.113.1'), options))!
    const b = (await resolveGuestVideoTrial(request('203.0.113.2'), options))!
    for (const guest of [a, b, a]) {
      const resumed = await resolveGuestVideoTrial(request('203.0.113.2', guest.setCookie!.split(';')[0]), options)
      assert.equal(resumed?.session.user.id, guest.session.user.id)
      assert.equal(await store.getBalance(guest.session.user.id), 10)
    }
    assert.ok(await resolveGuestImageTrial(request('203.0.113.2'), {
      store: createGuestImageTrialStore(h.db), secret, create: true,
    }))
  } finally { await h.dispose() }
})

test('pre-existing guest wallets still share the ten-second network cap under concurrent spending', async () => {
  const h = await createD1TestDatabase()
  try {
    const store = createGuestVideoTrialStore(h.db)
    const guests = await Promise.all([1, 2, 3].map(n => resolveGuestVideoTrial(
      request(`203.0.113.${n}`), { store, secret, create: true },
    )))
    const networkKey = await guestVideoNetworkHash(request('203.0.113.10'), secret, 'daily-free-network')
    const credits = createD1GenerationCreditStore(h.db, networkKey)
    const attempts = await Promise.allSettled(guests.map(guest => credits.reserve(guest!.session.user.id, 5)))
    assert.equal(attempts.filter(result => result.status === 'fulfilled' && result.value).length, 2)
    const rejected = attempts.filter(result => result.status === 'rejected')
    assert.equal(rejected.length, 1)
    assert.equal(rejected[0].reason.code, 'NETWORK_FREE_BUDGET_EXCEEDED')
    assert.equal((await h.db.prepare('SELECT sum(network_free_credits) AS n FROM generation_credit_reservation').first<{n:number}>())?.n, 10)

    await h.db.prepare(`INSERT INTO "user"(id,name,email,plan,credit_balance)
      VALUES ('paid-account','Paid','paid@test','paid',100)`).run()
    assert.ok(await credits.reserve('paid-account', 5, { paidOnly: true }), 'paid credits remain usable on the network')
  } finally { await h.dispose() }
})
