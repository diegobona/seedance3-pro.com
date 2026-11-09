import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFile } from 'node:fs/promises'
import { OrderHistory, type PurchaseOrder } from '../src/components/order-history'

const orders: PurchaseOrder[]=['paid','pending','reversed'].map((status,index)=>({
  id:`example-order-${index}`,sessionId:null,createdAt:'2026-10-31T04:43:00.000Z',
  status:status as PurchaseOrder['status'],amount:499,currency:'usd',credits:500,revokedCredits:status==='reversed'?500:0,
}))
const props={locale:'en',signedIn:true,orders,error:'',hasMore:true,loadingMore:false,onRefresh(){},onLoadMore(){},onLogin(){}}
test('orders show identifiers, amounts, credits and distinct paid, incomplete and refunded states in both languages',()=>{
  for(const locale of ['en','zh']){
    const html=renderToStaticMarkup(createElement(OrderHistory,{...props,locale}))
    for(const order of orders)assert.ok(html.includes(order.id))
    assert.match(html,/4\.99/);assert.match(html,/500/);assert.match(html,/datetime="2026-10-31T04:43:00.000Z"/i)
    assert.match(html,locale==='zh'?/尚未到账/:/Not added yet/)
    assert.match(html,locale==='zh'?/已扣回 500 积分/:/500 credits revoked/)
    assert.match(html,locale==='zh'?/加载更多订单/:/Load more orders/)
  }
})
test('signed-out order view hides supplied records and offers login; errors remain retryable',()=>{
  const guest=renderToStaticMarkup(createElement(OrderHistory,{...props,signedIn:false}))
  assert.doesNotMatch(guest,/example-order/);assert.match(guest,/>Log in</)
  const failed=renderToStaticMarkup(createElement(OrderHistory,{...props,orders:null,error:'Unable to load',hasMore:false}))
  assert.match(failed,/role="alert"/);assert.match(failed,/>Refresh</);assert.doesNotMatch(failed,/Loading your orders/)
})
test('public and workspace account menus expose order history separately from direct purchase',async()=>{
  const [account,menu,page]=await Promise.all(['assets/site-account.mjs','src/components/user-menu.tsx','src/components/billing-page.tsx'].map(path=>readFile(path,'utf8')))
  assert.match(account,/Order history/);assert.match(account,/path\('\/billing'\)\+'#orders'/)
  assert.match(menu,/\/billing#orders/);assert.match(menu,/openCreditPurchase/)
  assert.ok(page.indexOf('<OrderHistory')<page.indexOf('<BillingCreditPacks'))
  assert.match(page,/requestVersion\.current/);assert.match(page,/historyState\?\.userId === session\?\.user\.id/)
})
