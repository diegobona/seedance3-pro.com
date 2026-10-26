import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import vm from 'node:vm';

const script = readFileSync(new URL('../assets/pose-entry-visibility.js', import.meta.url), 'utf8');
function browser() {
  let now = Date.now();
  const cookies = new Map();
  const requests = [];
  let succeeds = true;
  const document = {
    referrer: '',
    documentElement: { classList: { add() {}, remove() {} } },
    get cookie() {
      return [...cookies].filter(([, value]) => value.expires > now)
        .map(([key, value]) => `${key}=${value.value}`).join('; ');
    },
    set cookie(raw) {
      const [pair, ...attributes] = raw.split(';').map(value => value.trim());
      const separator = pair.indexOf('=');
      const maxAge = attributes.find(value => value.startsWith('Max-Age='))?.slice(8);
      cookies.set(pair.slice(0, separator), {
        value: pair.slice(separator + 1),
        expires: maxAge ? now + Number(maxAge) * 1000 : Infinity,
      });
    },
  };
  const window = {
    location: { hostname: 'seedance3-pro.com', protocol: 'https:', search: '', pathname: '/app/image/gpt-image-2' },
    crypto: { randomUUID },
    sessionStorage: { getItem: () => null, setItem() {} },
    fetch: async (url, options) => {
      requests.push({ url, ...options, body: JSON.parse(options.body) });
      return { ok: succeeds };
    },
  };
  return {
    requests, cookies,
    advance(ms) { now += ms; },
    fail() { succeeds = false; },
    async visit(search = '', referrer = '', pathname = '/app/image/gpt-image-2') {
      document.referrer = referrer;
      Object.assign(window.location, { search, pathname });
      vm.runInNewContext(script, { document, window, URL, URLSearchParams });
      await Promise.resolve();
      await Promise.resolve();
    },
  };
}

test('renamed GPT tool URLs preserve the existing referral identity and historical entry key', async () => {
  for (const prefix of ['', '/zh']) {
    const tab = browser();
    await tab.visit('?ref=pixal3d', '', prefix + '/app/image/gpt-image-2-5');
    assert.equal(tab.requests.length, 1);
    assert.equal(tab.requests[0].body.entryPath, '/app/image/gpt-image-2');
    await tab.visit('?ref=pixal3d', '', prefix + '/app/image/gpt-image-2');
    assert.equal(tab.requests.length, 1, 'renaming does not count an existing visit twice');
  }
});

test('explicit or actual referrals record anonymous IDs and only the entry path', async () => {
  for (const referrer of ['', 'https://www.anyposes.com/']) {
    const tab = browser();
    await tab.visit(referrer ? '' : '?ref=anyposes&prompt=private', referrer, '/app/image/gpt-image-2');
    assert.equal(tab.requests.length, 1);
    const request = tab.requests[0];
    assert.equal(request.url, '/api/referrals/anyposes');
    assert.equal(request.method, 'POST');
    assert.equal(request.keepalive, true);
    assert.equal(request.body.entryPath, '/app/image/gpt-image-2');
    assert.deepEqual(Object.keys(request.body).sort(), ['entryPath', 'visitId', 'visitorId']);
    assert.match(request.body.visitorId, /^[a-f0-9-]{36}$/);
  }
});

test('Pixal3D markers and referrers collect separately without hiding Pose Studio', async () => {
  for (const referrer of ['', 'https://www.pixal3d.net/']) {
    const tab = browser();
    await tab.visit(referrer ? '' : '?ref=pixal3d', referrer);
    assert.equal(tab.requests.length, 1);
    assert.equal(tab.requests[0].url, '/api/referrals/pixal3d');
    assert.equal(tab.cookies.has('seedance_pose_entries_hidden'), false);
    await tab.visit('', 'https://seedance3-pro.com/', '/');
    assert.equal(tab.requests.length, 1);
  }
});

test('one browser keeps independent source sessions and one shared visitor identity', async () => {
  const tab = browser();
  await tab.visit('?ref=anyposes');
  await tab.visit('?ref=pixal3d');
  await tab.visit('?ref=anyposes');
  await tab.visit('?ref=pixal3d');
  assert.equal(tab.requests.length, 2);
  assert.equal(tab.requests[0].body.visitorId, tab.requests[1].body.visitorId);
  assert.notEqual(tab.requests[0].body.visitId, tab.requests[1].body.visitId);
});

test('ordinary visits and an old Pose visibility flag do not become new referrals', async () => {
  const tab = browser();
  tab.cookies.set('seedance_pose_entries_hidden', { value: '1', expires: Infinity });
  await tab.visit('', 'https://google.com/');
  await tab.visit('?ref=other', 'https://anyposes.com.evil.example/');
  await tab.visit('', 'https://pixal3d.net.evil.example/');
  assert.equal(tab.requests.length, 0);
  assert.equal(tab.cookies.has('seedance_referral_visitor'), false);
});

