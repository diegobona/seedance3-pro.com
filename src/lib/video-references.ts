const MAX_BYTES = 10 * 1024 * 1024
const TTL_MS = 24 * 60 * 60 * 1000
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

function error(status: number, message: string) {
  return Response.json({ success: false, message }, { status, headers: { 'cache-control': 'no-store' } })
}

function isFresh(metadata: Record<string, string> | undefined, now: number) {
  return Number(metadata?.expiresAt) > now
}

function matchesImageType(bytes: Uint8Array, type: string) {
  if (type === 'image/png') return [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)
  if (type === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  return new TextDecoder().decode(bytes.subarray(0, 4)) === 'RIFF'
    && new TextDecoder().decode(bytes.subarray(8, 12)) === 'WEBP'
}

export async function uploadVideoReference(request: Request, {
  getUserId, bucket, limiter, now = Date.now(),
}: {
  getUserId: () => Promise<string | undefined>
  bucket?: R2Bucket
  limiter?: { limit(input: { key: string }): Promise<{ success: boolean }> }
  now?: number
}) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return error(403, 'Cross-site upload is not allowed.')
  const userId = await getUserId()
  if (!userId) return error(401, 'Log in to upload reference images.')
  if (!bucket || !limiter) return error(503, 'Reference uploads are temporarily unavailable.')
  const type = request.headers.get('content-type')?.split(';')[0].trim() || ''
  if (!MIME_TYPES.has(type)) return error(415, 'Choose a PNG, JPEG or WebP image.')
  const declaredSize = Number(request.headers.get('content-length'))
  if (declaredSize > MAX_BYTES) return error(413, 'Each reference image must be 10 MB or less.')
  if (!(await limiter.limit({ key: `video-reference:${userId}` })).success) {
    return error(429, 'Too many uploads. Wait a minute and try again.')
  }
  const reader = request.body?.getReader()
  if (!reader) return error(400, 'Image is empty.')
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > MAX_BYTES) {
        await reader.cancel()
        return error(413, 'Each reference image must be 10 MB or less.')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  if (length < 12 || !matchesImageType(bytes, type)) return error(400, 'The file is not a valid PNG, JPEG or WebP image.')
  const id = crypto.randomUUID()
  const expiresAt = now + TTL_MS
  await bucket.put(`references/${id}`, bytes, {
    httpMetadata: { contentType: type },
    customMetadata: { userId, expiresAt: String(expiresAt) },
  })
  return Response.json({ success: true, id, expiresAt }, { status: 201, headers: { 'cache-control': 'no-store' } })
}

// Opaque, short-lived URLs allow the generation provider to fetch
// submitted images without exposing session credentials. Listing is never public.
export async function serveVideoReference(request: Request, bucket?: R2Bucket, now = Date.now()) {
  const id = new URL(request.url).searchParams.get('id') || ''
  if (!bucket || !ID_PATTERN.test(id)) return new Response(null, { status: 404 })
  const object = await bucket.get(`references/${id}`)
  if (!object || !isFresh(object.customMetadata, now)) return new Response(null, { status: 404 })
  return new Response(request.method === 'HEAD' ? null : object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType || 'application/octet-stream',
      'content-length': String(object.size),
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow, noarchive',
    },
  })
}

export async function resolveVideoReferences(ids: string[], userId: string, bucket?: R2Bucket, now = Date.now()) {
  if (!bucket) throw new Error('Reference uploads are unavailable.')
  const urls: string[] = []
  for (const id of ids) {
    if (!ID_PATTERN.test(id)) throw new Error('Invalid reference image.')
    const object = await bucket.head(`references/${id}`)
    if (!object || object.customMetadata?.userId !== userId || !isFresh(object.customMetadata, now + 60 * 60 * 1000)) {
      throw new Error('A reference image expired or is unavailable. Please upload it again.')
    }
    urls.push(`https://seedance3-pro.com/api/videos/references?id=${id}`)
  }
  return urls
}
