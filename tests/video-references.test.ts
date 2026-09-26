import assert from 'node:assert/strict'
import test from 'node:test'
import { uploadVideoReference, serveVideoReference, resolveVideoReferences } from '../src/lib/video-references'

const now = Date.now()
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])
function setup() {
  const objects = new Map<string, { body: Uint8Array; size: number; customMetadata: Record<string, string>; httpMetadata: { contentType: string } }>()
  const bucket = {
    put: async (key: string, body: Uint8Array, options: { customMetadata: Record<string, string>; httpMetadata: { contentType: string } }) => { objects.set(key, { body, size: body.length, ...options }) },
    head: async (key: string) => objects.get(key) || null,
    get: async (key: string) => objects.get(key) || null,
  } as unknown as R2Bucket
  const options = { bucket, getUserId: async () => 'owner', limiter: { limit: async () => ({ success: true }) }, now }
  const request = (body: Uint8Array = png, type = 'image/png') => new Request('https://seedance3-pro.com/api/videos/references', {
    method: 'POST', headers: { 'content-type': type }, body: new Blob([body as BlobPart]),
  })
  return { bucket, options, request, objects }
}

test('reference upload authenticates and validates MIME, signatures and bounded length before storing', async () => {
  const h = setup()
  assert.equal((await uploadVideoReference(h.request(), { ...h.options, getUserId: async () => undefined })).status, 401)
  assert.equal((await uploadVideoReference(h.request(png, 'image/svg+xml'), h.options)).status, 415)
  assert.equal((await uploadVideoReference(h.request(new Uint8Array(20)), h.options)).status, 400)
  assert.equal((await uploadVideoReference(h.request(new Uint8Array(10 * 1024 * 1024 + 1)), h.options)).status, 413)
  assert.equal(h.objects.size, 0)
})

test('uploaded references are ordered, owned, expiring and fetched without account credentials', async () => {
  const h = setup()
  const first = await (await uploadVideoReference(h.request(), h.options)).json() as { id: string }
  const second = await (await uploadVideoReference(h.request(), h.options)).json() as { id: string }
  const urls = await resolveVideoReferences([second.id, first.id], 'owner', h.bucket, now)
  assert.equal(new URL(urls[0]).searchParams.get('id'), second.id)
  await assert.rejects(resolveVideoReferences([first.id], 'another-user', h.bucket, now), /unavailable/)
  await assert.rejects(resolveVideoReferences([first.id], 'owner', h.bucket, now + 24 * 3600_000), /expired/)
  const read = await serveVideoReference(new Request(urls[1]), h.bucket, now)
  assert.equal(read.status, 200)
  assert.equal(read.headers.get('content-type'), 'image/png')
  assert.deepEqual(new Uint8Array(await read.arrayBuffer()), png)
  assert.equal((await serveVideoReference(new Request(urls[1]), h.bucket, now + 24 * 3600_000)).status, 404)
})

test('upload rejects cross-origin and rate-limited requests before storing', async () => {
  const h = setup()
  const cross = h.request()
  cross.headers.set('origin', 'https://other.example')
  assert.equal((await uploadVideoReference(cross, h.options)).status, 403)
  assert.equal((await uploadVideoReference(h.request(), { ...h.options, limiter: { limit: async () => ({ success: false }) } })).status, 429)
  assert.equal(h.objects.size, 0)
})
