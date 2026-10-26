import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSiteAccount } from '../assets/site-account.mjs';

const user = { id: 'account-1', name: 'Example', email: 'example@example.test' };

test('public account reads the cookie session and account balance without caching either response', async () => {
  const calls = [], sessions = [];
  const result = await loadSiteAccount({
    fetchImpl: async (url, options) => {
      calls.push({ url, credentials: options.credentials, cache: options.cache });
      return Response.json(url.includes('/auth/') ? { user } : { credits: { remaining: 515 } });
    },
    onSession: value => sessions.push(value),
  });
  assert.deepEqual(result, { user, credits: 515 });
  assert.deepEqual(sessions, [user]);
  assert.deepEqual(calls, [
    { url: '/api/auth/get-session', credentials: 'same-origin', cache: 'no-store' },
    { url: '/api/credits/balance', credentials: 'same-origin', cache: 'no-store' },
  ]);
});

test('guests and expired sessions never display a guest allowance as purchased account credits', async () => {
  for (const response of [Response.json(null), new Response(null, { status: 401 })]) {
    const calls = [];
    const result = await loadSiteAccount({ fetchImpl: async url => { calls.push(url); return response; } });
    assert.deepEqual(result, { user: null, credits: null });
    assert.deepEqual(calls, ['/api/auth/get-session']);
  }
  const result = await loadSiteAccount({ fetchImpl: async url => Response.json(url.includes('/auth/') ? { user } : { credits: { remaining: 10, guest: true } }) });
  assert.deepEqual(result, { user, credits: null });
});

test('a balance failure keeps the signed-in account visible, including while the balance is still loading', async () => {
  let shown = null;
  const result = await loadSiteAccount({
    onSession: value => { shown = value; },
    fetchImpl: async url => {
      if (url.includes('/auth/')) return Response.json({ user });
      assert.deepEqual(shown, user);
      throw new Error('Network unavailable');
    },
  });
  assert.deepEqual(result, { user, credits: null });
});

test('a temporary session failure is distinct from being logged out', async () => {
  let changed = false;
  await assert.rejects(loadSiteAccount({ fetchImpl: async () => new Response(null, { status: 503 }), onSession: () => { changed = true; } }), /Account unavailable/);
  assert.equal(changed, false);
});
