import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { partnerImageRedirect } from '../app/partner-image-redirect.mjs';
import { localeRedirect } from '../app/site-locale.mjs';

const origin = 'https://seedance3-pro.com';
function redirect(path, { marker = '', referrer = '', method = 'GET', host = origin } = {}) {
  const url = new URL(path, host);
  if (marker) url.searchParams.set('ref', marker);
  return partnerImageRedirect(new Request(url, { method, headers: referrer ? { referer: referrer } : {} }));
}

test('AnyPoses old image links redirect temporarily and preserve handoff parameters and hash', () => {
  for (const locale of ['', '/zh']) {
    for (const path of ['/app/image/gpt-image-2', '/app/image/gpt-image-2/', '/gpt-image-2', '/gpt-image-2.html', '/app/?model=gpt-image-2', '/app?model=gpt-image-2']) {
      for (const method of ['GET', 'HEAD']) {
        const source = new URL(locale + path, origin);
        source.searchParams.set('prompt', 'A red fox + a forest & sky');
        source.searchParams.set('aspect_ratio', '16:9');
        source.searchParams.set('lang', 'zh');
        source.searchParams.set('utm_source', 'anyposes');
        source.searchParams.append('tag', 'one');
        source.searchParams.append('tag', 'two');
        source.hash = '#reference';
        const response = redirect(source.href, { marker: 'anyposes', method });
        assert.ok(response, source.href);
        assert.equal(response.status, 302);
        assert.match(response.headers.get('cache-control'), /no-store/);
        const target = new URL(response.headers.get('location'));
        assert.equal(target.pathname, locale + '/app/image/gpt-image-2-5-1k');
        assert.equal(target.searchParams.get('prompt'), 'A red fox + a forest & sky');
        assert.equal(target.searchParams.get('aspect_ratio'), '16:9');
        assert.equal(target.searchParams.get('lang'), 'zh');
        assert.equal(target.searchParams.get('utm_source'), 'anyposes');
        assert.deepEqual(target.searchParams.getAll('tag'), ['one', 'two']);
        assert.equal(target.searchParams.get('ref'), 'anyposes');
        assert.equal(target.searchParams.has('model'), false);
        assert.equal(target.hash, '#reference');
        assert.equal(partnerImageRedirect(new Request(target)), null);
      }
    }
  }
});

test('an actual AnyPoses Referer survives canonical and locale hops through an explicit marker', () => {
  for (const referrer of ['https://anyposes.com/pose/1', 'https://www.anyposes.com/', 'https://studio.anyposes.com:443/']) {
    const response = redirect('/gpt-image-2.html?prompt=fox&aspect_ratio=1%3A1&lang=zh', {
      referrer, host: 'https://www.seedance3-pro.com',
    });
    assert.ok(response);
    const target = new URL(response.headers.get('location'));
    assert.equal(target.origin, origin);
    assert.equal(target.pathname, '/app/image/gpt-image-2-5-1k');
    assert.equal(target.searchParams.get('ref'), 'anyposes');
    const localized = localeRedirect(new Request(target), 'US');
    assert.ok(localized);
    const final = new URL(localized.headers.get('location'));
    assert.equal(final.pathname, '/zh/app/image/gpt-image-2-5-1k');
    assert.equal(final.searchParams.get('prompt'), 'fox');
    assert.equal(final.searchParams.get('aspect_ratio'), '1:1');
    assert.equal(final.searchParams.get('ref'), 'anyposes');
    assert.match(localized.headers.get('set-cookie'), /seedance_locale=zh/);
  }
});

test('direct, unrelated, spoofed and Pixal3D referrals retain their old image page', () => {
  for (const referrer of ['', 'https://google.com/', 'https://pixal3d.net/', 'https://anyposes.com.evil.example/', 'https://evilanyposes.com/', 'https://anyposes.com@evil.example/', 'invalid']) {
    assert.equal(redirect('/app/image/gpt-image-2?prompt=fox', { referrer }), null, referrer);
  }
  assert.equal(redirect('/app/image/gpt-image-2', { marker: 'pixal3d', referrer: 'https://anyposes.com/' }), null);
  for (const path of ['/app/image/gpt-image-2-5-1k', '/app/video/minimax-h3', '/gpt-image-2-prompts', '/app/?model=minimax-h3', '/app/', '/api/images/generate']) {
    assert.equal(redirect(path, { marker: 'anyposes' }), null, path);
  }
  for (const method of ['POST', 'PUT', 'OPTIONS']) {
    assert.equal(redirect('/app/image/gpt-image-2', { marker: 'anyposes', method }), null);
  }
});

test('the partner redirect precedes canonical, locale and ordinary model redirects in the Worker', () => {
  const source = readFileSync(new URL('../src/server.ts', import.meta.url), 'utf8');
  const partner = source.indexOf('partnerImageRedirect(request)');
  assert.ok(partner >= 0);
  for (const ordinary of ['canonicalSiteRedirect(request)', 'localeRedirect(request,', 'legacyModelRedirect(url)']) {
    assert.ok(partner < source.indexOf(ordinary), ordinary);
  }
});
