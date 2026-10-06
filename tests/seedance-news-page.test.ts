import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import type { NewsState } from '../src/lib/seedance-news'
import { NEWS_SOURCES } from '../src/lib/seedance-news'

const state: NewsState = {
  version: 1, lastCheckedAt: '2026-10-07T01:00:00Z', lastSuccessfulCheckAt: '2026-10-07T01:00:00Z', lastChangedAt: '2026-10-06T01:00:00Z',
  sources: NEWS_SOURCES.map(url => ({ url, ok: true })),
  items: [{ id: 'blog:1', kind: 'announcement', publishedDate: '2026-10-05', firstSeenAt: '2026-10-06T01:00:00Z', fingerprint: '0'.repeat(64),
    title: { en: 'Seedance 3.0 <img src=x onerror=alert(1)> (test)', zh: 'Seedance 3.0 官方消息（测试数据）' },
    url: { en: 'https://seed.bytedance.com/en/blog/test', zh: 'https://seed.bytedance.com/zh/blog/test' },
  }],
}

async function runtime(html: string, snapshot: NewsState | null = state, contentType = 'text/html') {
  const { outputFiles } = await build({
    stdin: { contents: `import { rewriteNewsResponse } from './src/lib/seedance-news-page';
      const state = ${JSON.stringify(snapshot)};
      export default { fetch(request) { return rewriteNewsResponse(request, new Response(${JSON.stringify(html)}, {headers: {'content-type': ${JSON.stringify(contentType)}, 'content-length': '999', etag: 'old'}}), state); } };`,
      resolveDir: process.cwd(), loader: 'ts' },
    bundle: true, write: false, format: 'esm', platform: 'neutral',
  })
  return new Miniflare(convertV4MiniflareOptions({ modules: true, script: outputFiles[0].text, compatibilityDate: '2026-09-18' }))
}
function schema(html: string) {
  const raw = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)![1]
  return JSON.parse(raw)['@graph'] as Record<string, any>[]
}

test('Workers renders bilingual news into the HTML without JavaScript and escapes remote titles', async () => {
  for (const [file, url, title] of [
    ['seedance-3-0-release-date.html', '/seedance-3-0-release-date', 'Seedance 3.0 &lt;img'],
    ['zh/seedance-3-0-release-date.html', '/zh/seedance-3-0-release-date', '官方消息（测试数据）'],
  ]) {
    const html = await readFile(file, 'utf8')
    const mf = await runtime(html)
    try {
      const response = await mf.dispatchFetch(`https://seedance3-pro.com${url}`)
      const rendered = await response.text()
      assert.ok(rendered.includes(title))
      assert.doesNotMatch(rendered, /<img src=x/)
      assert.match(rendered, /2026-10-07 09:00/)
      assert.match(rendered, /2026-10-05/)
      assert.equal(response.headers.get('content-length'), null)
      assert.equal(response.headers.get('etag'), null)
      const article = schema(rendered).find(entry => entry['@type'] === 'Article')!
      assert.equal(article.dateModified, '2026-10-06')
      assert.equal(article.datePublished, '2026-10-06')
      // The historical review row must not be stamped with the next automated check date.
      assert.doesNotMatch(rendered, /data-release-reviewed[^>]*>2026-10-07/)
    } finally { await mf.dispose() }
  }
})

test('new official messages replace stale lead/FAQ assertions and JSON-LD matches the visible answers', async () => {
  for (const file of ['seedance-3-0-release-date.html', 'zh/seedance-3-0-release-date.html', 'index.html', 'zh/index.html']) {
    const html = await readFile(file, 'utf8')
    const mf = await runtime(html)
    try {
      const url = file.replace(/index\.html$/, '').replace(/\.html$/, '')
      const rendered = await (await mf.dispatchFetch(`https://seedance3-pro.com/${url}`)).text()
      const faq = schema(rendered).find(entry => entry['@type'] === 'FAQPage')!
      for (const question of faq.mainEntity) {
        if (!question.name.includes('Seedance 3.0')) continue
        const plain = rendered.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
        assert.ok(plain.includes(question.acceptedAnswer.text.replace(/\s+/g, ' ')), question.name)
      }
      if (file.includes('release-date')) {
        const lead = rendered.match(/<p class="article-lead">([\s\S]*?)<\/p>/)![1]
        assert.doesNotMatch(lead, /have not confirmed|尚未确认/)
      } else {
        const status = rendered.match(/<p[^>]*id="release-status"[^>]*>([\s\S]*?)<\/p>/)![1]
        assert.match(status, /latest-news/)
      }
    } finally { await mf.dispose() }
  }
})

test('failed checks say the inspection is incomplete and keep saved news visible', async () => {
  const html = await readFile('zh/seedance-3-0-release-date.html', 'utf8')
  const mf = await runtime(html, { ...state, sources: state.sources.map(source => ({ ...source, ok: false })) })
  try {
    const rendered = await (await mf.dispatchFetch('https://seedance3-pro.com/zh/seedance-3-0-release-date')).text()
    assert.match(rendered, /未完成|无法检查/)
    assert.match(rendered, /官方消息（测试数据）/)
  } finally { await mf.dispose() }
})

test('later news changes the visible date without JavaScript and removes stale current comparison assertions', async () => {
  const html = await readFile('seedance-3-0-release-date.html', 'utf8')
  const mf = await runtime(html, { ...state, lastCheckedAt: '2026-10-08T01:00:00Z', lastChangedAt: '2026-10-08T01:00:00Z' })
  try {
    const rendered = await (await mf.dispatchFetch('https://seedance3-pro.com/seedance-3-0-release-date')).text()
    assert.match(rendered, /data-release-updated[^>]*datetime="2026-10-08"[^>]*>2026-10-08<\/time>/)
    assert.match(rendered, /data-release-reviewed[^>]*>2026-10-06<\/time>/)
    const intro = rendered.match(/<p[^>]*id="seedance-comparison-note"[^>]*>([\s\S]*?)<\/p>/)![1]
    assert.doesNotMatch(intro, /specifications are still unconfirmed/)
    const table = rendered.match(/<table[^>]*id="seedance-comparison-table"[^>]*>([\s\S]*?)<\/table>/)![1]
    assert.doesNotMatch(table, /remain unconfirmed|still await official confirmation|have not confirmed 3\.0/)
    assert.match(table, /30 seconds/)
  } finally { await mf.dispose() }
})

test('unrelated responses and pages without a saved inspection are left intact', async () => {
  const html = '<p>Original content</p>'
  const mf = await runtime(html, null)
  try {
    assert.equal(await (await mf.dispatchFetch('https://seedance3-pro.com/blog')).text(), html)
    assert.equal(await (await mf.dispatchFetch('https://seedance3-pro.com/seedance-3-0-release-date')).text(), html)
  } finally { await mf.dispose() }
})

test('sitemap lastmod changes only for the affected documents and only when news changed', async () => {
  const xml = '<urlset><url><loc>https://seedance3-pro.com/seedance-3-0-release-date</loc><lastmod>2026-10-06</lastmod></url><url><loc>https://seedance3-pro.com/blog</loc><lastmod>2026-10-06</lastmod></url></urlset>'
  const mf = await runtime(xml, { ...state, lastChangedAt: '2026-10-08T01:00:00Z' }, 'application/xml')
  try {
    const rendered = await (await mf.dispatchFetch('https://seedance3-pro.com/sitemap.xml')).text()
    assert.match(rendered, /release-date<\/loc><lastmod>2026-10-08/)
    assert.match(rendered, /\/blog<\/loc><lastmod>2026-10-06/)
  } finally { await mf.dispose() }
})
