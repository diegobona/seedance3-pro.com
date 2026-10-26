import assert from 'node:assert/strict'
import test from 'node:test'
import { guestDeviceHash } from '../src/lib/guest-device'

test('only bounded versioned digests are accepted and server hashes are secret-scoped', async () => {
  const req = (value: string) => new Request('https://seedance3-pro.com/', { headers: { 'x-seedance-device': value } })
  const secret = 'device-secret-a-longer-than-thirty-two-characters'
  for (const value of ['', 'raw-device-data', 'v1:abc', `v2:${'a'.repeat(64)}`, `v1:${'a'.repeat(1024)}`]) {
    assert.equal(await guestDeviceHash(req(value), secret), null)
  }
  const request = req(`v1:${'a'.repeat(64)}`)
  const hash = await guestDeviceHash(request, secret)
  assert.match(hash!, /^[a-f0-9]{64}$/)
  assert.notEqual(hash, 'a'.repeat(64))
  assert.equal(hash, await guestDeviceHash(request, secret))
  assert.notEqual(hash, await guestDeviceHash(request, secret + 'other-site'))
})
