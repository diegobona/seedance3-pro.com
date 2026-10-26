import assert from 'node:assert/strict'
import test from 'node:test'
import { readStripeConfig, verifyStripeSignature, billingCheckout, billingWebhook, billingHistory } from '../src/lib/stripe-payments'
import { createStripePaymentStore } from '../src/db/stripe-payments'
import { createD1TestDatabase } from './helpers/d1-test-db'

const environment = { STRIPE_SECRET_KEY: 'sk_test_example', STRIPE_WEBHOOK_SECRET: 'whsec_example', STRIPE_PRICE_ID: 'price_pack', STRIPE_MODE: 'test' }
const now = Math.floor(Date.now() / 1000)
async function signature(body: string, timestamp = now) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(environment.STRIPE_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`)))
  return `t=${timestamp},v1=${Buffer.from(bytes).toString('hex')}`
}
test('Stripe configuration fails closed for missing keys and mixed modes', () => {
  assert.throws(() => readStripeConfig({}), /configured/)
  assert.throws(() => readStripeConfig({ ...environment, STRIPE_MODE: 'live' }), /configured/)
  assert.equal(readStripeConfig(environment).live, false)
})
test('restricted Stripe keys are accepted only for their configured test or live mode', () => {
  assert.equal(readStripeConfig({ ...environment, STRIPE_SECRET_KEY: 'rk_test_example' }).live, false)
  assert.equal(readStripeConfig({ ...environment, STRIPE_SECRET_KEY: 'rk_live_example', STRIPE_MODE: 'live' }).live, true)
  assert.throws(() => readStripeConfig({ ...environment, STRIPE_SECRET_KEY: 'rk_live_example' }), /configured/)
  assert.throws(() => readStripeConfig({ ...environment, STRIPE_SECRET_KEY: 'rk_test_example', STRIPE_MODE: 'live' }), /configured/)
})
test('Stripe raw signature accepts rotated signatures and rejects altered and stale payloads', async () => {
  const body = '{"id":"evt_1"}'
  const signed = await signature(body)
  assert.equal(await verifyStripeSignature(body, `${signed},v1=${'0'.repeat(64)}`, environment.STRIPE_WEBHOOK_SECRET, now), true)
  assert.equal(await verifyStripeSignature(`${body} `, signed, environment.STRIPE_WEBHOOK_SECRET, now), false)
  assert.equal(await verifyStripeSignature(body, await signature(body, now - 301), environment.STRIPE_WEBHOOK_SECRET, now), false)
  assert.equal(await verifyStripeSignature(body, await signature(body, now + 301), environment.STRIPE_WEBHOOK_SECRET, now), false)
})
async function fixture() {
  const runtime = await createD1TestDatabase()
  await runtime.db.prepare(`INSERT INTO "user" (id,name,email,credit_balance,daily_free_credits,daily_credit_date)
    VALUES ('owner','Owner','owner@example.test',5,5,date('now','+8 hours')),('other','Other','other@example.test',5,5,date('now','+8 hours'))`).run()
  return { ...runtime, store: createStripePaymentStore(runtime.db) }
}
test('D1 purchase fulfillment credits exactly once under concurrent duplicate deliveries, without changing plan', async () => {
  const { db, store, dispose } = await fixture()
  try {
    await store.createOrder('order_1', 'owner', 'price_pack', false)
    await store.attachSession('order_1', 'cs_test_1')
    await Promise.all(Array.from({ length: 4 }, (_, i) => store.fulfill({ eventId: `evt_${i}`, orderId: 'order_1', sessionId: 'cs_test_1', paymentIntentId: 'pi_1' })))
    assert.deepEqual(await db.prepare('SELECT credit_balance,plan FROM "user" WHERE id=?').bind('owner').first(), { credit_balance: 505, plan: 'free' })
    assert.equal((await store.history('owner'))[0].status, 'paid')
    assert.equal((await store.history('other')).length, 0)
  } finally { await dispose() }
})
test('refund replay revokes the pack once, protects daily credits and holds a spent account', async () => {
  const { db, store, dispose } = await fixture()
  try {
    await store.createOrder('order_1', 'owner', 'price_pack', false)
    await store.attachSession('order_1', 'cs_test_1')
    await store.fulfill({ eventId: 'evt_paid', orderId: 'order_1', sessionId: 'cs_test_1', paymentIntentId: 'pi_1' })
    await db.prepare('UPDATE "user" SET credit_balance=110 WHERE id=?').bind('owner').run()
    await Promise.all([store.reverse('evt_refund', 'pi_1', 'refund'), store.reverse('evt_dispute', 'pi_1', 'dispute')])
    assert.deepEqual(await db.prepare('SELECT credit_balance,daily_free_credits,billing_hold FROM "user" WHERE id=?').bind('owner').first(), { credit_balance: 5, daily_free_credits: 5, billing_hold: 1 })
    assert.equal((await store.history('owner'))[0].revokedCredits, 500)
    await store.fulfill({ eventId: 'evt_replay', orderId: 'order_1', sessionId: 'cs_test_1', paymentIntentId: 'pi_1' })
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'), 5)
  } finally { await dispose() }
})
test('out-of-order refund before payment fulfillment prevents any grant', async () => {
  const { db, store, dispose } = await fixture()
  try {
    await store.createOrder('order_1', 'owner', 'price_pack', false)
    await store.attachSession('order_1', 'cs_test_1')
    await store.reverse('evt_early', 'pi_1', 'refund')
    await store.fulfill({ eventId: 'evt_paid', orderId: 'order_1', sessionId: 'cs_test_1', paymentIntentId: 'pi_1' })
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'), 5)
    assert.equal((await store.history('owner'))[0].status, 'reversed')
    assert.equal(await store.isHeld('owner'), true)
  } finally { await dispose() }
})
const session = () => ({
  id: 'cs_test_1', livemode: false, mode: 'payment', status: 'complete', payment_status: 'paid', amount_total: 499, amount_subtotal: 499, currency: 'usd',
  client_reference_id: 'owner', metadata: { order_id: 'order_1', user_id: 'owner' },
  line_items: { has_more: false, data: [{ quantity: 1, price: { id: 'price_pack', unit_amount: 499, currency: 'usd', livemode: false, recurring: null } }] },
  payment_intent: { id: 'pi_1', status: 'succeeded', amount: 499, amount_received: 499, currency: 'usd', livemode: false,
    metadata: { order_id: 'order_1', user_id: 'owner' }, latest_charge: { id: 'ch_1', amount_refunded: 0, disputed: false } },
})
test('checkout rejects unauthenticated and cross-origin requests before contacting Stripe', async () => {
  const { store, dispose } = await fixture()
  try {
    const base = { environment, store, fetcher: async () => { throw new Error('must not call Stripe') }, getSession: async () => null }
    assert.equal((await billingCheckout(new Request('http://localhost:4310/api/billing/checkout', { method: 'POST', headers: { origin: 'http://localhost:4310' } }), base)).status, 401)
    assert.equal((await billingCheckout(new Request('http://localhost:4310/api/billing/checkout', { method: 'POST', headers: { origin: 'https://evil.test' } }), { ...base, getSession: async () => ({ user: { id: 'owner' } }) })).status, 403)
  } finally { await dispose() }
})
test('checkout pins amount, quantity, price and owner on server and owner history never leaks', async () => {
  const { store, dispose } = await fixture()
  try {
    const fetcher: typeof fetch = async (input, init) => {
      if (String(input).includes('/prices/')) return Response.json({ id: 'price_pack', active: true, livemode: false, currency: 'usd', unit_amount: 499, recurring: null })
      const form = new URLSearchParams(String(init?.body))
      assert.equal(form.get('line_items[0][price]'), 'price_pack')
      assert.equal(form.get('line_items[0][quantity]'), '1')
      assert.equal(form.get('client_reference_id'), 'owner')
      assert.equal(form.get('mode'), 'payment')
      return Response.json({ id: 'cs_test_checkout', url: 'https://checkout.stripe.com/c/pay/example', livemode: false })
    }
    const deps = { environment, store, fetcher, getSession: async () => ({ user: { id: 'owner' } }) }
    const response = await billingCheckout(new Request('http://localhost:4310/api/billing/checkout', { method: 'POST', headers: { origin: 'http://localhost:4310' }, body: JSON.stringify({ userId: 'other', credits: 999999, price: 'free' }) }), deps)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { url: 'https://checkout.stripe.com/c/pay/example' })
    const history = await billingHistory(new Request('http://localhost:4310/api/billing/history?userId=owner'), { ...deps, getSession: async () => ({ user: { id: 'other' } }) })
    assert.deepEqual((await history.json() as any).orders, [])
  } finally { await dispose() }
})
async function checkoutReturnUrls(body: unknown, store: ReturnType<typeof createStripePaymentStore>) {
  let form: URLSearchParams | undefined
  const fetcher: typeof fetch = async (input, init) => {
    if (String(input).includes('/prices/')) return Response.json({ id: 'price_pack', active: true, livemode: false, currency: 'usd', unit_amount: 499, recurring: null })
    form = new URLSearchParams(String(init?.body))
    return Response.json({ id: `cs_test_${crypto.randomUUID()}`, url: 'https://checkout.stripe.com/c/pay/example', livemode: false })
  }
  const response = await billingCheckout(new Request('http://localhost:4310/api/billing/checkout', {
    method: 'POST', headers: { origin: 'http://localhost:4310' }, body: JSON.stringify(body),
  }), { environment, store, fetcher, getSession: async () => ({ user: { id: 'owner' } }) })
  assert.equal(response.status, 200)
  assert.ok(form)
  return { success: form.get('success_url'), cancel: form.get('cancel_url') }
}

test('checkout returns to either exact language homepage supplied by returnTo', async () => {
  const { store, dispose } = await fixture()
  try {
    for (const [returnTo, locale] of [['/', 'zh'], ['/zh/', 'en']]) {
      assert.deepEqual(await checkoutReturnUrls({ returnTo, locale }, store), {
        success: `http://localhost:4310${returnTo}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel: `http://localhost:4310${returnTo}?checkout=cancelled`,
      })
    }
  } finally { await dispose() }
})

