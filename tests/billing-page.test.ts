import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { isStudioDocument } from '../src/lib/site-static-proxy'
const hooks = registerHooks({
  load(url, context, next) {
    if (url.endsWith('.css')) return { format: 'module', shortCircuit: true, source: 'export default {}' }
    return next(url, context)
  },
})
const { BillingPage } = await import('../src/components/billing-page')
hooks.deregister()

test('billing pages render one fixed pack in both languages and require authentication', async () => {
  for (const path of ['/billing', '/zh/billing']) {
    const root = createRootRoute()
    const route = createRoute({ getParentRoute: () => root, path, component: BillingPage })
    const router = createRouter({ routeTree: root.addChildren([route]), history: createMemoryHistory({ initialEntries: [path + '?checkout=success&session_id=unverified'] }) })
    await router.load()
    const html = renderToString(createElement(RouterProvider, { router }))
    assert.match(html, /500/)
    assert.match(html, /US\$4\.99/)
    assert.match(html, path.startsWith('/zh') ? /每天获得 5 积分/ : /5 daily credits/)
    assert.match(html, path.startsWith('/zh') ? /5 张图片或 1 条 5 秒视频/ : /5 images or one 5-second video/)
    assert.match(html, path.startsWith('/zh') ? /购买积分包/ : /Buy credit pack/)
    assert.doesNotMatch(html, /Payment verified|支付已核实/)
    assert.match(html, /href="mailto:zw83716@gmail\.com"/)
    const prefix = path.startsWith('/zh') ? '/zh' : ''
    for (const page of ['refund-policy', 'privacy', 'terms', 'about']) {
      assert.ok(html.includes(`href="${prefix}/${page}"`), `${path}: ${page}`)
    }
    assert.equal(isStudioDocument(path), true)
    assert.equal(isStudioDocument(path + '/'), true)
  }
})
