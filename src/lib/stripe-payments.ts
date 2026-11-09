import { CREDIT_PACKS, LEGACY_CREDIT_PACKS, DEFAULT_CREDIT_PACK_ID, creditPack } from '../../assets/credit-packs.mjs'
import { normalizeCreditReturn, creditReturnUrl } from '../../assets/credit-return.mjs'
import type { StripeOrder, StripePaymentStore } from '../db/stripe-payments'
import type { RefundRequestStore } from '../db/refund-requests'
import { canReviewRefunds, type RefundEnvironment } from './refund-requests'

export type StripeEnvironment = {
  STRIPE_SECRET_KEY?: string; STRIPE_WEBHOOK_SECRET?: string; STRIPE_PRICE_ID?: string
  STRIPE_MODE?: string; STRIPE_ACCOUNT_ID?: string
}
type Config = { key: string; webhookSecret: string; live: boolean; accountId?: string }
type Session = { user: { id: string } } | null
type Dependencies = { environment: StripeEnvironment & RefundEnvironment; store: StripePaymentStore; fetcher?: typeof fetch; refundStore?: RefundRequestStore }
type AuthDependencies = Dependencies & { getSession: (request: Request) => Promise<Session> }
type StripeObject = Record<string, any>
const MAX_BODY = 262144
class BillingError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message) }
}
function invalid() { return new BillingError('INVALID_PAYMENT', 400, 'Payment verification failed.') }
function unavailable() { return new BillingError('BILLING_UNAVAILABLE', 503, 'Purchases are not configured or are temporarily unavailable.') }
function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
function errorResponse(error: unknown) {
  const safe = error instanceof BillingError ? error : unavailable()
  return json({ error: safe.message, code: safe.code }, safe.status)
}
export function readStripeConfig(env: StripeEnvironment): Config {
  const mode = env.STRIPE_MODE
  if ((mode !== 'test' && mode !== 'live') || !new RegExp(`^(sk|rk)_${mode}_\\S+$`).test(env.STRIPE_SECRET_KEY ?? '')
    || !/^whsec_\S+$/.test(env.STRIPE_WEBHOOK_SECRET ?? '')
    || (env.STRIPE_ACCOUNT_ID && !/^acct_[A-Za-z0-9]+$/.test(env.STRIPE_ACCOUNT_ID))) throw unavailable()
  return { key: env.STRIPE_SECRET_KEY!, webhookSecret: env.STRIPE_WEBHOOK_SECRET!, live: mode === 'live', accountId: env.STRIPE_ACCOUNT_ID }
}
function requestConfig(request: Request, environment: StripeEnvironment) {
  const config = readStripeConfig(environment)
  if (!config.live && !['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname)) throw unavailable()
  return config
}
async function readBoundedBody(request: Request, limit = MAX_BODY) {
  if (Number(request.headers.get('content-length')) > limit) throw new BillingError('PAYLOAD_TOO_LARGE', 413, 'Payload too large.')
  const reader = request.body?.getReader()
  if (!reader) return ''
  const parts: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) { await reader.cancel(); throw new BillingError('PAYLOAD_TOO_LARGE', 413, 'Payload too large.') }
      parts.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes) } catch { throw invalid() }
}
export async function verifyStripeSignature(raw: string, header: string | null, secret: string, now = Math.floor(Date.now() / 1000)) {
  if (!header || header.length > 4096) return false
  const fields = header.split(',').map(part => part.trim().split('='))
  const timestamps = fields.filter(([key]) => key === 't')
  if (timestamps.length !== 1 || !/^\d+$/.test(timestamps[0][1] ?? '')) return false
  const timestamp = Number(timestamps[0][1])
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > 300) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  const payload = new TextEncoder().encode(`${timestamp}.${raw}`)
  for (const [version, digest] of fields) {
    if (version !== 'v1' || !/^[a-fA-F0-9]{64}$/.test(digest ?? '')) continue
    const bytes = new Uint8Array(digest.match(/.{2}/g)!.map(pair => parseInt(pair, 16)))
    if (await crypto.subtle.verify('HMAC', key, bytes, payload)) return true
  }
  return false
}
async function stripe(config: Config, path: string, fetcher: typeof fetch, form?: URLSearchParams, idempotencyKey?: string): Promise<StripeObject> {
  const response = await fetcher(`https://api.stripe.com/v1/${path}`, {
    method: form ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${config.key}`, 'Stripe-Version': '2025-02-24.acacia',
      ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
    ...(form ? { body: form.toString() } : {}),
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw unavailable()
  return response.json()
}
async function verifyAccount(config: Config, fetcher: typeof fetch) {
  if (config.accountId && (await stripe(config, 'account', fetcher)).id !== config.accountId) throw unavailable()
}
function validatePrice(price: StripeObject, config: Config, priceId: string, amount: number) {
  if (!price || price.id !== priceId || price.currency !== 'usd' || price.unit_amount !== amount
    || price.recurring || price.livemode !== config.live) throw invalid()
}
async function userId(request: Request, deps: AuthDependencies) {
  const session = await deps.getSession(request)
  if (!session?.user?.id || /^guest[:-]/.test(session.user.id)) throw new BillingError('AUTH_REQUIRED', 401, 'Sign in to purchase credits.')
  return session.user.id
}
export async function billingCheckout(request: Request, deps: AuthDependencies) {
  try {
    if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') {
      throw new BillingError('INVALID_ORIGIN', 403, 'Checkout must start on this website.')
    }
    const owner = await userId(request, deps)
    const config = requestConfig(request, deps.environment)
    if (await deps.store.isHeld(owner)) throw new BillingError('BILLING_HOLD', 403, 'Your account needs a payment review. Please contact support.')
    const raw = await readBoundedBody(request, 4096)
    let body: StripeObject
    try { body = raw ? JSON.parse(raw) : {} } catch { throw new BillingError('INVALID_REQUEST', 400, 'Invalid checkout request.') }
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).some(key => !['packId', 'locale', 'returnTo'].includes(key))) {
      throw new BillingError('INVALID_REQUEST', 400, 'Only packId and checkout routing fields are accepted.')
    }
    const pack = creditPack(typeof body.packId === 'string' ? body.packId : DEFAULT_CREDIT_PACK_ID)
    const fetcher = deps.fetcher ?? fetch
    await verifyAccount(config, fetcher)
    const id = crypto.randomUUID()
    await deps.store.createOrder(id, owner, 'pending_pack_price', config.live, pack.id)
    const routing = new URL(request.url).searchParams
    const returnPath = normalizeCreditReturn(routing.get('returnTo') ?? body?.returnTo) || `${(routing.get('locale') ?? body?.locale) === 'zh' ? '/zh' : ''}/billing`
    const returnOrigin = new URL(request.url).origin
    const form = new URLSearchParams({
      mode: 'payment', 'line_items[0][quantity]': '1',
      'payment_method_types[0]': 'card', client_reference_id: owner,
      'metadata[order_id]': id, 'metadata[user_id]': owner,
      'payment_intent_data[metadata][order_id]': id, 'payment_intent_data[metadata][user_id]': owner,
      'automatic_tax[enabled]': 'false', allow_promotion_codes: 'false',
      'adaptive_pricing[enabled]': 'false',
      success_url: creditReturnUrl(returnOrigin, returnPath, 'success'),
      cancel_url: creditReturnUrl(returnOrigin, returnPath, 'cancelled'),
    })
    // Server-owned pricing; no client-supplied amount, quantity or credits are accepted.
    form.set('line_items[0][price_data][currency]', 'usd')
    form.set('line_items[0][price_data][unit_amount]', String(pack.amount))
    form.set('line_items[0][price_data][product_data][name]', `${pack.name} · ${pack.credits} credits`)
    form.set('expand[0]', 'line_items.data.price')
    const result = await stripe(config, 'checkout/sessions', fetcher, form, `credit-pack-${id}`)
    if (result.livemode !== config.live || typeof result.id !== 'string' || typeof result.url !== 'string') throw invalid()
    const url = new URL(result.url)
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw invalid()
    const items = result.line_items
    if (!items || items.has_more || items.data?.length !== 1 || items.data[0].quantity !== 1) throw invalid()
    const priceId = objectId(items.data[0].price, 'price_')
    validatePrice(items.data[0].price, config, priceId, pack.amount)
    await deps.store.attachSession(id, result.id, priceId)
    return json({ url: result.url })
  } catch (error) { return errorResponse(error) }
}
export async function billingHistory(request: Request, deps: AuthDependencies) {
  try {
    const owner = await userId(request, deps)
    let enabled = true
    try { requestConfig(request, deps.environment) } catch { enabled = false }
    const billingHold = await deps.store.isHeld(owner)
    let page
    try { page = await deps.store.historyPage(owner, new URL(request.url).searchParams.get('cursor')) }
    catch (error) {
      if (error instanceof TypeError) throw new BillingError('INVALID_CURSOR', 400, 'Invalid order cursor.')
      throw error
    }
    const refunds=await deps.refundStore?.forOrders(owner,page.orders.map(order=>order.id))
    return json({ checkoutEnabled: enabled && !billingHold, billingHold, ...page,
      canReviewRefunds:canReviewRefunds(owner,deps.environment),
      orders:page.orders.map(order=>({...order,refundRequest:refunds?.get(order.id)??null})) })
  } catch (error) { return errorResponse(error) }
}
function objectId(value: unknown, prefix: string) {
  const id = typeof value === 'string' ? value : (value as StripeObject | null)?.id
  if (typeof id !== 'string' || !id.startsWith(prefix) || id.length > 255) throw invalid()
  return id
}
function validatePayment(session: StripeObject, order: StripeOrder, config: Config) {
  if (![...CREDIT_PACKS, ...LEGACY_CREDIT_PACKS].some(pack => pack.amount === order.amount && pack.credits === order.credits) || order.currency !== 'usd') throw invalid()
  const items = session.line_items
  const intent = session.payment_intent
  if (order.live_mode !== Number(config.live) || session.livemode !== config.live || session.mode !== 'payment'
    || session.status !== 'complete' || session.payment_status !== 'paid' || session.currency !== 'usd'
    || session.amount_total !== order.amount || session.amount_subtotal !== order.amount
    || session.metadata?.order_id !== order.id || session.metadata?.user_id !== order.user_id || session.client_reference_id !== order.user_id
    || (order.session_id && order.session_id !== session.id)
    || !items || items.has_more || items.data?.length !== 1 || items.data[0].quantity !== 1
    || !intent || typeof intent !== 'object' || intent.status !== 'succeeded' || intent.amount !== order.amount || intent.amount_received !== order.amount
    || intent.currency !== 'usd' || intent.livemode !== config.live || intent.metadata?.order_id !== order.id || intent.metadata?.user_id !== order.user_id
    || !intent.latest_charge || typeof intent.latest_charge !== 'object') throw invalid()
  validatePrice(items.data[0].price, config, order.price_id, order.amount)
  return objectId(intent, 'pi_')
}
export async function billingWebhook(request: Request, deps: Dependencies) {
  try {
    const config = requestConfig(request, deps.environment)
    const raw = await readBoundedBody(request)
    if (!await verifyStripeSignature(raw, request.headers.get('stripe-signature'), config.webhookSecret)) throw invalid()
    let event: StripeObject
    try { event = JSON.parse(raw) } catch { throw invalid() }
    if (!event || typeof event !== 'object' || event.livemode !== config.live || typeof event.type !== 'string'
      || !event.data?.object || (event.account && event.account !== config.accountId)) throw invalid()
    const eventId = objectId(event, 'evt_')
    const fetcher = deps.fetcher ?? fetch
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await verifyAccount(config, fetcher)
      const sessionId = objectId(event.data.object, 'cs_')
      const session = await stripe(config, `checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=line_items.data.price&expand[]=payment_intent.latest_charge`, fetcher)
      if (session.id !== sessionId) throw invalid()
      // Completed sessions for delayed payment methods may still be unpaid.
      if (session.payment_status === 'unpaid') return json({ received: true })
      const orderId = session.metadata?.order_id
      if (typeof orderId !== 'string') throw invalid()
      const order = await deps.store.order(orderId)
      if (!order) throw invalid()
      const paymentIntentId = validatePayment(session, order, config)
      const charge = session.payment_intent.latest_charge
      if (typeof charge.amount_refunded !== 'number' || typeof charge.disputed !== 'boolean') throw invalid()
      if (charge.amount_refunded > 0 || charge.disputed) {
        await deps.store.reverse(`${eventId}:reversal`, paymentIntentId, charge.disputed ? 'payment-disputed' : 'payment-refunded')
      }
      await deps.store.fulfill({ eventId, orderId, sessionId, paymentIntentId })
    } else if (['charge.refunded', 'charge.dispute.created', 'charge.dispute.funds_withdrawn', 'refund.created', 'refund.updated', 'refund.failed'].includes(event.type)) {
      await verifyAccount(config, fetcher)
      const object = event.data.object
      let intent = object.payment_intent
      if (!intent && object.charge) {
        const chargeId = objectId(object.charge, 'ch_')
        intent = (await stripe(config, `charges/${encodeURIComponent(chargeId)}`, fetcher)).payment_intent
      }
      if(deps.refundStore&&(event.type.startsWith('refund.')||event.type==='charge.refunded')) {
        await syncStripeRefundStatus(request,deps,objectId(intent,'pi_'))
      }
      // Revoke the affected pack while a refund is in flight, without suspending purchases.
      if (event.type.startsWith('refund.') && ['failed', 'canceled'].includes(object.status)) return json({ received: true })
      const reason = event.type === 'charge.refunded' && object.disputed === true ? 'payment-disputed' : event.type
      await deps.store.reverse(eventId, objectId(intent, 'pi_'), reason)
    }
    return json({ received: true })
  } catch (error) { return errorResponse(error) }
}

// Only reads Stripe refund records. Approval in the review UI never calls Stripe's refund creation API.
export async function syncStripeRefundStatus(request:Request,deps:Dependencies,intent:string) {
  if(!deps.refundStore||!/^pi_[A-Za-z0-9_]+$/.test(intent))throw invalid()
  if(!await deps.refundStore.hasPaymentRequest(intent))return
  const config=requestConfig(request,deps.environment),fetcher=deps.fetcher??fetch
  await verifyAccount(config,fetcher)
  const order = await deps.store.paymentOrder(intent)
  if (!order) throw invalid()
  let after=''
  for(let page=0;page<10;page++) {
    const list=await stripe(config,`refunds?payment_intent=${encodeURIComponent(intent)}&limit=100${after?'&starting_after='+encodeURIComponent(after):''}`,fetcher)
    if(!Array.isArray(list.data)||typeof list.has_more!=='boolean')throw invalid()
    const refunds=list.data.map((r:StripeObject)=>{
      if(typeof r.id!=='string'||!/^re_[A-Za-z0-9_]+$/.test(r.id)||r.payment_intent!==intent||!Number.isSafeInteger(r.amount)||r.amount<1||r.amount>order.amount||r.currency!=='usd'||!['pending','requires_action','succeeded','failed','canceled'].includes(r.status))throw invalid()
      return {id:r.id,amount:r.amount,currency:r.currency,status:r.status}
    })
    await deps.refundStore.syncPaymentRefunds(intent,refunds)
    if(!list.has_more)return
    const next=refunds.at(-1)?.id;if(!next||next===after)throw invalid();after=next
  }
  throw unavailable()
}