test('checkout preserves billing return URLs when no homepage target is supplied', async () => {
  const { store, dispose } = await fixture()
  try {
    for (const [locale, path] of [[undefined, '/billing'], ['en', '/billing'], ['zh', '/zh/billing']]) {
      assert.deepEqual(await checkoutReturnUrls({ locale }, store), {
        success: `http://localhost:4310${path}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel: `http://localhost:4310${path}?checkout=cancelled`,
      })
    }
  } finally { await dispose() }
})

test('checkout ignores arbitrary, encoded, and malformed return targets and keeps locale billing return URLs', async () => {
  const { store, dispose } = await fixture()
  try {
    const invalidTargets = [
      'https://evil.test/', '//evil.test/', '/\\evil.test/', '/zh', '/billing', '/zh/billing',
      '/?next=https://evil.test', '/zh/?next=https://evil.test', '/#checkout', '/zh/#checkout',
      '/zh/../', '/%2f%2fevil.test/', '%2F', ' /', '/zh/ ', '', null, 42, ['/', '/zh/'], { path: '/' },
    ]
    for (const returnTo of invalidTargets) {
      assert.deepEqual(await checkoutReturnUrls({ returnTo, locale: 'zh' }, store), {
        success: 'http://localhost:4310/zh/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}',
        cancel: 'http://localhost:4310/zh/billing?checkout=cancelled',
      }, JSON.stringify(returnTo))
    }
  } finally { await dispose() }
})

