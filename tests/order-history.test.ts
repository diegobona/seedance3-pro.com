import test from 'node:test'
import assert from 'node:assert/strict'
import { createD1TestDatabase } from './helpers/d1-test-db'
import { createStripePaymentStore } from '../src/db/stripe-payments'
import { billingHistory } from '../src/lib/stripe-payments'

test('order history paginates all orders with stable ties and never exposes another account', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    await db.prepare(`INSERT INTO user(id,name,email) VALUES('orders-owner','Owner','orders@example.test'),('orders-other','Other','other-orders@example.test')`).run()
    await db.batch(Array.from({length:55},(_,index)=>db.prepare(`INSERT INTO stripe_order(id,user_id,price_id,live_mode,created_at,status)
      VALUES(?,?,'price_pack',0,1000,?)`).bind(`order-${String(index).padStart(3,'0')}`,index===54?'orders-other':'orders-owner',index%2?'paid':'pending')))
    const store=createStripePaymentStore(db)
    const deps={environment:{},store,getSession:async()=>({user:{id:'orders-owner'}})}
    const firstResponse=await billingHistory(new Request('http://localhost/api/billing/history?userId=orders-other'),deps)
    assert.equal(firstResponse.status,200)
    const first=await firstResponse.json() as any
    assert.equal(first.orders.length,50)
    assert.equal(typeof first.nextCursor,'string')
    assert.equal(first.orders[0].id,'order-053')
    const secondResponse=await billingHistory(new Request('http://localhost/api/billing/history?cursor='+encodeURIComponent(first.nextCursor)),deps)
    const second=await secondResponse.json() as any
    assert.equal(second.orders.length,4)
    assert.equal(second.nextCursor,null)
    assert.equal(new Set([...first.orders,...second.orders].map(row=>row.id)).size,54)
    assert.ok(![...first.orders,...second.orders].some(row=>row.id==='order-054'))
    for(const cursor of ['bad','-1_order-001','99999999999999999_order-001','1000_']) {
      assert.equal((await billingHistory(new Request('http://localhost/api/billing/history?cursor='+encodeURIComponent(cursor)),deps)).status,400)
    }
    assert.equal((await billingHistory(new Request('http://localhost/api/billing/history'),{...deps,getSession:async()=>null})).status,401)
  } finally { await dispose() }
})
