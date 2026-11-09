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

test('checkout renders a direct purchase button in every card without a selection step', async () => {
 for(const prefix of ['', '/zh'])for(const query of ['','?pack=unknown','?pack=starter','?pack=studio&purchase=1']) {
 const path=prefix+'/checkout',root=createRootRoute();
 const route=createRoute({getParentRoute:()=>root,path,component:CheckoutPage});
 const router=createRouter({routeTree:root.addChildren([route]),history:createMemoryHistory({initialEntries:[path+query]})});await router.load();
 const html=renderToString(createElement(RouterProvider,{router}));
 const cards=[...html.matchAll(/<article class="credit-tier[^>]*>([\s\S]*?)<\/article>/g)];
 assert.equal(cards.length,3);
 for(const [index,[id,credits,price]] of [['starter',700,'9.99'],['creator',1600,'19.99'],['studio',4500,'49.99']].entries()) {
  assert.match(cards[index][0],new RegExp(`data-pack-id="${id}"`));
  assert.match(cards[index][1],new RegExp(`<button[^>]*class="credit-tier-buy"[^>]*>${prefix?'购买':'Buy'} ${credits} ${prefix?'积分':'credits'} · US\\$${price}</button>`));
 }
 assert.equal((html.match(/class="credit-tier-buy"/g)||[]).length,3);
 assert.doesNotMatch(html,/type="radio"|name="credit-pack"|checked=""|checkout-purchase|<fieldset/);
 assert.equal((html.match(/class="credit-pack-terms-summary"/g)||[]).length,1);
 assert.doesNotMatch(cards[0][1],/credit-tier-savings/);
 assert.match(cards[1][1],prefix?/每积分比 Starter 约省 13%/:/Save ≈13% per credit vs\. Starter/);
 assert.match(cards[2][1],prefix?/每积分比 Starter 约省 23%/:/Save ≈23% per credit vs\. Starter/);
 assert.doesNotMatch(html,/bonus credits included|含额外赠送/);
 assert.doesNotMatch(html,/Approx\.|US\$0\.01(?!\d)|<h1>Starter/);
 }
});
