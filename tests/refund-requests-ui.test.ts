import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { OrderHistory, type PurchaseOrder } from '../src/components/order-history'
import { RefundStatus, RefundRequestDialog, refundStatusLabel } from '../src/components/refund-request-ui'
import type { RefundRequestView } from '../src/db/refund-requests'

const request:RefundRequestView={id:'request-1',reason:'Accidental purchase.',status:'pending',note:'',version:0,createdAt:'2026-10-31T08:00:00Z',updatedAt:'2026-10-31T08:00:00Z',paymentStatus:'none',refundedAmount:0,pendingAmount:0}
const order:PurchaseOrder={id:'order-1',createdAt:request.createdAt,status:'paid',sessionId:null,amount:499,currency:'usd',credits:500,revokedCredits:0}
test('only eligible paid orders offer refund requests and submitted orders show review status instead',()=>{
  for(const locale of ['zh','en']) {
    const props={locale,signedIn:true,error:'',hasMore:false,loadingMore:false,onRefresh(){},onLoadMore(){},onLogin(){},onRequestRefund(){}}
    const markup=renderToStaticMarkup(createElement(OrderHistory,{...props,orders:[order,{...order,id:'order-2',status:'pending'},{...order,id:'order-3',status:'reversed'}]}))
    assert.equal(markup.match(/class="refund-request-button"/g)?.length,1)
    const submitted=renderToStaticMarkup(createElement(OrderHistory,{...props,orders:[{...order,refundRequest:request}]}))
    assert.doesNotMatch(submitted,/class="refund-request-button"/)
    assert.match(submitted,locale==='zh'?/审核中/:/Under review/)
    const approved=renderToStaticMarkup(createElement(RefundStatus,{locale,request:{...request,status:'approved'}}))
    assert.match(approved,locale==='zh'?/已批准 · 待退款/:/Approved · awaiting refund/)
    assert.doesNotMatch(approved,/Refund issued|已退款/)
    const processing=renderToStaticMarkup(createElement(OrderHistory,{...props,orders:[{...order,status:'reversed',refundRequest:{...request,paymentStatus:'pending'}}]}))
    assert.match(processing,locale==='zh'?/退款处理中/:/Refund processing/)
    assert.doesNotMatch(processing,/Refunded \/ reversed|已退款 \/ 撤销/)
    assert.equal(refundStatusLabel({...request,paymentStatus:'succeeded'},locale==='zh'),locale==='zh'?'已退款':'Refund issued')
  }
})
test('request dialog includes the order, explanation and a reason, with no card input or automatic-refund promise',()=>{
  for(const locale of ['en','zh']){
    const html=renderToStaticMarkup(createElement(RefundRequestDialog,{orderId:order.id,amount:499,currency:'usd',locale,onClose(){},async onSubmit(){}}))
    assert.match(html,/order-1/);assert.match(html,/4\.99/)
    assert.match(html,/<textarea[^>]*required/);assert.match(html,/maxlength="2000"/i)
    assert.match(html,locale==='zh'?/人工审核/:/review your request/)
    assert.doesNotMatch(html,/<input/)
  }
})
