import assert from 'node:assert/strict'
import test from 'node:test'
import { createHmac } from 'node:crypto'
import { guestVideoNetworkHash, getGuestVideoBalance, resolveGuestVideoTrial, type GuestVideoIdentity, type GuestVideoTrialStore } from '../src/lib/guest-video-trial'
import { guestImageNetworkHash, getGuestImageBalance, resolveGuestImageTrial } from '../src/lib/guest-image-trial'

const secret = 'network-prefix-test-secret-at-least-32-characters'
const request = (ip: string, cookie = '') => new Request('https://seedance3-pro.com/api/videos/generate', {
  headers: { 'cf-connecting-ip': ip, cookie },
})
const legacy = (kind: string, ip: string) => createHmac('sha256', secret).update(`${kind}:${ip}`).digest('hex')
function harness() {
  const identities = new Map<string, GuestVideoIdentity>(), networks = new Set<string>()
  const store: GuestVideoTrialStore = {
    getById: async id => identities.get(id) ?? null,
    hasNetwork: async key => networks.has(key),
    getBalance: async () => 10,
    create: async identity => {
      if (networks.has(identity.networkHash)) throw new Error('duplicate network')
      networks.add(identity.networkHash); identities.set(identity.id, identity)
    },
  }
  return { store, identities, networks }
}

test('rotating IPv6 host addresses cannot acquire another video or image trial', async () => {
  for (const resolve of [resolveGuestVideoTrial, resolveGuestImageTrial]) {
    const h = harness(), options = { store: h.store, secret, create: true }
    await resolve(request('2001:db8:1234:5678::1'), options)
    await assert.rejects(resolve(request('2001:db8:1234:5678::2'), options), { code: 'GUEST_TRIAL_USED' })
    assert.equal(h.identities.size, 1)
  }
})

test('IPv6 /64 budgets are canonical, separate prefixes stay separate and IPv4 keys remain unchanged', async () => {
  for (const hash of [guestVideoNetworkHash, guestImageNetworkHash]) {
    const a = await hash(request('2001:db8:1234:5678::1'), secret, 'daily-free-network')
    assert.equal(a, await hash(request('2001:0db8:1234:5678:ffff:ffff:ffff:ffff'), secret, 'daily-free-network'))
    assert.notEqual(a, await hash(request('2001:db8:1234:5679::1'), secret, 'daily-free-network'))
    assert.equal(await hash(request('203.0.113.7'), secret, 'daily-free-network'), legacy('daily-free-network', '203.0.113.7'))
    assert.equal(await hash(request('::ffff:203.0.113.7'), secret, 'daily-free-network'), legacy('daily-free-network', '203.0.113.7'))
  }
})

test('legacy exact-IPv6 claims remain used and signed guest cookies retain their wallet', async () => {
  for (const [kind, resolve, balance] of [
    ['video', resolveGuestVideoTrial, getGuestVideoBalance],
    ['image', resolveGuestImageTrial, getGuestImageBalance],
  ] as const) {
    const ip = '2001:db8:1234:5678::5', h = harness(), options = { store: h.store, secret, create: true }
    h.networks.add(legacy(`guest-${kind}-network`, ip))
    assert.equal((await balance(request(ip), options)).remaining, 0)
    await assert.rejects(resolve(request(ip), options), { code: 'GUEST_TRIAL_USED' })
    const id = crypto.randomUUID(), identity = { id, userId: `legacy-${kind}`, networkHash: legacy(`guest-${kind}-network`, ip) }
    h.identities.set(id, identity)
    const cookie = `seedance_guest_${kind}=${id}.${legacy(`guest-${kind}`, id)}`
    assert.equal((await resolve(request(ip, cookie), options))?.session.user.id, identity.userId)
    assert.equal((await balance(request(ip, cookie), options)).remaining, 10)
  }
})
