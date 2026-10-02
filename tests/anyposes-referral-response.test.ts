import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { recordAnyposesReferralResponse, getAnyposesReferralStatsResponse } from '../src/lib/anyposes-referral-response'

const origin = 'https://seedance3-pro.com'
const body = { visitorId: randomUUID(), visitId: randomUUID(), entryPath: '/app/image/gpt-image-2' }
function request(data: unknown = body, requestOrigin = origin) {
  return new Request(`${origin}/api/referrals/anyposes`, {
    method: 'POST', headers: { origin: requestOrigin, 'content-type': 'application/json' },
    body: JSON.stringify(data),
  })
}

test('same-origin collection records the anonymous visit and is not cached', async () => {
  let recorded: unknown
  const response = await recordAnyposesReferralResponse(request(), async visit => { recorded = visit })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(recorded, body)
  assert.deepEqual(await response.json(), { success: true })
})

test('cross-origin, missing origin and malformed/oversized payloads cannot touch storage', async () => {
  const calls: unknown[] = []
  const save = async (value: unknown) => { calls.push(value) }
  assert.equal((await recordAnyposesReferralResponse(request(body, 'https://example.com'), save)).status, 403)
  const missingOrigin = request(); missingOrigin.headers.delete('origin')
  assert.equal((await recordAnyposesReferralResponse(missingOrigin, save)).status, 403)
  for (const value of [null, { ...body, visitorId: 'invalid' }, { ...body, entryPath: '/app/video/minimax-h3' }, { ...body, entryPath: '//example.com' }, { ...body, entryPath: '/?email=private' }, { ...body, email: 'private' }, { ...body, entryPath: '/' + 'a'.repeat(1500) }]) {
    assert.ok([400, 413].includes((await recordAnyposesReferralResponse(request(value), save)).status))
  }
  const malformed = new Request(`${origin}/api/referrals/anyposes`, {
    method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: '{',
  })
  assert.equal((await recordAnyposesReferralResponse(malformed, save)).status, 400)
  assert.equal(calls.length, 0)
})

test('database errors return a retryable result without revealing connection details', async () => {
  const response = await recordAnyposesReferralResponse(request(), async () => { throw new Error('private database password') })
  assert.equal(response.status, 503)
  assert.doesNotMatch(await response.text(), /password/)
})

test('stats deny missing, incorrect or unconfigured admin tokens before reading the database', async () => {
  let reads = 0
  const read = async () => { reads += 1; return {} }
  for (const token of ['', 'wrong']) {
    const req = new Request(`${origin}/api/admin/referrals/anyposes`, { headers: { 'x-analytics-token': token } })
    assert.equal((await getAnyposesReferralStatsResponse(req, 'test-private-token', read)).status, 401)
  }
  assert.equal((await getAnyposesReferralStatsResponse(new Request(`${origin}/api/admin/referrals/anyposes`), '', read)).status, 503)
  assert.equal(reads, 0)
})

test('authorized stats return all periods with no caching', async () => {
  const token = 'test-private-token'
  const stats = { source: 'anyposes', timeZone: 'Asia/Shanghai', trackedSince: null, totals: { visitors: 0, visits: 0 }, days: [] }
  const req = new Request(`${origin}/api/admin/referrals/anyposes`, { headers: { 'x-analytics-token': token } })
  const response = await getAnyposesReferralStatsResponse(req, token, async () => stats)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), { success: true, ...stats })
})
