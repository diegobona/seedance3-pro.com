import assert from 'node:assert/strict'
import test from 'node:test'
import { protectImageGeneration } from '../src/lib/protected-image-generation'

const request = new Request('https://seedance3-pro.com/api/images/generate', { method: 'POST' })

type CreditStoreOptions = {
  remainingCredits?: number
  currentBalance?: number
  canReserve?: boolean
  settleFailures?: number
  refundFailures?: number
  balanceFailures?: number
}

function creditStore(options: CreditStoreOptions = {}) {
  const {
    remainingCredits = 10,
    currentBalance = remainingCredits,
    canReserve = true,
    settleFailures = 0,
    refundFailures = 0,
    balanceFailures = 0,
  } = options
  const calls = { reserve: 0, reserveAmounts: [] as number[], settle: 0, refund: 0, getBalance: 0 }
  return {
    calls,
    store: {
      reserve: async (_userId: string, amount: number) => {
        calls.reserve += 1
        calls.reserveAmounts.push(amount)
        return canReserve ? { id: 'reservation-1', remainingCredits } : null
      },
      settle: async () => {
        calls.settle += 1
        if (calls.settle <= settleFailures) throw new Error('Transient settle failure.')
      },
      refund: async () => {
        calls.refund += 1
        if (calls.refund <= refundFailures) throw new Error('Transient refund failure.')
        return { remainingCredits: remainingCredits + 5 }
      },
      getBalance: async () => {
        calls.getBalance += 1
        if (calls.getBalance <= balanceFailures) throw new Error('Transient balance failure.')
        return currentBalance
      },
    },
  }
}

test('multi-image generation reserves five credits per requested image', async () => {
  const credits = creditStore({ remainingCredits: 15, currentBalance: 15 })
  const response = await protectImageGeneration({
    request,
    getSession: async () => ({ user: { id: 'user-1' } }),
    creditStore: credits.store,
    getCreditCost: async () => 15,
    generate: async () => Response.json({
      success: true,
      image: { dataUrl: 'data:image/png;base64,iVBORw0KGgo=' },
      images: [
        { dataUrl: 'data:image/png;base64,iVBORw0KGgo=' },
        { dataUrl: 'data:image/png;base64,iVBORw0KGgo=' },
        { dataUrl: 'data:image/png;base64,iVBORw0KGgo=' },
      ],
    }),
  })

  assert.equal(response.status, 200)
  assert.deepEqual(credits.calls.reserveAmounts, [15])
  assert.equal(response.headers.get('x-seedance-credit-cost'), '15')
})

test('multi-image generation reports the dynamic cost when credits are insufficient', async () => {
  let providerCalls = 0
  const credits = creditStore({ currentBalance: 10, canReserve: false })
  const response = await protectImageGeneration({
    request,
    getSession: async () => ({ user: { id: 'user-1' } }),
    creditStore: credits.store,
    getCreditCost: () => 15,
    generate: async () => {
      providerCalls += 1
      return Response.json({ success: true })
    },
  })

  assert.equal(response.status, 402)
  assert.equal(providerCalls, 0)
  assert.deepEqual(credits.calls.reserveAmounts, [15])
  assert.equal(response.headers.get('x-seedance-credit-cost'), '15')
  const body = (await response.json()) as { message: string }
  assert.match(body.message, /15 credits/i)
})

test('anonymous image generation is rejected before provider work', async () => {
  let providerCalls = 0
  const credits = creditStore()
  const options = {
    request,
    getSession: async () => null,
    creditStore: credits.store,
    generate: async () => {
      providerCalls += 1
      return new Response(null, { status: 200 })
    },
  }
  const response = await protectImageGeneration(options)

  assert.equal(response.status, 401)
  assert.equal(providerCalls, 0)
  assert.equal(credits.calls.reserve, 0)
  assert.deepEqual(await response.json(), {
    success: false,
    code: 'AUTH_REQUIRED',
    message: 'Log in to generate images.',
  })
})

