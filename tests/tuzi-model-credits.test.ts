import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getRequestedImageCreditCost,
  handleImageGenerationRequest,
  preflightImageGenerationRequest,
} from '../scripts/tuzi-image.mjs'
import type { GenerationCreditStore } from '../src/lib/generation-credits'
import { protectImageGeneration } from '../src/lib/protected-image-generation'

const WEBSITE_MODEL = 'gpt-image-2-5-1k'
const PROVIDER_MODEL = 'gpt-image-2.5-1k'
const USER_ID = 'tuzi-model-test-user'
const RESERVATION_ID = 'tuzi-model-test-reservation'

interface RequestOptions {
  model?: string | null
  modelHeader?: string | null
  quantity?: number
  size?: string | null
  references?: number
}

function generationRequest({
  model = WEBSITE_MODEL,
  modelHeader = model,
  quantity = 2,
  size = '1254x1254',
  references = 0,
}: RequestOptions = {}): Request {
  const body = new FormData()
  body.set('prompt', 'A ceramic rabbit on a green table')
  body.set('quantity', String(quantity))
  body.set('resolution', '1K')
  if (model !== null) body.set('model', model)
  if (size !== null) body.set('size', size)
  for (let index = 0; index < references; index += 1) {
    body.append('image', new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {
      type: 'image/png',
    }), `reference-${index}.png`)
  }
  const headers = new Headers({ 'x-seedance-image-quantity': String(quantity) })
  if (modelHeader !== null) headers.set('x-seedance-image-model', modelHeader)
  return new Request('https://seedance3-pro.com/api/images/generate', {
    method: 'POST', body, headers,
  })
}

interface ProviderCall {
  url: string
  body: Record<string, unknown>
}

interface BoundaryCalls {
  sessions: number
  preflights: number
  rateLimits: number
  creditCosts: number
  adapter: number
  upstream: ProviderCall[]
  reserves: Array<{ userId: string; credits: number }>
  settlements: string[]
  refunds: string[]
  balances: string[]
}

type ReservationStatus = 'none' | 'reserved' | 'settled' | 'refunded'

interface GenerationHarness {
  response: Response
  calls: BoundaryCalls
  events: string[]
  balance: number
  reservationStatus: ReservationStatus
}

interface HarnessOptions {
  request?: Request
  authenticated?: boolean
  initialBalance?: number
  providerReply?: () => Response | Promise<Response>
}

interface FailurePayload {
  success: false
  message: string
  code?: string
  credits?: { cost: number; remaining: number }
}

type GeneratedImage = { url: string } | { dataUrl: string }

interface SuccessPayload {
  success: true
  mode: 'text-to-image' | 'image-to-image'
  image: GeneratedImage
  images: GeneratedImage[]
}

async function readFailurePayload(response: Response): Promise<FailurePayload> {
  const payload = await response.json() as FailurePayload
  assert.equal(payload.success, false)
  return payload
}

async function runGeneration({
  request = generationRequest(),
  authenticated = true,
  initialBalance = 20,
  providerReply = () => Response.json({ data: [
    { url: 'https://cdn.example.com/tuzi-1.png' },
    { url: 'https://cdn.example.com/tuzi-2.png' },
  ] }),
}: HarnessOptions = {}): Promise<GenerationHarness> {
  const calls: BoundaryCalls = {
    sessions: 0, preflights: 0, rateLimits: 0, creditCosts: 0, adapter: 0,
    upstream: [], reserves: [], settlements: [], refunds: [], balances: [],
  }
  const events: string[] = []
  let balance = initialBalance
  let reservedCredits = 0
  let reservationStatus: ReservationStatus = 'none'
  const creditStore: GenerationCreditStore = {
    async reserve(userId, credits) {
      events.push('reserve')
      calls.reserves.push({ userId, credits })
      assert.equal(reservationStatus, 'none')
      if (balance < credits) return null
      reservedCredits = credits
      balance -= credits
      reservationStatus = 'reserved'
      return { id: RESERVATION_ID, remainingCredits: balance }
    },
    async settle(reservationId) {
      events.push('settle')
      calls.settlements.push(reservationId)
      assert.equal(reservationId, RESERVATION_ID)
      assert.equal(reservationStatus, 'reserved', 'a reservation is settled exactly once')
      reservationStatus = 'settled'
    },
    async refund(reservationId) {
      events.push('refund')
      calls.refunds.push(reservationId)
      assert.equal(reservationId, RESERVATION_ID)
      assert.equal(reservationStatus, 'reserved', 'only an outstanding reservation is refunded')
      balance += reservedCredits
      reservationStatus = 'refunded'
      return { remainingCredits: balance }
    },
    async getBalance(userId) {
      events.push('get-balance')
      calls.balances.push(userId)
      return balance
    },
  }
  // Use only fixture credentials and an injected provider; no environment secrets or network calls.
  const env = {
    TUZI_API_KEY: 'fixture-key-never-sent-to-a-network',
    IMAGE_RATE_LIMITER: {
      async limit() {
        calls.rateLimits += 1
        events.push('rate-limit')
        return { success: true }
      },
    },
  }
  const fetchImpl: typeof fetch = async (input, init) => {
    assert.equal(reservationStatus, 'reserved', 'provider work must follow a credit reservation')
    assert.equal(typeof init?.body, 'string')
    const body = JSON.parse(init!.body as string) as Record<string, unknown>
    calls.upstream.push({ url: String(input), body })
    events.push('provider')
    return providerReply()
  }
  const response = await protectImageGeneration({
    request,
    creditStore,
    getSession: async () => {
      calls.sessions += 1
      events.push('session')
      return authenticated ? { user: { id: USER_ID } } : null
    },
    preflight: async (protectedRequest: Request) => {
      calls.preflights += 1
      events.push('preflight')
      return preflightImageGenerationRequest(protectedRequest, env)
    },
    getCreditCost: (protectedRequest: Request) => {
      calls.creditCosts += 1
      events.push('credit-cost')
      return getRequestedImageCreditCost(protectedRequest)
    },
    generate: async (protectedRequest: Request) => {
      calls.adapter += 1
      return handleImageGenerationRequest(protectedRequest, env, { skipPreflight: true, fetchImpl })
    },
  })
  return { response, calls, events, balance, reservationStatus }
}

