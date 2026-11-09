import assert from 'node:assert/strict'
import test from 'node:test'
import { readStripeConfig, verifyStripeSignature, billingCheckout, billingWebhook, billingHistory } from '../src/lib/stripe-payments'
import { createStripePaymentStore } from '../src/db/stripe-payments'
import { createD1TestDatabase } from './helpers/d1-test-db'

const environment = { STRIPE_SECRET_KEY: 'sk_test_example', STRIPE_WEBHOOK_SECRET: 'whsec_example', STRIPE_PRICE_ID: 'price_pack', STRIPE_MODE: 'test' }
const now = Math.floor(Date.now() / 1000)
async function signature(body: string, timestamp = Math.floor(Date.now() / 1000)) {
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
test('inline checkout does not require a retired configured Stripe price', () => {
  assert.equal(readStripeConfig({ ...environment, STRIPE_PRICE_ID: undefined }).live, false)
  assert.equal(readStripeConfig({ ...environment, STRIPE_PRICE_ID: 'retired-price' }).live, false)
})
test('Stripe raw signature accepts rotated signatures and rejects altered and stale payloads', async () => {
  const body = '{"id":"evt_1"}'
  const signed = await signature(body, now)
  assert.equal(await verifyStripeSignature(body, `${signed},v1=${'0'.repeat(64)}`, environment.STRIPE_WEBHOOK_SECRET, now), true)
  assert.equal(await verifyStripeSignature(`${body} `, signed, environment.STRIPE_WEBHOOK_SECRET, now), false)
  assert.equal(await verifyStripeSignature(body, await signature(body, now - 301), environment.STRIPE_WEBHOOK_SECRET, now), false)
  assert.equal(await verifyStripeSignature(body, await signature(body, now + 301), environment.STRIPE_WEBHOOK_SECRET, now), false)
})
async function fixture() {
  const runtime = await createD1TestDatabase()
  await runtime.db.prepare(`INSERT INTO "user" (id,name,email,credit_balance,daily_free_credits,daily_credit_date)
    VALUES ('owner','Owner','owner@example.test',5,0,date('now','+8 hours')),('other','Other','other@example.test',5,0,date('now','+8 hours'))`).run()
  return { ...runtime, store: createStripePaymentStore(runtime.db) }
}
test('D1 purchase fulfillment credits exactly once under concurrent duplicate deliveries, without changing plan', async () => {
  const { db, store, dispose } = await fixture()
  try {
    await store.createOrder('order_1', 'owner', 'price_pack', false)
    await store.attachSession('order_1', 'cs_test_1')
    await Promise.all(Array.from({ length: 4 }, (_, i) => store.fulfill({ eventId: `evt_${i}`, orderId: 'order_1', sessionId: 'cs_test_1', paymentIntentId: 'pi_1' })))
    assert.deepEqual(await db.prepare('SELECT credit_balance,plan FROM "user" WHERE id=?').bind('owner').first(), { credit_balance: 1605, plan: 'free' })
    assert.equal((await store.history('owner'))[0].status, 'paid')
    assert.equal((await store.history('other')).length, 0)
  } finally { await dispose() }
})
test('refund then dispute revokes the pack once, protects daily credits and holds a spent account', async () => {
  const { db, store, dispose } = await fixture()
  try {
    await store.createOrder('order_1', 'owner', 'price_pack', false)
    await store.attachSession('order_1', 'cs_test_1')
    await store.fulfill({ eventId: 'evt_paid', orderId: 'order_1', sessionId: 'cs_test_1', paymentIntentId: 'pi_1' })
    await db.prepare('UPDATE "user" SET credit_balance=110,daily_free_credits=5 WHERE id=?').bind('owner').run()
    await Promise.all([store.reverse('evt_refund', 'pi_1', 'charge.refunded'), store.reverse('evt_dispute', 'pi_1', 'charge.dispute.created')])
    assert.deepEqual(await db.prepare('SELECT credit_balance,daily_free_credits,billing_hold FROM "user" WHERE id=?').bind('owner').first(), { credit_balance: 5, daily_free_credits: 5, billing_hold: 1 })
    assert.equal((await store.history('owner'))[0].revokedCredits, 1600)
    await store.fulfill({ eventId: 'evt_replay', orderId: 'order_1', sessionId: 'cs_test_1', paymentIntentId: 'pi_1' })
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'), 5)
  } finally { await dispose() }
})
test('ordinary merchant refund revokes credits once and lets the same account buy another pack', async () => {
  const { db, store, dispose } = await fixture()
  try {
    await store.createOrder('order_1', 'owner', 'price_pack', false)
    await store.fulfill({ eventId: 'evt_paid', orderId: 'order_1', sessionId: 'cs_test_1', paymentIntentId: 'pi_1' })
    for (const reason of ['refund.created', 'charge.refunded', 'refund.updated']) {
      await store.reverse('evt_' + reason, 'pi_1', reason)
      assert.equal(await store.isHeld('owner'), false, reason + ' must not suspend purchasing')
    }
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'), 5)
    assert.equal((await store.history('owner'))[0].revokedCredits, 1600)
    await store.createOrder('order_2', 'owner', 'price_pack', false)
    await store.fulfill({ eventId: 'evt_repurchase', orderId: 'order_2', sessionId: 'cs_test_2', paymentIntentId: 'pi_2' })
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'), 1605)
    // A late replay of the first refund must not touch the new purchase.
    await store.reverse('evt_late_refund', 'pi_1', 'charge.refunded')
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'), 1605)
  } finally { await dispose() }
})
test('a dispute after a processed refund adds a hold without a second credit deduction, and a refund cannot undo it', async () => {
  const { db, store, dispose } = await fixture()
  try {
    await store.createOrder('order_1', 'owner', 'price_pack', false)
    await store.fulfill({ eventId: 'evt_paid', orderId: 'order_1', sessionId: 'cs_test_1', paymentIntentId: 'pi_1' })
    await store.reverse('evt_refund', 'pi_1', 'charge.refunded')
    assert.equal(await store.isHeld('owner'), false)
    await store.reverse('evt_dispute', 'pi_1', 'charge.dispute.created')
    assert.equal(await store.isHeld('owner'), true)
    await store.reverse('evt_refund_update', 'pi_1', 'refund.updated')
    assert.equal(await store.isHeld('owner'), true)
    assert.equal(await db.prepare('SELECT reason FROM stripe_reversal WHERE payment_intent_id=?').bind('pi_1').first('reason'), 'charge.dispute.created')
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'), 5)
    await assert.rejects(store.createOrder('blocked', 'owner', 'price_pack', false))
  } finally { await dispose() }
})
test('a normal refund preserves an existing account review hold', async () => {
  const { db, store, dispose } = await fixture()
  try {
    await store.createOrder('order_1', 'owner', 'price_pack', false)
    await store.fulfill({ eventId: 'evt_paid', orderId: 'order_1', sessionId: 'cs_test_1', paymentIntentId: 'pi_1' })
    await db.prepare('UPDATE "user" SET billing_hold=1 WHERE id=?').bind('owner').run()
    await store.reverse('evt_refund', 'pi_1', 'charge.refunded')
    assert.equal(await store.isHeld('owner'), true)
  } finally { await dispose() }
})
test('out-of-order refund before payment fulfillment prevents any grant', async () => {
  const { db, store, dispose } = await fixture()
  try {
    await store.createOrder('order_1', 'owner', 'price_pack', false)
    await store.attachSession('order_1', 'cs_test_1')
    await store.reverse('evt_early', 'pi_1', 'refund.created')
    await store.fulfill({ eventId: 'evt_paid', orderId: 'order_1', sessionId: 'cs_test_1', paymentIntentId: 'pi_1' })
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'), 5)
    assert.equal((await store.history('owner'))[0].status, 'reversed')
    assert.equal(await store.isHeld('owner'), false)
  } finally { await dispose() }
})
const session = () => ({
  id: 'cs_test_1', livemode: false, mode: 'payment', status: 'complete', payment_status: 'paid', amount_total: 1999, amount_subtotal: 1999, currency: 'usd',
  client_reference_id: 'owner', metadata: { order_id: 'order_1', user_id: 'owner' },
  line_items: { has_more: false, data: [{ quantity: 1, price: { id: 'price_pack', unit_amount: 1999, currency: 'usd', livemode: false, recurring: null } }] },
  payment_intent: { id: 'pi_1', status: 'succeeded', amount: 1999, amount_received: 1999, currency: 'usd', livemode: false,
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
      if (String(input).includes('/prices/')) return Response.json({ id: 'price_pack', active: true, livemode: false, currency: 'usd', unit_amount: 1999, recurring: null })
      const form = new URLSearchParams(String(init?.body))
      assert.equal(form.get('line_items[0][price_data][unit_amount]'), '1999')
      assert.equal(form.get('line_items[0][quantity]'), '1')
      assert.equal(form.get('client_reference_id'), 'owner')
      assert.equal(form.get('mode'), 'payment')
      return Response.json({ id: 'cs_test_checkout', url: 'https://checkout.stripe.com/c/pay/example', livemode: false, line_items: session().line_items })
    }
    const deps = { environment, store, fetcher, getSession: async () => ({ user: { id: 'owner' } }) }
    const response = await billingCheckout(new Request('http://localhost:4310/api/billing/checkout', { method: 'POST', headers: { origin: 'http://localhost:4310' }, body: JSON.stringify({}) }), deps)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { url: 'https://checkout.stripe.com/c/pay/example' })
    const history = await billingHistory(new Request('http://localhost:4310/api/billing/history?userId=owner'), { ...deps, getSession: async () => ({ user: { id: 'other' } }) })
    assert.deepEqual((await history.json() as any).orders, [])
  } finally { await dispose() }
})
async function checkoutReturnUrls(body: unknown, store: ReturnType<typeof createStripePaymentStore>, routing = '') {
  let form: URLSearchParams | undefined
  const fetcher: typeof fetch = async (input, init) => {
    if (String(input).includes('/prices/')) return Response.json({ id: 'price_pack', active: true, livemode: false, currency: 'usd', unit_amount: 1999, recurring: null })
    form = new URLSearchParams(String(init?.body))
    return Response.json({ id: `cs_test_${crypto.randomUUID()}`, url: 'https://checkout.stripe.com/c/pay/example', livemode: false, line_items: session().line_items })
  }
  const response = await billingCheckout(new Request('http://localhost:4310/api/billing/checkout' + routing, {
    method: 'POST', headers: { origin: 'http://localhost:4310' }, body: JSON.stringify(body),
  }), { environment, store, fetcher, getSession: async () => ({ user: { id: 'owner' } }) })
  assert.equal(response.status, 200)
  assert.ok(form)
  return { success: form.get('success_url'), cancel: form.get('cancel_url') }
}

