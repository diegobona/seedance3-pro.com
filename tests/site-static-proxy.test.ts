import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchPublicPage, isStudioDocument } from '../src/lib/site-static-proxy'

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