function assertRefunded(harness: GenerationHarness): void {
  assert.deepEqual(harness.calls.reserves, [{ userId: USER_ID, credits: 10 }])
  assert.deepEqual(harness.calls.refunds, [RESERVATION_ID])
  assert.deepEqual(harness.calls.settlements, [])
  assert.equal(harness.balance, 20)
  assert.equal(harness.reservationStatus, 'refunded')
  assert.equal(harness.response.headers.get('x-seedance-credit-cost'), '10')
  assert.equal(harness.response.headers.get('x-seedance-credit-remaining'), '20')
}

test('anonymous Tuzi 2.5 generation stops before rate limiting, credits or upstream work', async () => {
  const harness = await runGeneration({ authenticated: false })
  assert.equal(harness.response.status, 401)
  assert.equal((await readFailurePayload(harness.response)).code, 'AUTH_REQUIRED')
  assert.deepEqual(harness.events, ['session'])
  assert.equal(harness.calls.preflights, 0)
  assert.equal(harness.calls.creditCosts, 0)
  assert.deepEqual(harness.calls.reserves, [])
  assert.deepEqual(harness.calls.refunds, [])
  assert.deepEqual(harness.calls.settlements, [])
  assert.equal(harness.calls.adapter, 0)
  assert.deepEqual(harness.calls.upstream, [])
  assert.equal(harness.balance, 20)
  assert.equal(harness.response.headers.get('x-seedance-credit-cost'), null)
})

test('provider aliases and arbitrary model headers are rejected before credit reservation', async (t) => {
  for (const modelHeader of [PROVIDER_MODEL, 'unlisted-provider-model']) {
    await t.test(modelHeader, async () => {
      const harness = await runGeneration({ request: generationRequest({ modelHeader }) })
      assert.equal(harness.response.status, 400)
      assert.match((await readFailurePayload(harness.response)).message, /model is not supported/i)
      assert.deepEqual(harness.events, ['session', 'preflight'])
      assert.equal(harness.calls.rateLimits, 0)
      assert.equal(harness.calls.creditCosts, 0)
      assert.deepEqual(harness.calls.reserves, [])
      assert.equal(harness.calls.adapter, 0)
      assert.deepEqual(harness.calls.upstream, [])
      assert.deepEqual(harness.calls.refunds, [])
      assert.deepEqual(harness.calls.settlements, [])
      assert.equal(harness.balance, 20)
    })
  }
})

test('two Tuzi 2.5 images reserve and settle exactly ten credits with the exact upstream alias', async () => {
  const harness = await runGeneration({ request: generationRequest({ size: null }) })
  assert.equal(harness.response.status, 200)
  assert.deepEqual(harness.calls.reserves, [{ userId: USER_ID, credits: 10 }])
  assert.equal(harness.calls.upstream.length, 1)
  assert.deepEqual(harness.calls.upstream[0], {
    url: 'https://api.tu-zi.com/v1/images/generations',
    body: {
      model: PROVIDER_MODEL,
      prompt: 'A ceramic rabbit on a green table',
      n: 2,
      quality: 'low',
      size: '1254x1254',
      response_format: 'b64_json',
    },
  })
  assert.deepEqual(harness.calls.settlements, [RESERVATION_ID])
  assert.deepEqual(harness.calls.refunds, [])
  assert.deepEqual(harness.calls.balances, [USER_ID])
  assert.equal(harness.balance, 10)
  assert.equal(harness.reservationStatus, 'settled')
  assert.equal(harness.response.headers.get('x-seedance-credit-cost'), '10')
  assert.equal(harness.response.headers.get('x-seedance-credit-remaining'), '10')
  assert.deepEqual(harness.events, [
    'session', 'preflight', 'rate-limit', 'credit-cost', 'reserve', 'provider', 'settle', 'get-balance',
  ])
  const payload = await harness.response.json() as SuccessPayload
  assert.equal(payload.success, true)
  assert.equal(payload.images.length, 2)
  assert.deepEqual(payload.image, payload.images[0])
})

