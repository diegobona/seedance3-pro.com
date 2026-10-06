import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  collectSeedanceNews, parseOfficialBlog, parseOfficialModels,
  NEWS_KEY, NEWS_CRON, NEWS_SOURCES,
} from '../src/lib/seedance-news'
import { newsPageRequest } from '../src/lib/seedance-news-page'

// Synthetic 3.0 entries below exercise the future announcement path; they are never published.
const now = new Date('2026-10-06T01:00:00Z')
function blog(title = 'Seedance 3.0 update (test fixture)', id = 1, date = Date.parse('2026-10-05T16:00:00Z')) {
  return {
    ArticleMeta: { ArticleID: id, Status: 2, StatusEn: 2, StatusZh: 2, PublishDate: date },
    ArticleSubContentEn: { Title: title, TitleKey: `test-fixture-${id}`, Abstract: 'Official source excerpt (test fixture).' },
    ArticleSubContentZh: { Title: 'Seedance 3.0 更新（测试数据）', TitleKey: `测试数据-${id}`, Abstract: '官方原文摘要（测试数据）。' },
  }
}
function blogHtml(entries = [blog()]) {
  return `<script>window._ROUTER_DATA = ${JSON.stringify({ loaderData: {
    '(locale$)/blog_list/(category)/page': { article_list: entries, category: 'visual', has_more: false },
  } })}</script>`
}
const modelsHtml = '<h3>Seedance 2.5</h3><a href="/en/seedance2_5">Learn more</a>'
function storage() {
  const values = new Map<string, string>()
  return {
    values,
    async get(key: string) { return values.has(key) ? JSON.parse(values.get(key)!) : null },
    async put(key: string, value: string) { values.set(key, value) },
  }
}
function sourceFetch(content = blogHtml(), failBlog = false): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input)
    assert.ok(NEWS_SOURCES.includes(url), `Only configured official sources may be fetched: ${url}`)
    if (url.includes('blog_list')) return new Response(content, { status: failBlog ? 503 : 200 })
    return new Response(modelsHtml)
  }) as typeof fetch
}

test('official blog parser pairs the original Chinese and English records and keeps the publication date', () => {
  const [item] = parseOfficialBlog(blogHtml(), now)
  assert.equal(item.title.en, 'Seedance 3.0 update (test fixture)')
  assert.equal(item.title.zh, 'Seedance 3.0 更新（测试数据）')
  assert.equal(item.publishedDate, '2026-10-06')
  assert.equal(item.url.en, 'https://seed.bytedance.com/en/blog/test-fixture-1')
  assert.ok(item.url.zh?.startsWith('https://seed.bytedance.com/zh/blog/'))
  assert.equal(item.kind, 'announcement')
})

test('Chinese-first announcements are captured without fabricating an English title or link', () => {
  const entry = blog()
  entry.ArticleMeta.StatusEn = 1
  const [item] = parseOfficialBlog(blogHtml([entry]), now)
  assert.equal(item.title.en, undefined)
  assert.equal(item.url.en, undefined)
  assert.equal(item.title.zh, 'Seedance 3.0 更新（测试数据）')
  assert.ok(item.url.zh?.startsWith('https://seed.bytedance.com/zh/blog/'))
})

test('2.5, 3.5, Seedream 3.0, unpublished and future-dated entries do not become 3.0 news', () => {
  const entries = [
    blog('Seedance 2.5'), blog('Seedance 3.5'), blog('Seedream 3.0'),
    { ...blog(), ArticleMeta: { ...blog().ArticleMeta, Status: 1 } },
    blog('Seedance 3.0', 9, Date.parse('2026-10-10T00:00:00Z')),
  ].map(entry => ({ ...entry, ArticleSubContentZh: { ...entry.ArticleSubContentZh, Title: '' } }))
  assert.deepEqual(parseOfficialBlog(blogHtml(entries), now), [])
  assert.throws(() => parseOfficialBlog('<html>Verify you are human</html>', now), /structure/i)
})

test('model listing is evidence of a listing and never an inferred release date', () => {
  assert.deepEqual(parseOfficialModels(modelsHtml), [])
  const [item] = parseOfficialModels('<h3>Seedance 3.0</h3><a href="/en/seedance3_0">Learn more</a>')
  assert.equal(item.kind, 'model-listing')
  assert.equal(item.publishedDate, null)
  assert.equal(item.url.en, 'https://seed.bytedance.com/en/seedance3_0')
  assert.throws(() => parseOfficialModels('<html>Access denied</html>'), /structure/i)
})

test('daily refresh deduplicates records and unchanged checks do not bump the article modification date', async () => {
  const kv = storage()
  const first = await collectSeedanceNews(kv, { now, fetchImpl: sourceFetch(blogHtml([blog(), blog()])) })
  assert.equal(first.items.length, 1)
  const tomorrow = new Date('2026-10-07T01:00:00Z')
  const second = await collectSeedanceNews(kv, { now: tomorrow, fetchImpl: sourceFetch() })
  assert.equal(second.items.length, 1)
  assert.equal(second.lastChangedAt, first.lastChangedAt)
  assert.equal(second.lastCheckedAt, tomorrow.toISOString())
  assert.ok(kv.values.has(NEWS_KEY))
})

