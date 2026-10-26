import assert from 'node:assert/strict'
import test from 'node:test'
import { getRequestedImageCreditCost, generateTuziImage, preflightImageGenerationRequest } from '../scripts/tuzi-image.mjs'
import { protectImageGeneration } from '../src/lib/protected-image-generation'
import { protectVideoGenerationStart } from '../src/lib/protected-video-generation'
import { getCreditBalanceResponse } from '../src/lib/credit-balance-response'

test('both current image models charge one credit for each requested output', () => {
  for (const model of ['gpt-image-2', 'gpt-image-2-5-1k']) {
    const request = new Request('https://seedance3-pro.com/api/images/generate', {
      headers: { 'x-seedance-image-model': model, 'x-seedance-image-quantity': '3' },
    })
    assert.equal(getRequestedImageCreditCost(request), 3)
  }
})

function imageStore() {
  let remaining = 20
  let reserved = 0
  let settled = 0
  const options: unknown[] = []
  return {
    options,
    get settled() { return settled },
    async reserve(_id: string, credits: number, option?: unknown) {
      options.push(option)
      reserved = credits
      remaining -= credits
      return { id: 'reservation', remainingCredits: remaining }
    },
    async settle(_id: string, fulfilled = reserved) {
      settled = fulfilled
      remaining += reserved - fulfilled
    },
    async refund() { remaining += reserved; return { remainingCredits: remaining } },
    async getBalance() { return remaining },
  }
}

test('partial image delivery charges only delivered outputs', async () => {
  const store = imageStore()
  const response = await protectImageGeneration({
    request: new Request('https://seedance3-pro.com/api/images/generate'),
    getSession: async () => ({ user: { id: 'user' } }),
    getCreditCost: () => 3,
    creditStore: store,
    generate: async () => Response.json({
      success: true, image: { url: 'https://images.example/a.png' },
      images: [{ url: 'https://images.example/a.png' }],
    }, { headers: { 'x-seedance-validated-image-count': '1' } }),
  })
  assert.equal(response.status, 200)
  assert.equal(store.settled, 1)
  assert.equal(response.headers.get('x-seedance-credit-cost'), '1')
  assert.equal(response.headers.get('x-seedance-credit-remaining'), '19')
})

test('an exhausted supplier budget returns an actionable error without generating', async () => {
  let generated = false
  const response = await protectImageGeneration({
    request: new Request('https://seedance3-pro.com/api/images/generate'),
    getSession: async () => ({ user: { id: 'user' } }),
    creditStore: {
      ...imageStore(),
      async reserve() { throw Object.assign(new Error('budget'), { code: 'FREE_BUDGET_EXCEEDED' }) },
    },
    generate: async () => { generated = true; return Response.json({}) },
  })
  assert.equal(response.status, 402)
  assert.equal((await response.json() as { code: string }).code, 'FREE_BUDGET_EXCEEDED')
  assert.equal(generated, false)
})

test('image paid-only continuation requires an explicit request header', async () => {
  const store = imageStore()
  await protectImageGeneration({
    request: new Request('https://seedance3-pro.com/api/images/generate', {
      headers: { 'x-seedance-credit-source': 'paid' },
    }),
    getSession: async () => ({ user: { id: 'user' } }),
    creditStore: store,
    generate: async () => Response.json({ success: true, image: { url: 'https://images.example/a.png' } }),
  })
  assert.equal((store.options[0] as { paidOnly?: boolean })?.paidOnly, true)
})

test('video budget error never submits to supplier', async () => {
  let generated = false
  const response = await protectVideoGenerationStart({
    request: new Request('https://seedance3-pro.com/api/videos/generate'),
    getSession: async () => ({ user: { id: 'user' } }),
    preflight: async () => ({ ok: true, payload: { prompt: 'a scene', duration: 5, resolution: '768p', aspectRatio: '16:9' } }),
    taskStore: {
      reserveAndCreate: async () => { throw Object.assign(new Error('budget'), { code: 'FREE_BUDGET_EXCEEDED' }) },
    } as never,
    submit: async () => { generated = true; return { providerTaskId: 'unused' } },
  })
  assert.equal(response.status, 402)
  assert.equal((await response.json() as { code: string }).code, 'FREE_BUDGET_EXCEEDED')
  assert.equal(generated, false)
})

test('balance response exposes separate daily and purchased balances', async () => {
  const response = await getCreditBalanceResponse({
    request: new Request('https://seedance3-pro.com/api/credits/balance'),
    getSession: async () => ({ user: { id: 'user' } }),
    getBalance: async () => 503,
    getBreakdown: async () => ({ remaining: 503, dailyRemaining: 3, paidRemaining: 500 }),
  } as Parameters<typeof getCreditBalanceResponse>[0])
  const body = await response.json() as { credits: { dailyRemaining: number; paidRemaining: number; generationCost: number } }
  assert.equal(body.credits.dailyRemaining, 3)
  assert.equal(body.credits.paidRemaining, 500)
  assert.equal(body.credits.generationCost, 1)
})

test('provider partial batch is delivered for per-output settlement', async () => {
  const images = await generateTuziImage({
    model: 'gpt-image-2-5-1k', prompt: 'test', quantity: 3, referenceImages: [], image: undefined, size: '1254x1254',
  }, {
    apiKey: 'fixture', fetchImpl: async () => Response.json({ data: [{ url: 'https://images.example/one.png' }] }),
  })
  assert.equal(images.length, 1)
})

test('full preflight rejects invalid image size before credit/cost reservation', async () => {
  const body = new FormData()
  body.set('prompt', 'test')
  body.set('size', 'unpriced-4k')
  const request = new Request('https://seedance3-pro.com/api/images/generate', { method: 'POST', body })
  const response = await preflightImageGenerationRequest(request, {
    TUZI_API_KEY: 'fixture',
    IMAGE_RATE_LIMITER: { limit: async () => ({ success: true }) },
  }, { validateBody: true })
  assert.equal(response?.status, 400)
})