test('insufficient credits reject generation before provider work', async () => {
  let providerCalls = 0
  const credits = creditStore({ remainingCredits: 0, canReserve: false })
  const options = {
    request,
    getSession: async () => ({ user: { id: 'user-1' } }),
    creditStore: credits.store,
    generate: async () => {
      providerCalls += 1
      return new Response(null, { status: 200 })
    },
  }

  const response = await protectImageGeneration(options)

  assert.equal(response.status, 402)
  assert.equal(providerCalls, 0)
  assert.equal(credits.calls.reserve, 1)
  assert.equal(response.headers.get('x-seedance-credit-cost'), '5')
  assert.equal(response.headers.get('x-seedance-credit-remaining'), '0')
  assert.deepEqual(await response.json(), {
    success: false,
    code: 'INSUFFICIENT_CREDITS',
    message: 'Your free trial is complete. More credits and ultra-affordable creator plans are coming soon.',
    credits: { cost: 5, remaining: 0 },
  })
})

test('request preflight rejects invalid envelopes before reserving credits', async () => {
  let providerCalls = 0
  const credits = creditStore()
  const response = await protectImageGeneration({
    request,
    getSession: async () => ({ user: { id: 'user-1' } }),
    creditStore: credits.store,
    preflight: async () => Response.json({ success: false, message: 'Too large.' }, { status: 413 }),
    generate: async () => {
      providerCalls += 1
      return Response.json({ success: true })
    },
  })

  assert.equal(response.status, 413)
  assert.equal(credits.calls.reserve, 0)
  assert.equal(providerCalls, 0)
})

test('successful image generation settles five credits and exposes the remaining balance', async () => {
  let providerCalls = 0
  const credits = creditStore({ remainingCredits: 10 })
  const options = {
    request,
    getSession: async () => ({ user: { id: 'user-1' } }),
    creditStore: credits.store,
    generate: async (received: Request) => {
      providerCalls += 1
      assert.equal(received, request)
      return Response.json({ success: true, image: { dataUrl: 'data:image/png;base64,iVBORw0KGgo=' } })
    },
  }
  const response = await protectImageGeneration(options)

  assert.equal(response.status, 200)
  assert.equal(providerCalls, 1)
  assert.equal(credits.calls.reserve, 1)
  assert.equal(credits.calls.settle, 1)
  assert.equal(credits.calls.refund, 0)
  assert.equal(response.headers.get('x-seedance-credit-cost'), '5')
  assert.equal(response.headers.get('x-seedance-credit-remaining'), '10')
})

test('credit settlement retries once after a transient database failure', async () => {
  const credits = creditStore({ remainingCredits: 10, settleFailures: 1 })
  const response = await protectImageGeneration({
    request,
    getSession: async () => ({ user: { id: 'user-1' } }),
    creditStore: credits.store,
    generate: async () => Response.json({ success: true, image: { dataUrl: 'data:image/png;base64,iVBORw0KGgo=' } }),
  })

  assert.equal(response.status, 200)
  assert.equal(credits.calls.settle, 2)
  assert.equal(credits.calls.refund, 0)
})

test('successful responses refresh the balance after settlement', async () => {
  const credits = creditStore({ remainingCredits: 10, currentBalance: 5 })
  const response = await protectImageGeneration({
    request,
    getSession: async () => ({ user: { id: 'user-1' } }),
    creditStore: credits.store,
    generate: async () => Response.json({ success: true, image: { dataUrl: 'data:image/png;base64,iVBORw0KGgo=' } }),
  })

  assert.equal(credits.calls.getBalance, 1)
  assert.equal(response.headers.get('x-seedance-credit-remaining'), '5')
})