test('locale source variations are merged once, retain each original locale, and do not create daily false updates', async () => {
  const en = blog(), zh = blog()
  en.ArticleSubContentEn.Title = 'Seedance 3.0 English update (test)'
  zh.ArticleSubContentZh.Title = 'Seedance 3.0 中文更新（测试）'
  const fetchImpl = (async (url: RequestInfo | URL) => new Response(String(url).includes('blog_list')
    ? blogHtml([String(url).includes('/zh/') ? zh : en]) : modelsHtml)) as typeof fetch
  const kv = storage()
  const first = await collectSeedanceNews(kv, { now, fetchImpl })
  const second = await collectSeedanceNews(kv, { now: new Date('2026-10-07T01:00:00Z'), fetchImpl })
  assert.equal(first.items[0].title.en, en.ArticleSubContentEn.Title)
  assert.equal(first.items[0].title.zh, zh.ArticleSubContentZh.Title)
  assert.equal(second.lastChangedAt, first.lastChangedAt)
})

test('a failed locale source retains its saved original title instead of adopting the other locale stale copy', async () => {
  const en = blog(), zh = blog()
  en.ArticleSubContentEn.Title = 'Seedance 3.0 English update (test)'
  zh.ArticleSubContentZh.Title = 'Seedance 3.0 中文更新（测试）'
  let failEnglish = false
  const fetchImpl = (async (url: RequestInfo | URL) => new Response(String(url).includes('blog_list')
    ? blogHtml([String(url).includes('/zh/') ? zh : en]) : modelsHtml,
    { status: failEnglish && String(url).includes('/en/blog_list/') ? 503 : 200 })) as typeof fetch
  const kv = storage()
  const first = await collectSeedanceNews(kv, { now, fetchImpl })
  failEnglish = true
  const failed = await collectSeedanceNews(kv, { now: new Date('2026-10-07T01:00:00Z'), fetchImpl })
  assert.equal(failed.items[0].title.en, first.items[0].title.en)
  assert.equal(failed.lastChangedAt, first.lastChangedAt)
  failEnglish = false
  const recovered = await collectSeedanceNews(kv, { now: new Date('2026-10-08T01:00:00Z'), fetchImpl })
  assert.equal(recovered.lastChangedAt, first.lastChangedAt)
})

test('dynamic news pages do not forward static origin validators or byte ranges', () => {
  const request = new Request('https://seedance3-pro.com/sitemap.xml', { headers: {
    'if-none-match': 'static-etag', 'if-modified-since': 'Tue, 06 Oct 2026 00:00:00 GMT', range: 'bytes=0-100', 'if-range': 'static-etag',
  } })
  const upstream = newsPageRequest(request)
  for (const header of ['if-none-match', 'if-modified-since', 'range', 'if-range']) assert.equal(upstream.headers.get(header), null)
  assert.equal(request.headers.get('if-none-match'), 'static-etag')
  const unrelated = new Request('https://seedance3-pro.com/blog', request)
  assert.equal(newsPageRequest(unrelated), unrelated)
})

test('failed or changed source markup retains the last good records and marks the check incomplete', async () => {
  const kv = storage()
  const first = await collectSeedanceNews(kv, { now, fetchImpl: sourceFetch() })
  const second = await collectSeedanceNews(kv, {
    now: new Date('2026-10-07T01:00:00Z'), fetchImpl: sourceFetch('<html>Changed markup</html>'),
  })
  assert.deepEqual(second.items, first.items)
  assert.equal(second.lastChangedAt, first.lastChangedAt)
  assert.equal(second.lastSuccessfulCheckAt, first.lastSuccessfulCheckAt)
  assert.equal(second.sources.every(source => source.ok), false)
})

test('empty successful inspection records a source check without fabricating a news update', async () => {
  const state = await collectSeedanceNews(storage(), { now, fetchImpl: sourceFetch(blogHtml([])) })
  assert.deepEqual(state.items, [])
  assert.equal(state.lastChangedAt, null)
  assert.equal(state.lastSuccessfulCheckAt, now.toISOString())
})

test('oversized sources and redirects fail closed instead of crawling arbitrary sites', async () => {
  for (const response of [
    () => new Response('x'.repeat(2_100_000)),
    () => new Response(null, { status: 302, headers: { location: 'https://example.com' } }),
  ]) {
    const state = await collectSeedanceNews(storage(), {
      now, fetchImpl: (async () => response()) as typeof fetch,
    })
    assert.deepEqual(state.items, [])
    assert.equal(state.lastSuccessfulCheckAt, null)
  }
})

test('the news cron runs once a day at 09:00 Asia/Shanghai while existing jobs keep their schedule', async () => {
  assert.equal(NEWS_CRON, '0 1 * * *')
  const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'))
  assert.ok(config.triggers.crons.includes(NEWS_CRON))
  assert.ok(config.triggers.crons.includes('* * * * *'))
})
