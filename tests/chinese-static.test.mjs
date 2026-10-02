import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { attachLanguageMetadata, collectTranslationSources, generateChineseSite, localizedUrl, normalizeText } from '../scripts/generate-zh-site.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://seedance3-pro.com';

test('Chinese catalog covers every public static page, including full article text', async () => {
  const sources = await collectTranslationSources({ rootDirectory: root });
  const catalog = JSON.parse(await fs.readFile(path.join(root, 'scripts/i18n/zh-Hans.json'), 'utf8'));
  const dictionary = new Map(catalog.entries.map((entry) => [normalizeText(entry.source), entry.translation]));
  assert.ok(Object.keys(sources).length >= 27);
  for (const [file, values] of Object.entries(sources)) {
    assert.deepEqual(values.filter((source) => !dictionary.has(normalizeText(source))), [], file);
    const chinese = await fs.readFile(path.join(root, 'zh', file), 'utf8');
    assert.match(chinese, /<html lang="zh-Hans">/);
    assert.match(chinese, /<title>[^<]*[\u4e00-\u9fff]/);
    assert.match(chinese, /rel="canonical" href="https:\/\/seedance3-pro\.com\/zh\//);
    assert.match(chinese, /hreflang="zh-Hans"/);
    assert.match(chinese, /content="zh_CN"/);
    assert.doesNotMatch(chinese, /(?:href|src|poster|data-preview-src)="\/zh\/(?:assets|media|blog-assets|api|admin|site\.css|main\.js)/);
    assert.doesNotMatch(chinese, /(?:src|poster|data-preview-src)="\.\.?\//);
  }
  const longGuide = await fs.readFile(path.join(root, 'zh/seedance-2-5-image-to-video-guide.html'), 'utf8');
  assert.match(longGuide, /较长片段先写简单分镜时间表/);
  assert.match(longGuide, /如果仍使用旧流程，核心经验依然有用/);
  assert.match(longGuide, /<div class="prompt-box" lang="en" translate="no">Use @Image 1 as the exact visual reference\./);
});

test('localized links preserve queries and fragments while shared resources remain at root', () => {
  const pages = new Set(['/', '/blog', '/features']);
  assert.equal(localizedUrl('./features.html?ref=partner#camera', '/blog', pages), '/zh/features?ref=partner#camera');
  assert.equal(localizedUrl('./?ref=partner#top', '/features', pages), '/zh/?ref=partner#top');
  assert.equal(localizedUrl('/app/video/minimax-h3?prompt=one%20shot', '/', pages), '/zh/app/video/minimax-h3?prompt=one%20shot');
  assert.equal(localizedUrl('./assets/image.webp?v=2', '/features', pages), '/assets/image.webp?v=2');
  assert.equal(localizedUrl('/api/generate?job=1', '/features', pages), '/api/generate?job=1');
  assert.equal(localizedUrl('/admin/', '/features', pages), '/admin/');
  assert.equal(localizedUrl('https://other.example/features', '/', pages), 'https://other.example/features');
  assert.equal(localizedUrl('#camera', '/features', pages), '#camera');
});

test('language metadata injection is idempotent across all existing header layouts', async () => {
  for (const filename of ['index.html', 'features.html', '404.html', 'how-to-use-the-seedance-api-complete-developer-guide-2026-2.html']) {
    const html = await fs.readFile(path.join(root, filename), 'utf8');
    const englishPath = filename === 'index.html' ? '/' : `/${filename.replace(/\.html$/, '')}`;
    const once = attachLanguageMetadata(html, englishPath, 'en');
    assert.equal(attachLanguageMetadata(once, englishPath, 'en'), once, filename);
    assert.equal(attachLanguageMetadata(once.replace(/\?lang=(?:en|zh)(?=")/g, ''), englishPath, 'en'), once, filename);
    assert.match(once, /href="[^"]*\?lang=zh" data-language="zh"/, filename);
    assert.match(once, /href="[^"]*\?lang=en" data-language="en"/, filename);
    assert.equal((once.match(/hreflang="zh-Hans"/g) || []).length, 1, filename);
    assert.doesNotMatch(once, /site-language-standalone"><\/div>/, filename);
  }
});

test('generator renders explicit Chinese CMS overrides and keeps English content', async (t) => {
  const fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'seedance-zh-test-'));
  t.after(() => fs.rm(fixture, { recursive: true, force: true }));
  await fs.mkdir(path.join(fixture, 'scripts/i18n'), { recursive: true });
  await fs.mkdir(path.join(fixture, 'assets'));
  const english = `<!doctype html><html lang="en"><head><title>Original English article</title><link rel="canonical" href="${origin}/article"></head><body><header><nav><a href="/">Home</a></nav></header><article><h1>Original English article</h1><p>Untranslated English draft stays private to the original page.</p></article></body></html>`;
  const chineseOverride = `<!doctype html><html lang="zh-Hans"><head><title>用户提供的中文文章</title><link rel="canonical" href="${origin}/article"></head><body><header><nav><a href="/">Home</a></nav></header><article><h1>用户提供的中文文章</h1><p>完整中文内容保留。</p><p>使用 Seedance 和 GPT Image 2 的 AI 图像流程。</p><blockquote><p>用户提供的中文引用。</p></blockquote><img src="./blog-assets/example.webp"><a href="./app/video/minimax-h3?ref=author#editor">开始制作</a></article></body></html>`;
  await fs.writeFile(path.join(fixture, 'article.html'), english);
  await fs.writeFile(path.join(fixture, 'main.js'), '');
  await fs.writeFile(path.join(fixture, 'scripts/i18n/static-ui.zh-Hans.json'), '{}');
  await fs.writeFile(path.join(fixture, 'scripts/i18n/article-overrides.json'), JSON.stringify({ 'article.html': chineseOverride }));
  await fs.writeFile(path.join(fixture, 'scripts/i18n/zh-Hans.json'), JSON.stringify({ entries: [{ source: 'Home', translation: '首页' }, { source: 'Site language', translation: '网站语言' }, { source: 'EN', translation: 'EN' }] }));
  assert.deepEqual(await generateChineseSite({ rootDirectory: fixture }), { pages: 1, missing: [] });
  const generated = await fs.readFile(path.join(fixture, 'zh/article.html'), 'utf8');
  const updatedEnglish = await fs.readFile(path.join(fixture, 'article.html'), 'utf8');
  assert.match(generated, /完整中文内容保留。/);
  assert.match(generated, /使用 Seedance 和 GPT Image 2 的 AI 图像流程。/);
  assert.match(generated, /<blockquote><p>用户提供的中文引用。<\/p><\/blockquote>/);
  assert.doesNotMatch(generated, /Untranslated English draft/);
  assert.match(generated, /href="\/zh\/app\/video\/minimax-h3\?ref=author#editor"/);
  assert.match(generated, /src="\/blog-assets\/example.webp"/);
  assert.match(updatedEnglish, /Untranslated English draft stays private to the original page\./);
  const collected = await collectTranslationSources({ rootDirectory: fixture });
  assert.ok(!collected['article.html'].some((source) => source.includes('Untranslated English draft')));
  await generateChineseSite({ rootDirectory: fixture });
  assert.equal(await fs.readFile(path.join(fixture, 'zh/article.html'), 'utf8'), generated);
  assert.equal(await fs.readFile(path.join(fixture, 'article.html'), 'utf8'), updatedEnglish);
});

test('browser language links preserve referral and fragment and persist explicit preference', async () => {
  const handlers = {};
  const document = { readyState: 'loading', cookie: '', addEventListener: (name, fn) => { handlers[name] = fn; } };
  const location = { href: `${origin}/zh/blog?ref=affiliate#guide`, origin, hostname: 'seedance3-pro.com', pathname: '/zh/blog', protocol: 'https:' };
  const window = {};
  vm.runInNewContext(await fs.readFile(path.join(root, 'assets/site-language.js'), 'utf8'), { document, location, window, URL });
  assert.equal(window.SeedanceLanguage.pathForLocale('en'), '/blog?ref=affiliate&lang=en#guide');
  assert.equal(window.SeedanceLanguage.pathForLocale('zh'), '/zh/blog?ref=affiliate&lang=zh#guide');
  window.SeedanceLanguage.rememberLocale('en');
  assert.match(document.cookie, /seedance_locale=en; Max-Age=31536000; Path=\/; SameSite=Lax; Domain=seedance3-pro.com; Secure/);
});