test('a failed post-settlement balance refresh never discards the paid image', async () => {
  const credits = creditStore({ remainingCredits: 10, currentBalance: 5, balanceFailures: 2 })
  const response = await protectImageGeneration({
    request,
    getSession: async () => ({ user: { id: 'user-1' } }),
    creditStore: credits.store,
    generate: async () => Response.json({ success: true, image: { dataUrl: 'data:image/png;base64,iVBORw0KGgo=' } }),
  })

  assert.equal(response.status, 200)
  assert.equal(credits.calls.getBalance, 2)
  assert.equal(response.headers.get('x-seedance-credit-remaining'), '10')
  const body = (await response.json()) as { success: boolean }
  assert.equal(body.success, true)
})

test('failed provider responses refund credits and expose the restored balance', async () => {
  const credits = creditStore({ remainingCredits: 10 })
  const options = {
    request,
    getSession: async () => ({ user: { id: 'user-1' } }),
    creditStore: credits.store,
    generate: async () => Response.json({ success: false, message: 'Provider failed.' }, { status: 502 }),
  }

  const response = await protectImageGeneration(options)

  assert.equal(response.status, 502)
  assert.equal(credits.calls.settle, 0)
  assert.equal(credits.calls.refund, 1)
  assert.equal(response.headers.get('x-seedance-credit-cost'), '5')
  assert.equal(response.headers.get('x-seedance-credit-remaining'), '15')
})

test('unusable successful provider responses are refunded instead of billed', async () => {
  const credits = creditStore({ remainingCredits: 10 })
  const response = await protectImageGeneration({
    request,
    getSession: async () => ({ user: { id: 'user-1' } }),
    creditStore: credits.store,
    generate: async () => Response.json({ success: false, message: 'No image was returned.' }),
  })

  assert.equal(response.status, 502)
  assert.equal(credits.calls.settle, 0)
  assert.equal(credits.calls.refund, 1)
  assert.equal(response.headers.get('x-seedance-credit-remaining'), '15')
  assert.deepEqual(await response.json(), {
    success: false,
    code: 'INVALID_GENERATION_RESULT',
    message: 'Image generation did not return a usable image. Your credits were refunded.',
  })
})

test('malformed base64 provider responses are refunded instead of billed', async () => {
  const credits = creditStore({ remainingCredits: 10 })
  const response = await protectImageGeneration({
    request,
    getSession: async () => ({ user: { id: 'user-1' } }),
    creditStore: credits.store,
    generate: async () => Response.json({
      success: true,
      image: { dataUrl: 'data:image/png;base64,abcde' },
    }),
  })

  assert.equal(response.status, 502)
  assert.equal(credits.calls.settle, 0)
  assert.equal(credits.calls.refund, 1)
})

test('thrown provider errors refund credits and return the restored balance', async () => {
  const credits = creditStore({ remainingCredits: 10 })
  const options = {
    request,
    getSession: async () => ({ user: { id: 'user-1' } }),
    creditStore: credits.store,
    generate: async () => {
      throw new Error('Provider disconnected.')
    },
  }

  const response = await protectImageGeneration(options)

  assert.equal(response.status, 502)
  assert.equal(credits.calls.settle, 0)
  assert.equal(credits.calls.refund, 1)
  assert.equal(response.headers.get('x-seedance-credit-cost'), '5')
  assert.equal(response.headers.get('x-seedance-credit-remaining'), '15')
  assert.deepEqual(await response.json(), {
    success: false,
    code: 'GENERATION_FAILED',
    message: 'Image generation failed. Your credits were refunded.',
  })
})

test('credit refunds retry once after a transient database failure', async () => {
  const credits = creditStore({ remainingCredits: 10, refundFailures: 1 })
  const response = await protectImageGeneration({
    request,
    getSession: async () => ({ user: { id: 'user-1' } }),
    creditStore: credits.store,
    generate: async () => {
      throw new Error('Provider disconnected.')
    },
  })

  assert.equal(response.status, 502)
  assert.equal(credits.calls.refund, 2)
  assert.equal(response.headers.get('x-seedance-credit-remaining'), '15')
})
