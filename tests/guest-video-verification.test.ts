import assert from 'node:assert/strict'
import test from 'node:test'
import { verifyGuestVideoRequest } from '../src/lib/guest-video-verification'

const environment = { TURNSTILE_SITE_KEY:'test-site', TURNSTILE_SECRET:'test-secret', TURNSTILE_HOSTNAMES:'seedance3-pro.com,www.seedance3-pro.com' }
const action = 'guest_video_generate'
const request = (token = '', host = 'seedance3-pro.com') => new Request(`https://${host}/api/videos/generate`, {
  method:'POST', headers:{ 'x-seedance-verification':token, 'cf-connecting-ip':'203.0.113.10', 'x-forwarded-for':'untrusted' },
})
const neverFetch = async () => { assert.fail('verification network call must not run') }

test('missing token returns a public challenge without provisioning guests or exposing the secret', async () => {
  const response = (await verifyGuestVideoRequest(request(), environment, action, neverFetch))!
  assert.equal(response.status, 403)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const body = await response.json() as { code:string; verification:unknown }
  assert.equal(body.code, 'GUEST_VERIFICATION_REQUIRED')
  assert.deepEqual(body.verification, { siteKey:'test-site', action })
  assert.ok(!JSON.stringify(body).includes('test-secret'))
})

test('missing configuration, invalid tokens and wrong request hosts never bypass verification', async () => {
  assert.equal((await verifyGuestVideoRequest(request(), {}, action, neverFetch))?.status, 503)
  assert.equal((await verifyGuestVideoRequest(request('token','localhost'), environment, action, neverFetch))?.status, 503)
  for (const token of [' '.repeat(5), 'x'.repeat(2049)]) {
    assert.equal((await verifyGuestVideoRequest(request(token), environment, action, neverFetch))?.status, 403)
  }
})

test('valid verification uses the trusted IP and accepts only the exact hostname and action', async () => {
  const response = await verifyGuestVideoRequest(request('fresh'), environment, action, async (url, init) => {
    assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify')
    const form = new URLSearchParams(String(init?.body))
    assert.equal(form.get('response'), 'fresh')
    assert.equal(form.get('secret'), 'test-secret')
    assert.equal(form.get('remoteip'), '203.0.113.10')
    return Response.json({ success:true, action, hostname:'seedance3-pro.com' })
  })
  assert.equal(response, null)
  for (const result of [
    { success:false, action, hostname:'seedance3-pro.com' },
    { success:'true', action, hostname:'seedance3-pro.com' },
    { success:true, action:'guest_video_reference', hostname:'seedance3-pro.com' },
    { success:true, action, hostname:'localhost' },
    { success:true, action, hostname:'www.seedance3-pro.com' },
    { success:true, action },
  ]) {
    assert.equal((await verifyGuestVideoRequest(request('token'), environment, action, async () => Response.json(result)))?.status, 403)
  }
})

test('network errors, non-JSON and non-2xx Siteverify responses fail closed', async () => {
  for (const fetchImpl of [
    async () => { throw new Error('timeout') },
    async () => new Response('not JSON'),
    async () => Response.json({ success:true, action, hostname:'seedance3-pro.com' }, { status:503 }),
  ]) assert.equal((await verifyGuestVideoRequest(request('token'), environment, action, fetchImpl))?.status, 503)
})

test('every request is revalidated and a consumed token is rejected', async () => {
  let calls = 0
  const siteverify = async () => Response.json(++calls === 1
    ? { success:true, action, hostname:'seedance3-pro.com' }
    : { success:false, 'error-codes':['timeout-or-duplicate'] })
  const results = await Promise.all([1,2].map(() => verifyGuestVideoRequest(request('same-token'), environment, action, siteverify)))
  assert.equal(calls, 2)
  assert.equal(results.filter(result => result === null).length, 1)
  assert.equal(results.filter(result => result?.status === 403).length, 1)
})
