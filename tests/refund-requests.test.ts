import test from 'node:test'
import assert from 'node:assert/strict'
import { createD1TestDatabase } from './helpers/d1-test-db'
import { createRefundRequestStore } from '../src/db/refund-requests'
import { submitRefundRequest, reviewRefundRequest, listRefundRequests } from '../src/lib/refund-requests'
import { deliverRefundNotifications, refundNotification, sendRefundEmail } from '../src/lib/refund-notifications'
import { createStripePaymentStore } from '../src/db/stripe-payments'
import { billingHistory, billingWebhook, syncStripeRefundStatus } from '../src/lib/stripe-payments'

const origin='https://seedance3-pro.com'
const post=(body:unknown, headers:Record<string,string>={})=>new Request(origin+'/api/billing/refund-requests',{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify(body)})
test('Resend notifications are restricted to the owner Gmail, deduplicated and retryable on provider rejection',async()=>{
  const env={RESEND_API_KEY:'re_local_test_only',REFUND_EMAIL_FROM:'refunds@notify.seedance3-pro.com'}
  const message={from:'ignored@example.test',to:'other@example.test',subject:'Refund request',text:'A request',html:'<p>A request</p>'}
  const calls:{url:string;init:RequestInit|undefined}[]=[]
  const fetcher:typeof fetch=async(url,init)=>{calls.push({url:String(url),init});return Response.json({id:'email-id'})}
  assert.equal(await sendRefundEmail(env,message,'request-1',fetcher),'email-id')
  await sendRefundEmail(env,message,'request-1',fetcher)
  for(const call of calls){
    assert.equal(call.url,'https://api.resend.com/emails');assert.equal(call.init?.method,'POST')
    assert.equal(new Headers(call.init?.headers).get('idempotency-key'),'refund-request-request-1')
    const payload=JSON.parse(String(call.init?.body))
    assert.deepEqual(payload.to,['zw83716@gmail.com']);assert.equal(payload.from,env.REFUND_EMAIL_FROM)
    assert.equal(payload.cc,undefined);assert.equal(payload.bcc,undefined)
  }
  await assert.rejects(sendRefundEmail({},message,'request-1',fetcher),/not configured/)
  assert.equal(calls.length,2)
  await assert.rejects(sendRefundEmail(env,message,'request-1',async()=>new Response('',{status:429})),/429/)
  await assert.rejects(sendRefundEmail(env,message,'request-1',async()=>Response.json({})),/did not accept/)
})
test('refund requests enforce ownership and administrator review, deduplicate, and never change credits or payment state',async()=>{
  const {db,dispose}=await createD1TestDatabase()
  try {
    await db.prepare(`INSERT INTO user(id,name,email) VALUES('rr-owner','Owner','owner@example.test'),('rr-other','Other','other@example.test'),('rr-admin','Admin','admin@example.test')`).run()
    await db.prepare(`INSERT INTO stripe_order(id,user_id,price_id,live_mode,status,payment_intent_id) VALUES('rr-order','rr-owner','price_pack',0,'paid','pi_rr'),('rr-unpaid','rr-owner','price_pack',0,'pending',NULL)`).run()
    const store=createRefundRequestStore(db)
    const deps={store,environment:{REFUND_ADMIN_USER_IDS:'rr-admin'},getSession:async()=>({user:{id:'rr-owner'}})}
    const input={orderId:'rr-order',reason:'This pack was bought by mistake.',locale:'en'}
    assert.equal((await submitRefundRequest(post(input),{...deps,getSession:async()=>null})).status,401)
    assert.equal((await submitRefundRequest(post(input,{origin:'https://evil.test'}),deps)).status,403)
    assert.equal((await submitRefundRequest(post(input),{...deps,getSession:async()=>({user:{id:'rr-other'}})})).status,404)
    assert.equal((await submitRefundRequest(post({...input,orderId:'rr-unpaid'}),deps)).status,409)
    assert.equal((await submitRefundRequest(post({...input,reason:'x'.repeat(2001)}),deps)).status,400)
    const responses=await Promise.all([submitRefundRequest(post(input),deps),submitRefundRequest(post(input),deps)])
    assert.ok(responses.every(r=>r.ok))
    const records=await Promise.all(responses.map(r=>r.json())) as any[]
    assert.equal(records[0].request.id,records[1].request.id)
    assert.equal(records[0].request.status,'pending')
    const id=records[0].request.id
    assert.equal((await listRefundRequests(new Request(origin+'/api/admin/refund-requests'),deps)).status,403)
    assert.equal((await reviewRefundRequest(post({id,status:'approved',version:0}),deps)).status,403)
    const admin={...deps,getSession:async()=>({user:{id:'rr-admin'}})}
    assert.equal((await reviewRefundRequest(post({id,status:'rejected',version:0,note:''}),admin)).status,400)
    assert.equal((await reviewRefundRequest(post({id,status:'approved',version:0,note:'We will process this in Stripe.'}),admin)).status,200)
    assert.equal((await reviewRefundRequest(post({id,status:'rejected',version:0,note:'A stale decision'}),admin)).status,409)
    const row=await store.forOrder('rr-order','rr-owner')
    assert.equal(row?.status,'approved');assert.equal(row?.version,1)
    assert.equal(await store.forOrder('rr-order','rr-other'),null)
    const payment=await db.prepare('SELECT status FROM stripe_order WHERE id=?').bind('rr-order').first<{status:string}>()
    const owner=await db.prepare('SELECT billing_hold,credit_balance FROM user WHERE id=?').bind('rr-owner').first<{billing_hold:number,credit_balance:number}>()
    assert.equal(payment?.status,'paid');assert.equal(owner?.billing_hold,0)
    assert.equal(owner?.credit_balance,0)
  }finally{await dispose()}
})