test('a two-image Tuzi 2.5 request with only nine credits does not call the provider', async () => {
  const harness = await runGeneration({ initialBalance: 9 })
  assert.equal(harness.response.status, 402)
  const payload = await readFailurePayload(harness.response)
  assert.equal(payload.code, 'INSUFFICIENT_CREDITS')
  assert.deepEqual(payload.credits, { cost: 10, remaining: 9 })
  assert.deepEqual(harness.calls.reserves, [{ userId: USER_ID, credits: 10 }])
  assert.equal(harness.calls.adapter, 0)
  assert.deepEqual(harness.calls.upstream, [])
  assert.deepEqual(harness.calls.refunds, [])
  assert.deepEqual(harness.calls.settlements, [])
  assert.equal(harness.balance, 9)
})

test('model mismatches and model-specific invalid sizes restore credits without calling Tuzi', async (t) => {
  const cases: Array<{ name: string; input: RequestOptions; message: RegExp }> = [
    { name: 'old header with new body', input: { modelHeader: 'gpt-image-2' }, message: /model does not match/i },
    { name: 'new header with old body', input: { model: 'gpt-image-2', modelHeader: WEBSITE_MODEL }, message: /model does not match/i },
    { name: 'new body without model header', input: { modelHeader: null }, message: /model does not match/i },
    { name: 'new header without model body', input: { model: null, modelHeader: WEBSITE_MODEL }, message: /model does not match/i },
    { name: 'new model with old square size', input: { size: '1024x1024' }, message: /size is not supported/i },
    { name: 'old model with new square size', input: { model: 'gpt-image-2', size: '1254x1254' }, message: /size is not supported/i },
    { name: 'provider alias in form body', input: { model: PROVIDER_MODEL, modelHeader: WEBSITE_MODEL }, message: /model is not supported/i },
    { name: 'five reference images for new model', input: { references: 5 }, message: /up to 4 reference images/i },
  ]
  for (const { name, input, message } of cases) {
    await t.test(name, async () => {
      const harness = await runGeneration({ request: generationRequest(input) })
      assert.equal(harness.response.status, 400)
      assert.match((await readFailurePayload(harness.response)).message, message)
      assertRefunded(harness)
      assert.equal(harness.calls.adapter, 1)
      assert.deepEqual(harness.calls.upstream, [])
      assert.deepEqual(harness.events, ['session', 'preflight', 'rate-limit', 'credit-cost', 'reserve', 'refund'])
    })
  }
})

test('Tuzi failures and unusable or incomplete results refund the full two-image reservation once', async (t) => {
  const cases: Array<{ name: string; reply: () => Response | Promise<Response>; message: RegExp }> = [
    { name: 'provider HTTP error', reply: () => Response.json({ error: { message: 'Fixture provider failure' } }, { status: 500 }), message: /fixture provider failure/i },
    { name: 'empty provider result', reply: () => Response.json({ data: [] }), message: /no usable image/i },
    { name: 'unusable provider URL', reply: () => Response.json({ data: [{ url: 'http://cdn.example.com/unsafe.png' }] }), message: /no usable image/i },
    { name: 'only one of two requested images', reply: () => Response.json({ data: [{ url: 'https://cdn.example.com/one.png' }] }), message: /requested number of images/i },
    { name: 'provider transport error', reply: async () => { throw new Error('Fixture offline') }, message: /unable to reach/i },
  ]
  for (const { name, reply, message } of cases) {
    await t.test(name, async () => {
      const harness = await runGeneration({ providerReply: reply })
      assert.equal(harness.response.status, 502)
      assert.match((await readFailurePayload(harness.response)).message, message)
      assertRefunded(harness)
      assert.equal(harness.calls.upstream.length, 1)
      assert.equal(harness.calls.upstream[0]?.body.model, PROVIDER_MODEL)
      assert.equal(harness.calls.upstream[0]?.body.n, 2)
      assert.deepEqual(harness.events, ['session', 'preflight', 'rate-limit', 'credit-cost', 'reserve', 'provider', 'refund'])
    })
  }
})

test('legacy model-less clients retain the old provider model and the same five-credit unit price', async () => {
  const harness = await runGeneration({ request: generationRequest({ model: null, modelHeader: null, size: null }) })
  assert.equal(harness.response.status, 200)
  assert.deepEqual(harness.calls.reserves, [{ userId: USER_ID, credits: 10 }])
  assert.equal(harness.calls.upstream[0]?.body.model, 'gpt-image-2')
  assert.equal(harness.calls.upstream[0]?.body.size, '1024x1024')
  assert.equal(harness.calls.upstream[0]?.body.quality, 'medium')
  assert.deepEqual(harness.calls.settlements, [RESERVATION_ID])
  assert.deepEqual(harness.calls.refunds, [])
  assert.equal(harness.balance, 10)
})
