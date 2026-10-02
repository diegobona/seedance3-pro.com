import test from 'node:test';
import assert from 'node:assert/strict';
import { readReferralStatsForLocalAdmin } from '../scripts/referral-analytics-admin.mjs';

test('the local CMS obtains its own service credential without requiring browser input', async () => {
  let request;
  const data = { success: true, source: 'anyposes', totals: { visitors: 3, visits: 5 } };
  const result = await readReferralStatsForLocalAdmin({
    getSecret: async key => { assert.equal(key, 'ANALYTICS_ADMIN_TOKEN'); return 'internal-service-secret'; },
    fetchImpl: async (url, options) => { request = { url, options }; return { ok: true, json: async () => data }; },
  });
  assert.deepEqual(result, { status: 200, body: data });
  assert.equal(request.url, 'https://seedance3-pro.com/api/admin/referrals/anyposes');
  assert.equal(request.options.headers['x-analytics-token'], 'internal-service-secret');
  assert.doesNotMatch(JSON.stringify(result), /secret/);
});

test('service configuration and network failures show a generic error without leaking the credential', async () => {
  for (const options of [
    { getSecret: async () => '', fetchImpl: async () => assert.fail('missing configuration cannot fetch') },
    { getSecret: async () => 'private', fetchImpl: async () => { throw new Error('private'); } },
    { getSecret: async () => 'private', fetchImpl: async () => ({ ok: false, status: 401 }) },
  ]) {
    const result = await readReferralStatsForLocalAdmin(options);
    assert.equal(result.status, 503);
    assert.doesNotMatch(JSON.stringify(result), /private|token|令牌/);
  }
});