test('returned checkout session can only be confirmed from its owner history and history cannot grant credits', async () => {
  const { db, store, dispose } = await fixture()
  try {
    await store.createOrder('owner_pending', 'owner', 'price_pack', false)
    await store.attachSession('owner_pending', 'cs_owner_pending')
    await store.createOrder('other_paid', 'other', 'price_pack', false)
    await store.attachSession('other_paid', 'cs_other_paid')
    await store.fulfill({ eventId: 'evt_other_paid', orderId: 'other_paid', sessionId: 'cs_other_paid', paymentIntentId: 'pi_other_paid' })
    const request = () => new Request('http://localhost:4310/api/billing/history?checkout=success&session_id=cs_other_paid&userId=other')
    const deps = { environment, store, fetcher: async () => { throw new Error('history must not call Stripe') } }
    const ownerHistory = await billingHistory(request(), { ...deps, getSession: async () => ({ user: { id: 'owner' } }) })
    const ownerOrders = (await ownerHistory.json() as any).orders
    assert.deepEqual(ownerOrders.map((order: any) => [order.sessionId, order.status]), [['cs_owner_pending', 'pending']])
    const otherHistory = await billingHistory(request(), { ...deps, getSession: async () => ({ user: { id: 'other' } }) })
    assert.deepEqual((await otherHistory.json() as any).orders.map((order: any) => [order.sessionId, order.status]), [['cs_other_paid', 'paid']])
    assert.equal((await billingHistory(request(), { ...deps, getSession: async () => null })).status, 401)
    assert.equal((await store.order('owner_pending'))?.status, 'pending')
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'), 5)
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('other').first('credit_balance'), 505)
  } finally { await dispose() }
})