test('checkout rejects frontend pricing and unknown fields before creating an order or calling Stripe', async () => {
  const { store, dispose } = await fixture()
  try {
    let stripeCalls = 0
    const deps = { environment, store, getSession: async () => ({ user: { id: 'owner' } }), fetcher: async () => {
      stripeCalls++
      return Response.json({ id: 'cs_bad', url: 'https://checkout.stripe.com/c/pay/example', livemode: false, line_items: session().line_items })
    } }
    for (const field of ['amount', 'credits', 'price', 'priceId', 'price_id', 'unit_amount', 'quantity', 'line_items', 'userId']) {
      const response = await billingCheckout(new Request('http://localhost:4310/api/billing/checkout', {
        method: 'POST', headers: { origin: 'http://localhost:4310' }, body: JSON.stringify({ packId: 'creator', [field]: 1 }),
      }), deps)
      assert.equal(response.status, 400, field)
      assert.equal((await response.json() as any).code, 'INVALID_REQUEST', field)
    }
    assert.equal(stripeCalls, 0)
    assert.deepEqual(await store.history('owner'), [])
  } finally { await dispose() }
})

test('missing and unrecognized pack IDs choose Creator and use its server price without configured price IDs', async () => {
  const { store, dispose } = await fixture()
  try {
    for (const packId of [undefined, 'invalid', 'starter-1190', 'creator-2490', 'pro-4990', '', null, 999, {}, []]) {
      let orderId = ''
      const response = await billingCheckout(new Request('http://localhost:4310/api/billing/checkout', {
        method: 'POST', headers: { origin: 'http://localhost:4310' }, body: JSON.stringify({ packId }),
      }), {
        environment: { ...environment, STRIPE_PRICE_ID: undefined }, store, getSession: async () => ({ user: { id: 'owner' } }),
        fetcher: async (_input, init) => {
          const form = new URLSearchParams(String(init?.body))
          assert.equal(form.get('line_items[0][price_data][unit_amount]'), '1999')
          assert.equal(form.get('line_items[0][price_data][product_data][name]'), 'Creator · 1600 credits')
          assert.equal(form.has('line_items[0][price]'), false)
          orderId = form.get('metadata[order_id]')!
          return Response.json({ id: `cs_${crypto.randomUUID()}`, url: 'https://checkout.stripe.com/c/pay/example', livemode: false, line_items: session().line_items })
        },
      })
      assert.equal(response.status, 200, JSON.stringify(packId))
      const order = await store.order(orderId)
      assert.equal(order?.amount, 1999)
      assert.equal(order?.credits, 1600)
    }
  } finally { await dispose() }
})

