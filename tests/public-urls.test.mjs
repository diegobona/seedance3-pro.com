import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { publicArticlePath, articleFileFromCard, normalizeSitemapUrls } from '../scripts/public-urls.mjs';
import { parseBlogPosts, upsertBlogCardHtml, validateEditableBlogArticle } from '../scripts/blog-cms-html.mjs';
import { renderArticleDocument } from '../scripts/article-html.mjs';

const root = resolve(import.meta.dirname, '..');

test('static sitemap destinations agree with canonical and Open Graph URLs', () => {
  const sitemap = readFileSync(resolve(root, 'sitemap.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.equal(new Set(urls).size, urls.length);
  for (const url of urls) {
    const pathname = new URL(url).pathname;
    assert.ok(!pathname.endsWith('.html'), url);
    const file = resolve(root, pathname === '/' ? 'index.html' : `${pathname.slice(1)}.html`);
    if (!existsSync(file)) continue; // Dynamic model and case routes have their own SEO tests.
    const html = readFileSync(file, 'utf8');
    assert.ok(html.includes(`<link rel="canonical" href="${url}">`), url);
    assert.ok(html.includes(`<meta property="og:url" content="${url}">`), url);
  }
});

test('CMS clean URLs retain file identity through create, edit and legacy links', () => {
  const post = { fileName: 'new-guide.html', title: 'Guide', excerpt: 'A guide', category: 'Tutorial' };
  const canonical = `https://seedance3-pro.com${publicArticlePath(post.fileName)}`;
  const articleHtml = renderArticleDocument({ ...post, canonical, content: '<p>Body</p>' });
  let blog = '<!-- BLOG_POSTS_START --><!-- BLOG_POSTS_END -->';
  blog = upsertBlogCardHtml(blog, post);
  for (const source of [blog, blog.replace('href="./new-guide"', 'href="./new-guide.html"')]) {
    const updated = upsertBlogCardHtml(source, { ...post, title: 'Edited' });
    assert.equal(parseBlogPosts(updated).length, 1);
    assert.equal(parseBlogPosts(updated)[0].title, 'Edited');
    assert.equal(validateEditableBlogArticle({ fileName: post.fileName, blogHtml: updated, articleHtml }), post.fileName);
    assert.ok(updated.includes('href="./new-guide"'));
    assert.equal(articleFileFromCard(updated), post.fileName);
  }
  assert.equal(articleFileFromCard('<a href="./../secrets.html">bad</a>'), '');
});

test('sitemap normalization supports legacy CMS entries and is idempotent', () => {
  const original = '<url><loc>https://seedance3-pro.com/new-guide.html</loc><lastmod>2026-09-26</lastmod></url>';
  const normalized = normalizeSitemapUrls(original);
  assert.ok(normalized.includes('<loc>https://seedance3-pro.com/new-guide</loc>'));
  assert.ok(normalized.includes('<lastmod>2026-09-26</lastmod>'));
  assert.equal(normalizeSitemapUrls(normalized), normalized);
});