test('signed webhook retrieves payment, rejects wrong owner/price/amount/mode, and fulfills only validated payment', async () => {
  const { db, store, dispose } = await fixture()
  try {
    await store.createOrder('order_1', 'owner', 'price_pack', false)
    await store.attachSession('order_1', 'cs_test_1')
    const body = JSON.stringify({ id: 'evt_paid', type: 'checkout.session.completed', livemode: false, data: { object: { id: 'cs_test_1' } } })
    const request = async () => new Request('http://localhost:4310/api/billing/webhook', { method: 'POST', headers: { 'stripe-signature': await signature(body) }, body })
    for (const mutate of [(s: any) => s.amount_total = 1, (s: any) => s.metadata.user_id = 'other', (s: any) => s.line_items.data[0].price.id = 'price_bad', (s: any) => s.livemode = true]) {
      const bad = session(); mutate(bad)
      assert.equal((await billingWebhook(await request(), { environment, store, fetcher: async () => Response.json(bad) })).status, 400)
    }
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'), 5)
    assert.equal((await billingWebhook(await request(), { environment, store, fetcher: async () => Response.json(session()) })).status, 200)
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'), 505)
  } finally { await dispose() }
})
test('webhook rejects oversized raw bodies and wrong signatures', async () => {
  const { store, dispose } = await fixture()
  try {
    const deps = { environment, store }
    assert.equal((await billingWebhook(new Request('http://localhost:4310', { method: 'POST', body: 'x'.repeat(262145) }), deps)).status, 413)
    assert.equal((await billingWebhook(new Request('http://localhost:4310', { method: 'POST', body: '{}' }), deps)).status, 400)
  } finally { await dispose() }
})
test('synthetic guest sessions cannot access billing even when a guest identity exists', async () => {
  const { db, store, dispose } = await fixture()
  try {
    await db.prepare(`INSERT INTO "user" (id,name,email,plan) VALUES ('guest-image-example','Guest','guest@example.invalid','guest')`).run()
    const deps = { environment, store, getSession: async () => ({ user: { id: 'guest-image-example' } }) }
    const history = await billingHistory(new Request('http://localhost:4310/api/billing/history'), deps)
    assert.equal(history.status, 401)
    await assert.rejects(store.createOrder('guest-order', 'guest-image-example', 'price_pack', false))
  } finally { await dispose() }
})
test('a failed credit update rolls back order status and event receipt together', async () => {
  const { db, store, dispose } = await fixture()
  try {
    await store.createOrder('order_1', 'owner', 'price_pack', false)
    await db.prepare(`CREATE TRIGGER simulated_credit_failure BEFORE UPDATE OF credit_balance ON "user"
      WHEN NEW.credit_balance > 100 BEGIN SELECT RAISE(ABORT, 'simulated storage error'); END`).run()
    await assert.rejects(store.fulfill({ eventId: 'evt_paid', orderId: 'order_1', sessionId: 'cs_test_1', paymentIntentId: 'pi_1' }))
    assert.equal((await store.order('order_1'))?.status, 'pending')
    assert.equal(await db.prepare('SELECT count(*) FROM stripe_event').first('count(*)'), 0)
    await db.prepare('DROP TRIGGER simulated_credit_failure').run()
    await store.fulfill({ eventId: 'evt_paid', orderId: 'order_1', sessionId: 'cs_test_1', paymentIntentId: 'pi_1' })
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'), 505)
  } finally { await dispose() }
})
test('signed refund and dispute events freeze once, including refunds arriving before success', async () => {
  const { db, store, dispose } = await fixture()
  try {
    await store.createOrder('order_1', 'owner', 'price_pack', false)
    for (const [id, type] of [['evt_refund', 'refund.created'], ['evt_dispute', 'charge.dispute.created']]) {
      const body = JSON.stringify({ id, type, livemode: false, data: { object: { id: 're_1', payment_intent: 'pi_1', status: 'pending' } } })
      const request = new Request('http://localhost:4310/api/billing/webhook', { method: 'POST', body, headers: { 'stripe-signature': await signature(body) } })
      assert.equal((await billingWebhook(request, { environment, store })).status, 200)
    }
    await store.fulfill({ eventId: 'evt_paid', orderId: 'order_1', sessionId: 'cs_test_1', paymentIntentId: 'pi_1' })
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'), 5)
    const response = await billingCheckout(new Request('http://localhost:4310/api/billing/checkout', { method: 'POST', headers: { origin: 'http://localhost:4310' } }), {
      environment, store, getSession: async () => ({ user: { id: 'owner' } }),
    })
    assert.equal(response.status, 403)
    assert.equal((await response.json() as any).code, 'BILLING_HOLD')
  } finally { await dispose() }
})
test('already-refunded current Stripe payment never grants credits even without a refund webhook', async () => {
  const { db, store, dispose } = await fixture()
  try {
    await store.createOrder('order_1', 'owner', 'price_pack', false)
    const body = JSON.stringify({ id: 'evt_paid', type: 'checkout.session.completed', livemode: false, data: { object: { id: 'cs_test_1' } } })
    const current = session()
    current.payment_intent.latest_charge.amount_refunded = 499
    const response = await billingWebhook(new Request('http://localhost:4310/api/billing/webhook', {
      method: 'POST', body, headers: { 'stripe-signature': await signature(body) },
    }), { environment, store, fetcher: async () => Response.json(current) })
    assert.equal(response.status, 200)
    assert.equal((await store.order('order_1'))?.status, 'reversed')
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'), 5)
  } finally { await dispose() }
})
test('public production cannot sell or grant real credits using Stripe test mode', async () => {
  const { store, dispose } = await fixture()
  try {
    const deps = { environment, store, getSession: async () => ({ user: { id: 'owner' } }) }
    const checkout = await billingCheckout(new Request('https://seedance3-pro.com/api/billing/checkout', {
      method: 'POST', headers: { origin: 'https://seedance3-pro.com' },
    }), deps)
    assert.equal(checkout.status, 503)
    const history = await billingHistory(new Request('https://seedance3-pro.com/api/billing/history'), deps)
    assert.equal((await history.json() as any).checkoutEnabled, false)
    const webhook = await billingWebhook(new Request('https://seedance3-pro.com/api/billing/webhook', {
      method: 'POST', body: '{}',
    }), deps)
    assert.equal(webhook.status, 503)
  } finally { await dispose() }
})