test('checkout rejects malformed JSON shapes before contacting Stripe', async () => {
  const { store, dispose } = await fixture()
  try {
    for (const body of ['null', '[]', '1', 'true', '"creator"', '{']) {
      const response = await billingCheckout(new Request('http://localhost:4310/api/billing/checkout', {
        method: 'POST', headers: { origin: 'http://localhost:4310' }, body,
      }), { environment, store, getSession: async () => ({ user: { id: 'owner' } }), fetcher: async () => { throw new Error('must not contact Stripe') } })
      assert.equal(response.status, 400, body)
      assert.equal((await response.json() as any).code, 'INVALID_REQUEST')
    }
    assert.deepEqual(await store.history('owner'), [])
  } finally { await dispose() }
})

test('pack-only body preserves locale and safe return target from the URL', async () => {
  const {store,dispose}=await fixture()
  try {
    assert.deepEqual(await checkoutReturnUrls({packId:'creator'},store,'?locale=zh&returnTo=%2Fzh%2F'), {
      success:'http://localhost:4310/zh/?checkout=success&session_id={CHECKOUT_SESSION_ID}',cancel:'http://localhost:4310/zh/?checkout=cancelled',
    })
  } finally {await dispose()}
})

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
      'https://evil.test/', '//evil.test/', '/\\evil.test/',
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
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('other').first('credit_balance'), 1605)
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
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'), 1605)
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
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'), 1605)
  } finally { await dispose() }
})
test('a signed dispute arriving after a refund still holds the account before fulfillment', async () => {
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
    current.payment_intent.latest_charge.amount_refunded = 1999
    const response = await billingWebhook(new Request('http://localhost:4310/api/billing/webhook', {
      method: 'POST', body, headers: { 'stripe-signature': await signature(body) },
    }), { environment, store, fetcher: async () => Response.json(current) })
    assert.equal(response.status, 200)
    assert.equal((await store.order('order_1'))?.status, 'reversed')
    assert.equal(await store.isHeld('owner'), false, 'a completed payment that was refunded is not a dispute')
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'), 5)
  } finally { await dispose() }
})
test('a disputed payment snapshot keeps account review enabled even when it is also refunded', async () => {
  const { store, dispose } = await fixture()
  try {
    await store.createOrder('order_1', 'owner', 'price_pack', false)
    const body = JSON.stringify({ id: 'evt_paid', type: 'checkout.session.completed', livemode: false, data: { object: { id: 'cs_test_1' } } })
    const current = session()
    current.payment_intent.latest_charge.amount_refunded = 1999
    current.payment_intent.latest_charge.disputed = true
    const response = await billingWebhook(new Request('http://localhost:4310/api/billing/webhook', {
      method: 'POST', body, headers: { 'stripe-signature': await signature(body) },
    }), { environment, store, fetcher: async () => Response.json(current) })
    assert.equal(response.status, 200)
    assert.equal(await store.isHeld('owner'), true)
  } finally { await dispose() }
})
test('a merchant refund after some credits were spent does not prevent a new purchase', async () => {
  const { db, store, dispose } = await fixture()
  try {
    await store.createOrder('order_1', 'owner', 'price_pack', false)
    await store.fulfill({ eventId: 'evt_paid', orderId: 'order_1', sessionId: 'cs_test_1', paymentIntentId: 'pi_1' })
    await db.prepare('UPDATE "user" SET credit_balance=110 WHERE id=?').bind('owner').run()
    await store.reverse('evt_refund', 'pi_1', 'charge.refunded')
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'), 0)
    assert.equal(await store.isHeld('owner'), false)
    await store.createOrder('order_2', 'owner', 'price_pack', false)
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


for (const pack of [
  { id: 'starter', name: 'Starter', amount: 999, credits: 700 },
  { id: 'creator', name: 'Creator', amount: 1999, credits: 1600 },
  { id: 'studio', name: 'Studio', amount: 4999, credits: 4500 },
]) test(`${pack.name} checkout pins its price and credits, fulfills once, and revokes only its pack`, async () => {
  const {db,store,dispose}=await fixture()
  try {
    const createRequest=(body:unknown)=>new Request('http://localhost:4310/api/billing/checkout',{method:'POST',headers:{origin:'http://localhost:4310'},body:JSON.stringify(body)})
    let orderId=''
    const deps={environment,store,getSession:async()=>({user:{id:'owner'}}),fetcher:async(input:RequestInfo|URL,init?:RequestInit)=>{
      assert.match(String(input),/checkout\/sessions$/)
      const form=new URLSearchParams(String(init?.body))
      assert.equal(form.get('line_items[0][price_data][unit_amount]'),String(pack.amount))
      assert.equal(form.get('line_items[0][price_data][currency]'),'usd')
      assert.equal(form.get('line_items[0][price_data][product_data][name]'),`${pack.name} · ${pack.credits} credits`)
      assert.equal(form.get('line_items[0][quantity]'),'1')
      orderId=form.get('metadata[order_id]')!
      return Response.json({id:'cs_test_1',url:'https://checkout.stripe.com/c/pay/creator',livemode:false,line_items:{has_more:false,data:[{quantity:1,price:{id:'price_creator',unit_amount:pack.amount,currency:'usd',livemode:false}}]}})
    }}
    assert.equal((await billingCheckout(createRequest({packId:pack.id}),deps)).status,200)
    assert.equal((await store.order(orderId))?.amount,pack.amount)
    assert.equal((await store.order(orderId))?.credits,pack.credits)
    assert.equal((await store.order(orderId))?.price_id,'price_creator')
    const paid=session()
    paid.metadata.order_id=orderId;paid.payment_intent.metadata.order_id=orderId
    paid.amount_total=paid.amount_subtotal=paid.payment_intent.amount=paid.payment_intent.amount_received=pack.amount
    paid.line_items.data[0].price.id='price_creator';paid.line_items.data[0].price.unit_amount=pack.amount
    const body=JSON.stringify({id:'evt_creator',type:'checkout.session.completed',livemode:false,data:{object:{id:'cs_test_1'}}})
    const deliver=async()=>billingWebhook(new Request('http://localhost:4310/api/billing/webhook',{method:'POST',headers:{'stripe-signature':await signature(body)},body}),{environment,store,fetcher:async()=>Response.json(paid)})
    paid.amount_total=499
    assert.equal((await deliver()).status,400)
    paid.amount_total=pack.amount
    assert.equal((await deliver()).status,200);assert.equal((await deliver()).status,200)
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'),pack.credits+5)
    const [order]=await store.history('owner');assert.equal(order.amount,pack.amount);assert.equal(order.credits,pack.credits)
    await store.reverse('evt_creator_refund','pi_1','charge.refunded')
    assert.equal((await store.history('owner'))[0].revokedCredits,pack.credits)
    assert.equal(await store.isHeld('owner'),false)
    assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'),5)
  } finally {await dispose()}
})

test('retired checkout sessions still fulfill their original credit amounts', async () => {
  const { db, store, dispose } = await fixture()
  try {
    let balance = 5
    for (const [amount, credits] of [[499, 500], [999, 1100], [1190, 1100], [2490, 3000], [4990, 6500], [1999, 1450], [4999, 3650]]) {
      const orderId = `legacy_${amount}`, sessionId = `cs_legacy_${amount}`
      await db.prepare('INSERT INTO stripe_order (id,user_id,price_id,live_mode,amount,credits,session_id) VALUES (?,?,?,?,?,?,?)')
        .bind(orderId, 'owner', 'price_pack', 0, amount, credits, sessionId).run()
      const paid = session()
      paid.id = sessionId
      paid.metadata.order_id = paid.payment_intent.metadata.order_id = orderId
      paid.payment_intent.id = `pi_legacy_${amount}`
      paid.amount_total = paid.amount_subtotal = paid.payment_intent.amount = paid.payment_intent.amount_received = amount
      paid.line_items.data[0].price.unit_amount = amount
      const body = JSON.stringify({ id: `evt_legacy_${amount}`, type: 'checkout.session.completed', livemode: false, data: { object: { id: sessionId } } })
      for (let delivery = 0; delivery < 2; delivery++) {
        const response = await billingWebhook(new Request('http://localhost:4310/api/billing/webhook', {
          method: 'POST', body, headers: { 'stripe-signature': await signature(body) },
        }), { environment: { ...environment, STRIPE_PRICE_ID: undefined }, store, fetcher: async () => Response.json(paid) })
        assert.equal(response.status, 200)
      }
      balance += credits
      assert.equal(await db.prepare('SELECT credit_balance FROM "user" WHERE id=?').bind('owner').first('credit_balance'), balance)
    }
  } finally { await dispose() }
})
