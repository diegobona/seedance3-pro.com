import assert from 'node:assert/strict'
import test from 'node:test'
import { getGuestVideoBalance, resolveGuestVideoTrial, type GuestVideoIdentity, type GuestVideoTrialStore } from '../src/lib/guest-video-trial'

const secret = 'guest-test-secret-at-least-32-characters'
function request(cookie = '', ip = '203.0.113.7') {
  return new Request('https://seedance3-pro.com/api/videos/generate', { headers: { cookie, 'cf-connecting-ip': ip } })
}
function harness() {
  const identities = new Map<string, GuestVideoIdentity>()
  const networks = new Set<string>()
  const balances = new Map<string, number>()
  const store: GuestVideoTrialStore = {
    getById: async id => identities.get(id) ?? null,
    hasNetwork: async hash => networks.has(hash),
    create: async identity => {
      if (networks.has(identity.networkHash)) throw new Error('network already claimed')
      identities.set(identity.id, identity)
      networks.add(identity.networkHash)
      balances.set(identity.userId, 10)
    },
    getBalance: async id => balances.get(id) ?? 0,
  }
  return { store, identities, networks, balances }
}

test('guest creation issues a signed HttpOnly cookie and ten non-renewing seconds', async () => {
  const h = harness()
  const guest = await resolveGuestVideoTrial(request(), { secret, store: h.store, create: true })
  assert.ok(guest)
  assert.equal(guest.session.user.isGuest, true)
  assert.match(guest.setCookie!, /HttpOnly/)
  assert.match(guest.setCookie!, /Secure/)
  assert.match(guest.setCookie!, /SameSite=Lax/)
  const cookie = guest.setCookie!.split(';')[0]
  const resumed = await resolveGuestVideoTrial(request(cookie, '203.0.113.9'), { secret, store: h.store })
  assert.equal(resumed?.session.user.id, guest.session.user.id)
  assert.equal(h.identities.size, 1)
  const balance = await getGuestVideoBalance(request(cookie), { secret, store: h.store })
  assert.deepEqual(balance, { remaining: 10, generationCost: 5, guest: true, maxDuration: 10, expiresDaily: false })
  h.balances.set(guest.session.user.id, 5)
  assert.equal((await getGuestVideoBalance(request(cookie), { secret, store: h.store })).remaining, 5)
})

test('forged cookies cannot read another guest balance or task identity', async () => {
  const h = harness()
  const guest = await resolveGuestVideoTrial(request(), { secret, store: h.store, create: true })
  const forged = guest!.setCookie!.split(';')[0].replace(/.$/, 'x')
  assert.equal(await resolveGuestVideoTrial(request(forged), { secret, store: h.store }), null)
  assert.equal(await resolveGuestVideoTrial(request(guest!.setCookie!.split(';')[0]), { secret: secret + 'changed', store: h.store }), null)
})

test('deleting the cookie does not issue a second allowance on the same network', async () => {
  const h = harness()
  await resolveGuestVideoTrial(request(), { secret, store: h.store, create: true })
  assert.equal((await getGuestVideoBalance(request(), { secret, store: h.store })).remaining, 0)
  await assert.rejects(resolveGuestVideoTrial(request(), { secret, store: h.store, create: true }), { code: 'GUEST_TRIAL_USED' })
  assert.equal(h.identities.size, 1)
  assert.ok([...h.networks].every(hash => /^[a-f0-9]{64}$/.test(hash)))
})

test('balance preview does not provision a guest and does not trust forwarded-for', async () => {
  const h = harness()
  assert.equal((await getGuestVideoBalance(request(), { secret, store: h.store })).remaining, 10)
  assert.equal(h.identities.size, 0)
  const untrusted = new Request('https://seedance3-pro.com/api/videos/generate', { headers: { 'x-forwarded-for': '203.0.113.7' } })
  await assert.rejects(resolveGuestVideoTrial(untrusted, { secret, store: h.store, create: true }), { code: 'GUEST_TRIAL_UNAVAILABLE' })
})
