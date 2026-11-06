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

test('billing pages retain the entry offer and expose the Buy Credits picker in both languages', async () => {
  for (const path of ['/billing', '/zh/billing']) {
    const root = createRootRoute()
    const route = createRoute({ getParentRoute: () => root, path, component: BillingPage })
    const router = createRouter({ routeTree: root.addChildren([route]), history: createMemoryHistory({ initialEntries: [path + '?checkout=success&session_id=unverified'] }) })
    await router.load()
    const html = renderToString(createElement(RouterProvider, { router }))
    assert.match(html, /1,100/)
    assert.match(html, /US\$11\.90/)
    assert.doesNotMatch(html, /每天获得 5 积分|5 daily credits/)
    assert.match(html, path.startsWith('/zh') ? /体验额度用完后，请登录并购买积分包继续/ : /After the trial, log in and buy a credit pack to continue/)
    assert.match(html, path.startsWith('/zh') ? /购买积分/ : /Buy Credits/)
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
