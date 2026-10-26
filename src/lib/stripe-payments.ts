import type { StripeOrder, StripePaymentStore } from '../db/stripe-payments'

export type StripeEnvironment = {
  STRIPE_SECRET_KEY?: string; STRIPE_WEBHOOK_SECRET?: string; STRIPE_PRICE_ID?: string
  STRIPE_MODE?: string; STRIPE_ACCOUNT_ID?: string
}
type Config = { key: string; webhookSecret: string; priceId: string; live: boolean; accountId?: string }
type Session = { user: { id: string } } | null
type Dependencies = { environment: StripeEnvironment; store: StripePaymentStore; fetcher?: typeof fetch }
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
    || !/^whsec_\S+$/.test(env.STRIPE_WEBHOOK_SECRET ?? '') || !/^price_[A-Za-z0-9_]+$/.test(env.STRIPE_PRICE_ID ?? '')
    || (env.STRIPE_ACCOUNT_ID && !/^acct_[A-Za-z0-9]+$/.test(env.STRIPE_ACCOUNT_ID))) throw unavailable()
  return { key: env.STRIPE_SECRET_KEY!, webhookSecret: env.STRIPE_WEBHOOK_SECRET!, priceId: env.STRIPE_PRICE_ID!, live: mode === 'live', accountId: env.STRIPE_ACCOUNT_ID }
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
function validatePrice(price: StripeObject, config: Config, priceId: string) {
  if (!price || price.id !== priceId || price.currency !== 'usd' || price.unit_amount !== 499
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
    const fetcher = deps.fetcher ?? fetch
    await verifyAccount(config, fetcher)
    const price = await stripe(config, `prices/${encodeURIComponent(config.priceId)}`, fetcher)
    validatePrice(price, config, config.priceId)
    if (price.active !== true) throw unavailable()
    const id = crypto.randomUUID()
    await deps.store.createOrder(id, owner, config.priceId, config.live)
    const returnPath = body?.returnTo === '/' || body?.returnTo === '/zh/'
      ? body.returnTo : `${body?.locale === 'zh' ? '/zh' : ''}/billing`
    const returnUrl = `${new URL(request.url).origin}${returnPath}`
    const form = new URLSearchParams({
      mode: 'payment', 'line_items[0][price]': config.priceId, 'line_items[0][quantity]': '1',
      'payment_method_types[0]': 'card', client_reference_id: owner,
      'metadata[order_id]': id, 'metadata[user_id]': owner,
      'payment_intent_data[metadata][order_id]': id, 'payment_intent_data[metadata][user_id]': owner,
      'automatic_tax[enabled]': 'false', allow_promotion_codes: 'false',
      'adaptive_pricing[enabled]': 'false',
      success_url: `${returnUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?checkout=cancelled`,
    })
    const result = await stripe(config, 'checkout/sessions', fetcher, form, `credit-pack-${id}`)
    if (result.livemode !== config.live || typeof result.id !== 'string' || typeof result.url !== 'string') throw invalid()
    const url = new URL(result.url)
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw invalid()
    await deps.store.attachSession(id, result.id)
    return json({ url: result.url })
  } catch (error) { return errorResponse(error) }
}
export async function billingHistory(request: Request, deps: AuthDependencies) {
  try {
    const owner = await userId(request, deps)
    let enabled = true
    try { requestConfig(request, deps.environment) } catch { enabled = false }
    const billingHold = await deps.store.isHeld(owner)
    return json({ checkoutEnabled: enabled && !billingHold, billingHold, orders: await deps.store.history(owner) })
  } catch (error) { return errorResponse(error) }
}
function objectId(value: unknown, prefix: string) {
  const id = typeof value === 'string' ? value : (value as StripeObject | null)?.id
  if (typeof id !== 'string' || !id.startsWith(prefix) || id.length > 255) throw invalid()
  return id
}
function validatePayment(session: StripeObject, order: StripeOrder, config: Config) {
  const items = session.line_items
  const intent = session.payment_intent
  if (order.live_mode !== Number(config.live) || session.livemode !== config.live || session.mode !== 'payment'
    || session.status !== 'complete' || session.payment_status !== 'paid' || session.currency !== 'usd'
    || session.amount_total !== 499 || session.amount_subtotal !== 499
    || session.metadata?.order_id !== order.id || session.metadata?.user_id !== order.user_id || session.client_reference_id !== order.user_id
    || (order.session_id && order.session_id !== session.id)
    || !items || items.has_more || items.data?.length !== 1 || items.data[0].quantity !== 1
    || !intent || typeof intent !== 'object' || intent.status !== 'succeeded' || intent.amount !== 499 || intent.amount_received !== 499
    || intent.currency !== 'usd' || intent.livemode !== config.live || intent.metadata?.order_id !== order.id || intent.metadata?.user_id !== order.user_id
    || !intent.latest_charge || typeof intent.latest_charge !== 'object') throw invalid()
  validatePrice(items.data[0].price, config, order.price_id)
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
        await deps.store.reverse(`${eventId}:reversal`, paymentIntentId, 'payment-already-reversed')
      }
      await deps.store.fulfill({ eventId, orderId, sessionId, paymentIntentId })
    } else if (['charge.refunded', 'charge.dispute.created', 'charge.dispute.funds_withdrawn', 'refund.created', 'refund.updated'].includes(event.type)) {
      await verifyAccount(config, fetcher)
      const object = event.data.object
      // Freeze pending refunds as well, so credits cannot be spent while the refund is in flight.
      if (event.type.startsWith('refund.') && ['failed', 'canceled'].includes(object.status)) return json({ received: true })
      let intent = object.payment_intent
      if (!intent && object.charge) {
        const chargeId = objectId(object.charge, 'ch_')
        intent = (await stripe(config, `charges/${encodeURIComponent(chargeId)}`, fetcher)).payment_intent
      }
      await deps.store.reverse(eventId, objectId(intent, 'pi_'), event.type)
    }
    return json({ received: true })
  } catch (error) { return errorResponse(error) }
}
