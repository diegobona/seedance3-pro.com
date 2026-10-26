import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { createElement, Fragment } from 'react'
import { renderToString } from 'react-dom/server'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { renderPurchaseAssurance, SUPPORT_EMAIL } from '../app/site-trust.mjs'

for (const locale of ['en', 'zh']) {
  test(`${locale} purchase contact opens an email popup instead of an email application`, () => {
    const html = renderPurchaseAssurance(locale)
    assert.doesNotMatch(html, /mailto:/)
    const target = html.match(/<button[^>]+popovertarget="([^"]+)"[^>]*>([^<]+)<\/button>/)
    assert.ok(target, 'contact must use a native popup trigger')
    assert.equal(target[2], locale === 'zh' ? '联系客服' : 'Contact support')
    assert.ok(html.includes(`id="${target[1]}"`))
    assert.match(html, /popover="auto"/)
    assert.match(html, /popovertargetaction="hide"/)
    assert.ok(html.includes(SUPPORT_EMAIL))
    assert.ok(html.includes(locale === 'zh' ? '/zh/refund-policy' : '/refund-policy'))
  })
}

test('multiple purchase panels have independent popup targets after server rendering', async () => {
  const hooks = registerHooks({ load(url, context, next) {
    if (url.endsWith('.css')) return { format: 'module', shortCircuit: true, source: 'export default {}' }
    return next(url, context)
  } })
  const { PurchaseAssurance } = await import('../src/components/site-trust')
  hooks.deregister()
  const root = createRootRoute()
  const route = createRoute({ getParentRoute: () => root, path: '/zh/test', component: () => createElement(Fragment, null, createElement(PurchaseAssurance), createElement(PurchaseAssurance)) })
  const router = createRouter({ routeTree: root.addChildren([route]), history: createMemoryHistory({ initialEntries: ['/zh/test'] }) })
  await router.load()
  const html = renderToString(createElement(RouterProvider, { router }))
  const targets = Array.from(html.matchAll(/class="support-email-trigger"[^>]+popovertarget="([^"]+)"/g), match => match[1])
  assert.equal(targets.length, 2)
  assert.equal(new Set(targets).size, 2)
  for (const target of targets) assert.equal(html.split(`id="${target}"`).length - 1, 1)
})
