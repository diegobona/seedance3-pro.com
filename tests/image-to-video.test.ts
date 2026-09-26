import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareImageAnimation, transferGeneratedImage } from '../src/lib/image-to-video'
import { prepareImageForVideo, loadVideoReference } from '../app/image-to-video.mjs'
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])
const now = Date.now()
function harness() {
  const saved = new Map<string, { size: number; text: () => Promise<string>; customMetadata: Record<string, string> }>()
  const bucket = {
    put: async (key: string, value: string | Uint8Array, options: { customMetadata: Record<string, string> }) => {
      saved.set(key, { size: value.length, text: async () => String(value), ...options })
    },
    get: async (key: string) => saved.get(key) || null,
  } as unknown as R2Bucket
  return { bucket, saved }
}

test('each generated image receives its own user-bound source id without changing the original image', async () => {
  const h = harness()
  const images = [{ url: 'https://images.example/one.png' }, { url: 'https://images.example/two.png' }]
  const ready = await prepareImageAnimation(images, 'owner', h.bucket, now)
  assert.notEqual(ready[0].animateId, ready[1].animateId)
  assert.deepEqual(ready.map((i) => i.url), images.map((i) => i.url))
  assert.equal(h.saved.get(`references/sources/${ready[0].animateId}`)?.customMetadata.userId, 'owner')
  const failedBucket = { put: async () => { throw new Error('storage offline') } } as unknown as R2Bucket
  assert.deepEqual(await prepareImageAnimation(images, 'owner', failedBucket), images)
})

test('transfer requires authentication, ownership and freshness before fetching; saves real image bytes', async () => {
  const h = harness()
  const [image] = await prepareImageAnimation([{ url: 'https://images.example/one.png' }], 'owner', h.bucket, now)
  const request = () => new Request(`https://seedance3-pro.com/api/images/animate?image=${image.animateId}`, { method: 'POST' })
  let fetches = 0
  const options = {
    bucket: h.bucket, getUserId: async () => 'owner', now,
    limiter: { limit: async () => ({ success: true }) },
    fetchImpl: (async (_url: string | URL | Request, init?: RequestInit) => {
      fetches++
      assert.equal(init?.redirect, 'error')
      return new Response(png, { headers: { 'content-type': 'image/png' } })
    }) as typeof fetch,
  }
  assert.equal((await transferGeneratedImage(request(), { ...options, getUserId: async () => undefined })).status, 401)
  assert.equal((await transferGeneratedImage(request(), { ...options, getUserId: async () => 'other' })).status, 404)
  assert.equal((await transferGeneratedImage(request(), { ...options, now: now + 86400_001 })).status, 404)
  assert.equal(fetches, 0)
  const response = await transferGeneratedImage(request(), options)
  assert.equal(response.status, 201)
  const result = await response.json() as { id: string }
  assert.equal(h.saved.get(`references/${result.id}`)?.customMetadata.userId, 'owner')
  assert.equal(fetches, 1)
})

test('transfer rejects cross-origin and arbitrary URL input', async () => {
  const h = harness()
  const options = { bucket: h.bucket, getUserId: async () => 'owner', limiter: { limit: async () => ({ success: true }) } }
  assert.equal((await transferGeneratedImage(new Request('https://seedance3-pro.com/api/images/animate?image=https://private.example', { method: 'POST' }), options)).status, 400)
  assert.equal((await transferGeneratedImage(new Request('https://seedance3-pro.com/api/images/animate', { method: 'POST', headers: { origin: 'https://other.example' } }), options)).status, 403)
})

test('animate handoff uses the chosen image only, preserves portrait orientation and never submits a video', async () => {
  const sourceId = crypto.randomUUID(), referenceId = crypto.randomUUID()
  const calls: string[] = []
  const url = await prepareImageForVideo({ image: { url: 'https://images.example/one.png', animateId: sourceId }, signal: undefined, width: 1024, height: 1536, fetchImpl: async (input) => {
    const url = String(input)
    calls.push(url)
    return Response.json({ success: true, id: referenceId })
  } })
  assert.deepEqual(calls, [`/api/images/animate?image=${sourceId}`])
  const destination = new URL(url, 'https://seedance3-pro.com')
  assert.equal(destination.pathname, '/app/video/minimax-h3')
  assert.equal(destination.searchParams.get('reference'), referenceId)
  assert.equal(destination.searchParams.get('aspect_ratio'), '9:16')
  assert.equal(destination.searchParams.has('prompt'), false)
})

test('inline image output uploads before navigating; reference hydration returns a file and reports expiry', async () => {
  const id = crypto.randomUUID()
  const calls: string[] = []
  const url = await prepareImageForVideo({ image: { dataUrl: 'data:image/png;base64,test' }, signal: undefined, width: 1024, height: 1024, fetchImpl: async (input) => {
    const url = String(input)
    calls.push(url)
    return url.startsWith('data:') ? new Response(png, { headers: { 'content-type': 'image/png' } }) : Response.json({ success: true, id })
  } })
  assert.equal(calls[1], '/api/videos/references')
  assert.match(url, /aspect_ratio=16%3A9/)
  const file = await loadVideoReference(id, { fetchImpl: async () => new Response(png, { headers: { 'content-type': 'image/png' } }) })
  assert.equal(file.type, 'image/png')
  assert.equal(file.size, png.length)
  await assert.rejects(loadVideoReference(id, { fetchImpl: async () => new Response(null, { status: 404 }) }), /expired/)
})


