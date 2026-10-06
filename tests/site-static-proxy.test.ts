import test from 'node:test'
import assert from 'node:assert/strict'
import { canonicalSiteRedirect, fetchPublicPage, isStudioDocument } from '../src/lib/site-static-proxy'
import { localeRedirect } from '../app/site-locale.mjs'

test('www and HTML aliases redirect permanently to the same non-www clean document', () => {
  for (const [source, destination] of [
    ['https://www.seedance3-pro.com/', 'https://seedance3-pro.com/'],
    ['https://www.seedance3-pro.com/blog', 'https://seedance3-pro.com/blog'],
    ['https://seedance3-pro.com/blog.html', 'https://seedance3-pro.com/blog'],
    ['https://www.seedance3-pro.com/zh/seedance-3-0-release-date.html?utm_source=email', 'https://seedance3-pro.com/zh/seedance-3-0-release-date?utm_source=email'],
    ['https://seedance3-pro.com/index.html', 'https://seedance3-pro.com/'],
    ['https://seedance3-pro.com/zh/index.html', 'https://seedance3-pro.com/zh/'],
    ['https://seedance3-pro.com/guide-index.html', 'https://seedance3-pro.com/guide-index'],
    ['https://www.seedance3-pro.com/gpt-image-2.html', 'https://seedance3-pro.com/app/image/gpt-image-2'],
    ['https://seedance3-pro.com/zh/minimax-h3-ai-video-generator.html?ref=partner', 'https://seedance3-pro.com/zh/app/video/minimax-h3?ref=partner'],
  ]) {
    for (const method of ['GET', 'HEAD']) {
      const response = canonicalSiteRedirect(new Request(source, { method }))
      assert.equal(response?.status, 301, `${method} ${source}`)
      assert.equal(response.headers.get('location'), destination)
      assert.equal(canonicalSiteRedirect(new Request(destination, { method })), null)
    }
  }
})

test('URL normalization preserves language choices and their existing cookie/parameter cleanup', () => {
  const response = canonicalSiteRedirect(new Request('https://www.seedance3-pro.com/seedance-3-0-release-date.html?lang=zh&ref=partner'))
  assert.equal(response?.status, 301)
  const switched = localeRedirect(new Request(response.headers.get('location')!), 'US')!
  assert.equal(switched.headers.get('location'), 'https://seedance3-pro.com/zh/seedance-3-0-release-date?ref=partner')
  assert.match(switched.headers.get('set-cookie')!, /seedance_locale=zh;/)
  assert.match(switched.headers.get('cache-control')!, /no-store/)
  assert.equal(canonicalSiteRedirect(new Request(switched.headers.get('location')!)), null)
})

test('normalization leaves clean URLs, preview hosts, non-read methods and neutral file paths intact', () => {
  for (const url of [
    'https://seedance3-pro.com/zh/seedance-3-0-release-date',
    'https://seedance3-pro.com/app/image/gpt-image-2?prompt=hello%20world',
    'https://seedance3-pro.com/sitemap.xml',
    'https://seedance3-pro.com/assets/example.html',
    'https://seedance3-pro.com/admin/index.html',
    'https://seedance3-pro.com/api/example.html',
    'https://seedance3-pro-com.pages.dev/blog.html',
    'http://localhost:4178/blog.html',
  ]) assert.equal(canonicalSiteRedirect(new Request(url)), null, url)
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
    assert.equal(canonicalSiteRedirect(new Request('https://www.seedance3-pro.com/blog.html', { method })), null)
  }
})

test('www service endpoints keep their origin so host-only login cookies and server calls remain valid', () => {
  for (const path of ['/api/auth/get-session', '/api/auth/callback/google?state=example&code=example', '/api/job/example', '/_serverFn/get-session', '/@tanstack-start/server-functions']) {
    for (const method of ['GET', 'HEAD']) {
      assert.equal(canonicalSiteRedirect(new Request('https://www.seedance3-pro.com' + path, { method })), null, `${method} ${path}`)
    }
  }
})

test('public Pages proxy preserves document stream/status and does not leak private cookies', async () => {
  const response = await fetchPublicPage(new Request('https://seedance3-pro.com/zh/blog?ref=anyposes', { headers: { cookie: 'private=secret', authorization: 'secret' } }), async request => {
    const upstream = request as Request
    assert.equal(upstream.url, 'https://seedance3-pro-com.pages.dev/zh/blog?ref=anyposes')
    assert.equal(upstream.headers.get('cookie'), null)
    assert.equal(upstream.headers.get('authorization'), null)
    return new Response('<html lang="zh-CN">中文</html>', { headers: { 'content-type': 'text/html' } })
  })
  assert.equal(response.headers.get('content-language'), 'zh-Hans')
  assert.match(await response.text(), /中文/)
})

test('Pages redirects stay on public host and HEAD/404 responses remain correct', async () => {
  const redirect = await fetchPublicPage(new Request('https://seedance3-pro.com/zh/blog.html'), async () => new Response(null, { status: 308, headers: { location: '/zh/blog' } }))
  assert.equal(redirect.headers.get('location'), 'https://seedance3-pro.com/zh/blog')
  const notFound = await fetchPublicPage(new Request('https://seedance3-pro.com/missing', { method: 'HEAD' }), async () => new Response('Missing', { status: 404 }))
  assert.equal(notFound.status, 404)
  assert.equal(await notFound.text(), '')
  assert.equal(isStudioDocument('/zh/app/image/gpt-image-2'), true)
  assert.equal(isStudioDocument('/zh/minimax-h3-prompts/my-video'), true)
  assert.equal(isStudioDocument('/zh/blog'), false)
})
