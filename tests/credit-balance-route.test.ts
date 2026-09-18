import assert from 'node:assert/strict'
import test from 'node:test'
import { getCreditBalanceResponse } from '../src/lib/credit-balance-response'

const request = new Request('https://seedance3-pro.com/api/credits/balance')

test('anonymous balance requests are rejected without reading the database', async () => {
  let balanceReads = 0
  const response = await getCreditBalanceResponse({
    request,
    getSession: async () => null,
    getBalance: async () => {
      balanceReads += 1
      return 15
    },
  })

  assert.equal(response.status, 401)
  assert.equal(balanceReads, 0)
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('authenticated balance requests expose trial grant and image cost', async () => {
  const response = await getCreditBalanceResponse({
    request,
    getSession: async () => ({ user: { id: 'user-1' } }),
    getBalance: async (userId) => {
      assert.equal(userId, 'user-1')
      return 15
    },
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), {
    success: true,
    credits: { remaining: 15, generationCost: 5, trialGrant: 15 },
  })
})
