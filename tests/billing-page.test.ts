import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { isStudioDocument } from '../src/lib/site-static-proxy'
import { CREDIT_PACKS, creditPackValue } from '../assets/credit-packs.mjs'
const hooks = registerHooks({
  load(url, context, next) {
    if (url.endsWith('.css')) return { format: 'module', shortCircuit: true, source: 'export default {}' }
    return next(url, context)
  },
})
const { BillingPage } = await import('../src/components/billing-page')
hooks.deregister()

test('billing pages show the same three video packs as pricing and preserve order history in both languages', async () => {
  for (const path of ['/billing', '/zh/billing']) {
    const root = createRootRoute()
    const route = createRoute({ getParentRoute: () => root, path, component: BillingPage })
    const router = createRouter({ routeTree: root.addChildren([route]), history: createMemoryHistory({ initialEntries: [path + '?checkout=success&session_id=unverified'] }) })
    await router.load()
    const html = renderToString(createElement(RouterProvider, { router }))
    const copy = html.replace(/<!--.*?-->/g, '')
    const cards=[...copy.matchAll(/<article class="credit-tier[^>]*>([\s\S]*?)<\/article>/g)]
    assert.equal(cards.length,3)
    for(const [index,pack] of CREDIT_PACKS.entries()) {
      const card=cards[index][0],value=creditPackValue(pack)
      assert.ok(card.includes(`data-pack-id="${pack.id}"`))
      assert.ok(card.includes(`${pack.videoCount} × ${path.startsWith('/zh')?'5 秒视频':'5s videos'}`))
      assert.ok(card.includes(`US$${value.unitPrice}`))
      assert.ok(card.includes(`5s · 10s · 15s`))
      assert.match(card,new RegExp(`<button[^>]*class="credit-tier-buy"[^>]*>${path.startsWith('/zh')?'购买':'Buy'} ${pack.credits} ${path.startsWith('/zh')?'积分':'credits'} · US\\$${value.price}</button>`))
    }
    assert.equal((copy.match(/class="credit-pack-terms-summary"/g)||[]).length,1)
    assert.doesNotMatch(copy,/images and videos|1 credit per image|images<|2 images|图片和视频|每张图片|2 张图片/)
    assert.match(copy,/id="orders"/)
    assert.doesNotMatch(html, /每天获得 5 积分|5 daily credits/)
    assert.match(html, path.startsWith('/zh') ? /体验额度用完后，请登录并购买积分包继续/ : /After the trial, log in and buy a credit pack to continue/)
    assert.doesNotMatch(html, /Payment verified|支付已核实/)
    assert.match(html, /href="mailto:zw83716@gmail\.com"/)
    const prefix = path.startsWith('/zh') ? '/zh' : ''
    for (const page of ['refund-policy', 'privacy', 'terms']) {
      assert.ok(html.includes(`href="${prefix}/${page}"`), `${path}: ${page}`)
    }
    assert.equal(isStudioDocument(path), true)
    assert.equal(isStudioDocument(path + '/'), true)
  }
})