test('refund payment status uses canonical Stripe reads, updates order history and never creates a payment refund',async()=>{
  const {db,dispose}=await createD1TestDatabase()
  try {
    await db.prepare(`INSERT INTO user(id,name,email) VALUES('sync-owner','Owner','sync@example.test')`).run()
    const store=createStripePaymentStore(db),refundStore=createRefundRequestStore(db)
    await store.createOrder('sync-order','sync-owner','price_pack',false)
    await store.fulfill({eventId:'evt_sync_paid',orderId:'sync-order',sessionId:'cs_test_sync',paymentIntentId:'pi_sync'})
    await refundStore.submit('sync-owner','sync-order','Bought this pack by mistake.','en')
    const environment={STRIPE_SECRET_KEY:'sk_test_example',STRIPE_WEBHOOK_SECRET:'whsec_example',STRIPE_PRICE_ID:'price_pack',STRIPE_MODE:'test'}
    let data=[{id:'re_sync',payment_intent:'pi_sync',amount:1999,currency:'usd',status:'pending'}]
    let calls=0
    const fetcher:typeof fetch=async(input,init)=>{
      calls++;assert.equal(init?.method,'GET')
      assert.match(String(input),/^https:\/\/api.stripe.com\/v1\/refunds\?payment_intent=pi_sync&limit=100$/)
      return Response.json({data,has_more:false})
    }
    const deps={environment,store,refundStore,fetcher,getSession:async()=>({user:{id:'sync-owner'}})}
    const request=new Request('http://localhost/api/admin/refund-requests/sync')
    await syncStripeRefundStatus(request,deps,'pi_sync')
    assert.equal((await refundStore.forOrder('sync-order','sync-owner'))?.paymentStatus,'pending')
    data[0].status='failed'
    await syncStripeRefundStatus(request,deps,'pi_sync')
    assert.equal((await refundStore.forOrder('sync-order','sync-owner'))?.paymentStatus,'failed')
    data[0].status='canceled'
    await syncStripeRefundStatus(request,deps,'pi_sync')
    assert.equal((await refundStore.forOrder('sync-order','sync-owner'))?.paymentStatus,'canceled')
    data=[{...data[0],status:'succeeded',amount:200}]
    await syncStripeRefundStatus(request,deps,'pi_sync')
    assert.equal((await refundStore.forOrder('sync-order','sync-owner'))?.paymentStatus,'partial')
    data.push({...data[0],id:'re_sync_final',amount:1799})
    // An old pending event must use the current successful Stripe status.
    const body=JSON.stringify({id:'evt_sync_old',livemode:false,type:'refund.updated',data:{object:{id:'re_sync',payment_intent:'pi_sync',status:'pending'}}})
    const timestamp=Math.floor(Date.now()/1000)
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(environment.STRIPE_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign'])
    const signed=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${timestamp}.${body}`))).toString('hex')
    const response=await billingWebhook(new Request('http://localhost/api/billing/webhook',{method:'POST',headers:{'stripe-signature':`t=${timestamp},v1=${signed}`},body}),deps)
    assert.equal(response.status,200)
    const history=await (await billingHistory(new Request('http://localhost/api/billing/history'),deps)).json() as any
    assert.equal(history.orders[0].refundRequest.paymentStatus,'succeeded')
    assert.equal(history.orders[0].refundRequest.refundedAmount,1999)
    assert.equal(history.canReviewRefunds,false)
    assert.equal(await store.isHeld('sync-owner'),false)
    data=[{...data[0],payment_intent:'pi_someone_else'}]
    await assert.rejects(syncStripeRefundStatus(request,deps,'pi_sync'))
    assert.equal((await refundStore.forOrder('sync-order','sync-owner'))?.refundedAmount,1999)
    assert.equal(calls,6)
  } finally {await dispose()}
})

test('notification retry keeps the request durable, claims once and escapes user-supplied email content',async()=>{
  const {db,dispose}=await createD1TestDatabase()
  try{
    await db.prepare(`INSERT INTO user(id,name,email) VALUES('mail-owner','Owner','mail@example.test')`).run()
    await db.prepare(`INSERT INTO stripe_order(id,user_id,price_id,live_mode,status) VALUES('mail-order','mail-owner','price_pack',0,'paid')`).run()
    const store=createRefundRequestStore(db)
    const row=await store.submit('mail-owner','mail-order','<img src=x onerror=alert(1)>','zh')
    assert.ok(row)
    let attempts=0;let fail=true
    const sender=async()=>{attempts++;if(fail)throw Error('provider unavailable')}
    await deliverRefundNotifications(store,sender,1000)
    assert.equal(attempts,1)
    assert.equal((await store.forOrder('mail-order','mail-owner'))?.status,'pending')
    fail=false
    await Promise.all([deliverRefundNotifications(store,sender,400000),deliverRefundNotifications(store,sender,400000)])
    assert.equal(attempts,2)
    await deliverRefundNotifications(store,sender,800000);assert.equal(attempts,2)
    const notification=refundNotification((await store.adminPage(null)).requests[0])
    assert.equal(notification.to,'zw83716@gmail.com')
    assert.ok(notification.html.includes('&lt;img'))
    assert.ok(!notification.html.includes('<img'))
    assert.ok(notification.text.includes('/refund-review'))
  }finally{await dispose()}
})
