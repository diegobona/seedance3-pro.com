import assert from 'node:assert/strict'
import test from 'node:test'
import { registerHooks } from 'node:module'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'

const hooks = registerHooks({
  load(url, context, nextLoad) {
    if (/\.(?:css|png|webp|mp4|jpe?g|svg)(?:\?|$)/.test(url)) {
      return { format: 'module', shortCircuit: true, source: `export default ${JSON.stringify(url)}` }
    }
    return nextLoad(url, context)
  },
})
const { StudioPage } = await import('../src/routes/app')
hooks.deregister()

async function render(pathname: string, initialModel = 'minimax-h3') {
  const root = createRootRoute()
  const route = createRoute({ getParentRoute: () => root, path: pathname,
    component: () => createElement(StudioPage, { initialModel, modelLanding: true }) })
  const router = createRouter({ routeTree: root.addChildren([route]), history: createMemoryHistory({ initialEntries: [pathname] }) })
  await router.load()
  return renderToString(createElement(RouterProvider, { router }))
}

test('guest H3 landing is registration-free, defaults to five seconds and caps selection at ten in both languages', async () => {
  for (const prefix of ['', '/zh']) {
    const html = await render(`${prefix}/app/video/minimax-h3`)
    const notice = html.match(/<aside\b[^>]*class="studio-trial-notice"[^>]*>([\s\S]*?)<\/aside>/)?.[1] ?? ''
    assert.match(notice, prefix ? /无需注册和登录/ : /No registration or login required/)
    assert.match(notice, prefix ? /可选 5 秒或 10 秒/ : /Choose 5 or 10 seconds/)
    assert.doesNotMatch(notice, /studio-trial-register|<button|480p|15 credits|15 积分/)
    const duration = html.match(/<select\b[^>]*id="video-duration"[^>]*>([\s\S]*?)<\/select>/)?.[1] ?? ''
    assert.match(duration, /<option\b[^>]*value="5"[^>]*selected/)
    assert.match(duration, /<option\b[^>]*value="15"[^>]*disabled/)
    assert.match(html, /data-authenticated="false"/)
  }
})

test('GPT Image 2.5 retains the requested intro removal while adding guest H3 support', async () => {
  const html = await render('/zh/app/image/gpt-image-2-5-1k', 'gpt-image-2-5-1k')
  assert.doesNotMatch(html, /class="model-landing-intro"/)
  assert.match(html, /<h1\b[^>]*id="model-name"/)
})

test('both image landing pages offer the same two-image guest allowance without registration', async () => {
  for (const model of ['gpt-image-2', 'gpt-image-2-5-1k']) {
    for (const prefix of ['', '/zh']) {
      const html = await render(`${prefix}/app/image/${model}`, model)
      const notice = html.match(/<aside\b[^>]*class="studio-trial-notice"[^>]*>([\s\S]*?)<\/aside>/)?.[1] ?? ''
      assert.match(notice, prefix ? /无需注册和登录/ : /No registration or login required/)
      assert.match(notice, prefix ? /共用 2 张免费图片额度/ : /share 2 free images/)
      assert.doesNotMatch(notice, /<button|15 credits|15 积分/)
      const quantity = html.match(/<select\b[^>]*id="image-quantity"[^>]*>([\s\S]*?)<\/select>/)?.[1] ?? ''
      assert.match(quantity, /<option\b[^>]*value="3"[^>]*disabled/)
      assert.match(html, prefix ? /免费生成 1 张图片/ : /Generate 1 image · free/)
      assert.match(html, prefix ? /剩余 — 张图片/ : /— images remaining/)
    }
  }
})