test('Chinese landing records the same canonical path and visitor across locale switches', async () => {
  const tab = browser();
  await tab.visit('?ref=anyposes', '', '/zh/app/image/gpt-image-2');
  assert.equal(tab.requests.length, 1);
  assert.equal(tab.requests[0].body.entryPath, '/app/image/gpt-image-2');
  await tab.visit('', 'https://seedance3-pro.com/zh/app/image/gpt-image-2', '/app/image/gpt-image-2');
  assert.equal(tab.requests.length, 1);
});

test('GPT Image 2.5 referrals record both locales and retain the visit across old and new pages', async () => {
  for (const source of ['anyposes', 'pixal3d']) {
    for (const locale of ['', '/zh']) {
      const tab = browser();
      await tab.visit('?ref=' + source, '', locale + '/app/image/gpt-image-2-5-1k');
      assert.equal(tab.requests.length, 1);
      assert.equal(tab.requests[0].url, '/api/referrals/' + source);
      assert.equal(tab.requests[0].body.entryPath, '/app/image/gpt-image-2-5-1k');
      await tab.visit('?ref=' + source, '', '/app/image/gpt-image-2');
      await tab.visit('?ref=' + source, '', '/zh/app/image/gpt-image-2-5-1k');
      assert.equal(tab.requests.length, 1);
    }
  }
});

test('old visit cookies remain deduplicated after an AnyPoses redirect to 2.5', async () => {
  const tab = browser();
  await tab.visit('?ref=anyposes');
  const first = tab.requests[0].body;
  await tab.visit('?ref=anyposes', '', '/app/image/gpt-image-2-5-1k');
  assert.equal(tab.requests.length, 1);
  const visit = JSON.parse(decodeURIComponent(tab.cookies.get('seedance_anyposes_visit').value));
  assert.equal(visit.id, first.visitId);
  assert.equal(visit.path, '/app/image/gpt-image-2');
});

test('failed 2.5 recording retries the same visit and preserves its entry on internal navigation', async () => {
  const tab = browser();
  tab.fail();
  await tab.visit('?ref=anyposes', '', '/zh/app/image/gpt-image-2-5-1k');
  await tab.visit('', 'https://seedance3-pro.com/zh/app/image/gpt-image-2-5-1k', '/');
  assert.equal(tab.requests.length, 2);
  assert.equal(tab.requests[0].body.entryPath, '/app/image/gpt-image-2-5-1k');
  assert.deepEqual(tab.requests[1].body, tab.requests[0].body);
});

test('an explicit Pixal3D source wins over an AnyPoses Referer on GPT Image 2.5', async () => {
  const tab = browser();
  await tab.visit('?ref=pixal3d', 'https://anyposes.com/', '/app/image/gpt-image-2-5-1k');
  assert.equal(tab.requests.length, 1);
  assert.equal(tab.requests[0].url, '/api/referrals/pixal3d');
});

test('AnyPoses referrals entering the homepage or H3 are excluded', async () => {
  const tab = browser();
  await tab.visit('?ref=anyposes', 'https://anyposes.com/', '/');
  await tab.visit('?ref=anyposes', 'https://anyposes.com/', '/app/video/minimax-h3');
  assert.equal(tab.requests.length, 0);
});

test('refresh, internal navigation and new tabs reuse the recorded visit', async () => {
  const tab = browser();
  await tab.visit('?ref=anyposes', '', '/app/image/gpt-image-2');
  await tab.visit('?ref=anyposes', '', '/app/image/gpt-image-2');
  await tab.visit('', 'https://seedance3-pro.com/app/image/gpt-image-2', '/');
  assert.equal(tab.requests.length, 1);
});

test('a new referral after thirty inactive minutes adds a visit but keeps the browser identity', async () => {
  const tab = browser();
  await tab.visit('?ref=anyposes');
  const first = tab.requests[0].body;
  tab.advance(31 * 60 * 1000);
  await tab.visit('', 'https://seedance3-pro.com/');
  assert.equal(tab.requests.length, 1);
  await tab.visit('?ref=anyposes');
  assert.equal(tab.requests.length, 2);
  assert.equal(tab.requests[1].body.visitorId, first.visitorId);
  assert.notEqual(tab.requests[1].body.visitId, first.visitId);
});

test('failed recording retries the same visit and original entry path', async () => {
  const tab = browser();
  tab.fail();
  await tab.visit('?ref=anyposes', '', '/app/image/gpt-image-2');
  await tab.visit('', 'https://seedance3-pro.com/app/image/gpt-image-2', '/');
  assert.equal(tab.requests.length, 2);
  assert.deepEqual(tab.requests[1].body, tab.requests[0].body);
});

test('tracking skips browsers that block cookies instead of inflating unique visitors', async () => {
  let count = 0;
  const document = {
    referrer: 'https://anyposes.com/',
    documentElement: { classList: { add() {}, remove() {} } },
    get cookie() { return ''; },
    set cookie(_) {},
  };
  const window = {
    location: { hostname: 'seedance3-pro.com', protocol: 'https:', search: '', pathname: '/app/image/gpt-image-2' },
    crypto: { randomUUID }, fetch() { count += 1; },
  };
  vm.runInNewContext(script, { document, window, URL, URLSearchParams });
  assert.equal(count, 0);
});

