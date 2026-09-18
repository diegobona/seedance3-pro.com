import assert from 'node:assert/strict'
import test from 'node:test'
import { protectImageGeneration } from '../src/lib/protected-image-generation'

const request = new Request('https://seedance3-pro.com/api/images/generate', { method: 'POST' })

test('anonymous image generation is rejected before provider work', async () => {
  let providerCalls = 0
  const response = await protectImageGeneration({
    request,
    getSession: async () => null,
    generate: async () => {
      providerCalls += 1
      return new Response(null, { status: 200 })
    },
  })

  assert.equal(response.status, 401)
  assert.equal(providerCalls, 0)
  assert.deepEqual(await response.json(), {
    success: false,
    code: 'AUTH_REQUIRED',
    message: 'Log in to generate images.',
  })
})

test('authenticated image generation reaches the existing provider adapter', async () => {
  let providerCalls = 0
  const response = await protectImageGeneration({
    request,
    getSession: async () => ({ user: { id: 'user-1' } }),
    generate: async (received) => {
      providerCalls += 1
      assert.equal(received, request)
      return Response.json({ success: true, image: { dataUrl: 'data:image/png;base64,aW1hZ2U=' } })
    },
  })

  assert.equal(response.status, 200)
  assert.equal(providerCalls, 1)
})
