import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { renderSiteHeader, withSiteNavigation } from '../app/site-navigation.mjs';

test('shared navigation keeps language, selected destination and homepage handoff', () => {
  const home = renderSiteHeader({ pathname: '/zh/', locale: 'zh' });
  assert.match(home, /href="\/zh\/app\/video\/seedance-2-5\?from=home" data-video-workbench/);
  const showcase = renderSiteHeader({ pathname: '/zh/showcase', locale: 'zh' });
  assert.match(showcase, /href="\/zh\/showcase" aria-current="page">作品展示/);
  assert.match(showcase, /href="\/zh\/app\/image\/gpt-image-2-5-1k"/);
  assert.match(showcase, /href="\/showcase\?lang=en"/);
  assert.doesNotMatch(showcase, /data-video-workbench/);
  for (const locale of ['en', 'zh']) {
    const prefix = locale === 'zh' ? '/zh' : '';
    const pricing = renderSiteHeader({ pathname: prefix + '/pricing', locale });
    assert.equal((pricing.match(new RegExp(`href="${prefix}/pricing" aria-current="page"`, 'g')) || []).length, 2);
    assert.match(pricing, locale === 'zh' ? />价格<\/a>/ : />Pricing<\/a>/);
  }
});

test('public footers expose localized policies and direct support without duplicate synchronization', () => {
  for (const [pathname, prefix] of [['/', ''], ['/zh/pricing', '/zh']]) {
    const input = '<html><head></head><body><footer class="border-t">Existing footer</footer></body></html>';
    const output = withSiteNavigation(input, pathname);
    assert.match(output, /ColdStone Technology Co\., Ltd\./);
    assert.match(output, /href="mailto:zw83716@gmail\.com"/);
    for (const page of ['about', 'privacy', 'refund-policy', 'terms']) {
      assert.ok(output.includes(`href="${prefix}/${page}"`), `${pathname}: ${page}`);
    }
    assert.equal(withSiteNavigation(output, pathname), output);
    assert.equal((output.match(/data-site-trust/g) || []).length, 1);
    assert.equal((output.match(/site-trust\.css/g) || []).length, 1);
  }
});

test('purchase disclosures refresh their language when a public page is localized', () => {
  const input = '<html><head></head><body><a data-credit-pack-buy href="/billing">Buy</a><footer></footer></body></html>';
  const english = withSiteNavigation(input, '/seedance-3-0-release-date');
  const chinese = withSiteNavigation(english, '/zh/seedance-3-0-release-date');
  const notice = chinese.match(/<p[^>]*data-purchase-assurance[^>]*>[\s\S]*?<\/p>/)?.[0] || '';
  assert.match(notice, /一次性付款/);
  assert.ok(notice.includes('href="/zh/refund-policy"'));
  assert.equal(withSiteNavigation(chinese, '/zh/seedance-3-0-release-date'), chinese);
});

test('all static public pages use the shared header and synchronization is idempotent', async () => {
  for (const directory of ['', 'zh/']) {
    for (const file of await readdir(directory || '.')) {
      if (!file.endsWith('.html')) continue;
      const html = await readFile(directory + file, 'utf8');
      if (!html.includes('<header class="site-header"')) continue;
      const pathname = '/' + directory + (file === 'index.html' ? '' : file.slice(0, -5));
      assert.equal(withSiteNavigation(html, pathname), html, directory + file);
      assert.match(html, /src="\/assets\/site-navigation.js" defer/);
    }
  }
});
