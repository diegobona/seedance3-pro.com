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

test('Pixal3D reads its own statistics and rejects mixed-source responses', async () => {
  const options = {
    source: 'pixal3d', getSecret: async () => 'private',
    fetchImpl: async url => {
      assert.equal(url, 'https://seedance3-pro.com/api/admin/referrals/pixal3d');
      return { ok: true, json: async () => ({ success: true, source: 'pixal3d', totals: { visitors: 0, visits: 0 } }) };
    },
  };
  assert.equal((await readReferralStatsForLocalAdmin(options)).status, 200);
  const mismatch = await readReferralStatsForLocalAdmin({ ...options,
    fetchImpl: async () => ({ ok: true, json: async () => ({ success: true, source: 'anyposes' }) }),
  });
  assert.equal(mismatch.status, 503);
});

test('unrecognized sources cannot trigger a credentialed request', async () => {
  const result = await readReferralStatsForLocalAdmin({ source: '../private',
    getSecret: async () => assert.fail('unknown source must not read secrets'),
    fetchImpl: async () => assert.fail('unknown source must not fetch'),
  });
  assert.equal(result.status, 400);
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
