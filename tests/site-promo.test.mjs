import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSitePromo, withSitePromo } from '../app/site-promo.mjs';

test('promo copy matches each language and both actions go directly to the video tool', () => {
  for (const locale of ['en', 'zh']) {
    const markup = renderSitePromo(locale);
    const prefix = locale === 'zh' ? '/zh' : '';
    assert.equal((markup.match(/data-promo-slide=/g) || []).length, 2);
    assert.equal((markup.match(new RegExp(`href="${prefix}/app/video/seedance-2-5"`, 'g')) || []).length, 2);
    for (const text of locale === 'zh'
      ? ['无需登录即可免费使用', '立即创建您的第一段视频', '免费开始', 'AI 视频', '积分包 US$11.90 起', '立即尝试']
      : ['No login needed', 'Create your first video', 'Start for free', 'AI video', 'Packs from US$11.90', 'Try now']) assert.ok(markup.includes(text), text);
    assert.ok(markup.includes('data-promo-close'));
    assert.ok(markup.includes('aria-pressed="true"'));
  }
});

test('every synchronized page gets a single banner before content and repeated sync is stable', () => {
  for (const pathname of ['/', '/zh/pricing', '/app/video/seedance-2-5', '/checkout']) {
    const input = '<html><head></head><body><main>Page content</main></body></html>';
    const output = withSitePromo(input, pathname);
    assert.equal((output.match(/data-site-promo>/g) || []).length, 1);
    assert.equal((output.match(/<body\b/g) || []).length, 1);
    assert.ok(output.includes('US$11.90'));
    assert.ok(output.indexOf('data-site-promo>') < output.indexOf('<main>'));
    assert.equal((output.match(/site-promo\.css/g) || []).length, 1);
    assert.equal((output.match(/site-promo-init\.mjs/g) || []).length, 1);
    assert.equal(withSitePromo(output, pathname), output);
    assert.ok(output.includes(pathname.startsWith('/zh') ? '无需登录即可免费使用' : 'No login needed'));
  }
});

test('language synchronization replaces promo text without retaining the other language', () => {
  const input = '<html><head></head><body></body></html>';
  const zh = withSitePromo(withSitePromo(input, '/'), '/zh/');
  assert.ok(zh.includes('立即尝试'));
  assert.ok(!zh.includes('No login needed'));
});
