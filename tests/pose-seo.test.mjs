import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { normalizeText } from '../scripts/generate-zh-site.mjs';

const origin = 'https://seedance3-pro.com';
const cluster = ['pose-to-image', 'pose-reference-camera-angle-examples', 'how-to-control-character-poses-in-seedance-with-3d-pose-references'];
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const text = (html) => normalizeText(html.replace(/<[^>]+>/g, ''));
const schemas = (html) => [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
  .flatMap(match => { const data = JSON.parse(match[1]); return data['@graph'] || [data]; });

for (const locale of ['', 'zh/']) {
  test(`${locale || 'en/'}pose landing focuses its title and H1 on AI pose generator`, () => {
    const html = read(`${locale}pose-to-image.html`);
    const title = text(html.match(/<title>([\s\S]*?)<\/title>/)[1]);
    const h1 = text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1]);
    assert.equal(title, locale ? 'AI 姿势生成器 | Seedance' : 'AI Pose Generator | Seedance');
    assert.equal(h1, locale ? 'AI 姿势生成器' : 'AI pose generator');
    for (const field of ['og:title', 'twitter:title']) {
      assert.equal(normalizeText(html.match(new RegExp(`<meta (?:name|property)="${field}" content="([^"]+)"`))[1]), title);
    }
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, new RegExp(`rel="canonical" href="${origin}/${locale}pose-to-image"`));
    assert.doesNotMatch(html, /name="robots" content="noindex/);
    const page = schemas(html).find(item => item['@type'] === 'WebPage');
    assert.equal(page.name, title);
    const body = text(html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/)[1]);
    assert.match(body, locale ? /姿势参考|参考图/ : /pose reference/i);
    assert.match(body, locale ? /镜头|机位/ : /camera angle/i);
  });

  test(`${locale || 'en/'}pose FAQPage describes exactly the six visible questions and answers`, () => {
    const html = read(`${locale}pose-to-image.html`);
    const faqNodes = schemas(html).filter(item => item['@type'] === 'FAQPage');
    assert.equal(faqNodes.length, 1, 'one FAQPage is emitted');
    const faq = faqNodes[0];
    assert.equal(faq['@id'], `${origin}/${locale}pose-to-image#faq`);
    assert.equal(faq.inLanguage, locale ? 'zh-Hans' : 'en');
    const visible = html.match(/<section\b[^>]*id="faq"[^>]*>([\s\S]*?)<\/section>/)[1];
    const pairs = [...visible.matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/g)]
      .map(match => [text(match[1]), text(match[2])]);
    assert.equal(pairs.length, 6);
    assert.deepEqual(faq.mainEntity.map(question => {
      assert.equal(question['@type'], 'Question');
      assert.equal(question.acceptedAnswer['@type'], 'Answer');
      return [text(question.name), text(question.acceptedAnswer.text)];
    }), pairs);
  });

  test(`${locale || 'en/'}pose generator, examples and guide remain a reciprocal HTML link cluster`, () => {
    for (const page of cluster) {
      const html = read(`${locale}${page}.html`);
      const destinations = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)]
        .map(match => new URL(match[1], `${origin}/${locale}${page}`).pathname);
      for (const other of cluster.filter(candidate => candidate !== page)) {
        assert.ok(destinations.includes(`/${locale}${other}`), `${page} links to ${locale}${other}`);
      }
    }
  });
}
