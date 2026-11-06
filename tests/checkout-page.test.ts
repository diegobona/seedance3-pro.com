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
const { CheckoutPage } = await import('../src/components/checkout-page')
hooks.deregister()

test('checkout is served by the authenticated application, never the static page proxy', () => {
  for (const prefix of ['', '/zh']) {
    assert.equal(isStudioDocument(`${prefix}/checkout`), true)
    assert.equal(isStudioDocument(`${prefix}/checkout/`), true)
    assert.equal(isStudioDocument(`${prefix}/checkout-other`), false)
  }
})

test('checkout initially renders only a handoff, without a pricing card or second purchase button', async () => {
  for (const path of ['/checkout', '/zh/checkout']) {
    const root = createRootRoute()
    const route = createRoute({ getParentRoute: () => root, path, component: CheckoutPage })
    const router = createRouter({ routeTree: root.addChildren([route]), history: createMemoryHistory({ initialEntries: [path] }) })
    await router.load()
    const html = renderToString(createElement(RouterProvider, { router }))
    assert.match(html, /role="status"/)
    assert.match(html, /Stripe/)
    assert.doesNotMatch(html, /billing-pack|credit-pricing-card|Buy credit pack|购买积分包|US\$4\.99|<button/)
  }
})
