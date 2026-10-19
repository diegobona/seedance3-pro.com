import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { flux3Content, FLUX_3_PATH } from '../app/flux-3-content.mjs';
import { canonicalModelPath, legacyModelRedirect, modelIdFromPath } from '../app/seo-routes.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('FLUX 3 search pages resolve to H3 without registering an unsupported generation model', () => {
  assert.equal(modelIdFromPath(FLUX_3_PATH), 'minimax-h3');
  assert.equal(modelIdFromPath('/zh' + FLUX_3_PATH), 'minimax-h3');
  assert.equal(canonicalModelPath('flux-3'), null);
  for (const old of ['/flux-3', '/flux-3.html', '/flux-3-video-generator', '/flux-3-video-generator.html']) {
    assert.equal(legacyModelRedirect(new URL('https://seedance3-pro.com' + old + '?ref=guide')), FLUX_3_PATH + '?ref=guide');
    assert.equal(legacyModelRedirect(new URL('https://seedance3-pro.com/zh' + old)), '/zh' + FLUX_3_PATH);
  }
});

test('both locales keep concise TDK, six FAQs and distinct video/image intentions', () => {
  for (const locale of ['en', 'zh']) {
    const page = flux3Content(locale);
    assert.ok(page.title.includes('FLUX 3') && page.title.length <= 60);
    assert.ok(page.description.length <= 155);
    assert.equal(page.questions.length, 6);
    assert.equal(page.headings.length, 7);
    assert.doesNotMatch(JSON.stringify(page), /FLUX 3\.0|Flux3|coming soon/i);
    assert.ok(page.videoCta.includes('MiniMax H3'));
    assert.ok(page.imageCta.includes('GPT Image 2.5'));
  }
  assert.match(read('src/lib/flux-3-head.ts'), /index,follow/);
});

test('homepage, public footer and related model pages link to the canonical FLUX 3 URL', () => {
  for (const [filename, href] of [['index.html', FLUX_3_PATH], ['zh/index.html', '/zh' + FLUX_3_PATH]]) {
    const html = read(filename);
    assert.ok(html.includes(`href="${href}"`));
    assert.match(html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0] || '', /data-flux-guide-link/);
  }
  assert.ok(read('src/components/model-landing-content.tsx').includes(`path('${FLUX_3_PATH}')`));
  const sitemap = read('sitemap.xml');
  for (const path of [FLUX_3_PATH, '/zh' + FLUX_3_PATH]) {
    const block = [...sitemap.matchAll(/<url>[\s\S]*?<\/url>/g)].map(match => match[0]).find(block => block.includes(`<loc>https://seedance3-pro.com${path}</loc>`));
    assert.ok(block);
    assert.match(block, /<priority>0\.8<\/priority>/);
  }
  assert.doesNotMatch(sitemap, /<loc>https:\/\/seedance3-pro\.com\/(?:zh\/)?(?:flux-3|flux-3-video-generator)<\/loc>/);
});
