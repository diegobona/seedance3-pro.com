import { uploadVideoReference } from './video-references'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
type GeneratedImage = { url?: string; dataUrl?: string; animateId?: string }

function safeSource(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port
      && url.hostname.includes('.') && !/^[\d.]+$/.test(url.hostname)
      && !url.hostname.endsWith('.local') && !url.hostname.endsWith('.internal')
      && url.href.length < 8192
  } catch { return false }
}

// Store only provider-returned URLs, bound to the generating user. The transfer
// endpoint never accepts a client-supplied remote URL.
export async function prepareImageAnimation(images: GeneratedImage[], userId: string, bucket?: R2Bucket, now = Date.now()) {
  const prepared: GeneratedImage[] = []
  for (const image of images) {
    if (!bucket || !userId || !image.url || !safeSource(image.url)) { prepared.push(image); continue }
    try {
      const id = crypto.randomUUID()
      await bucket.put(`references/sources/${id}`, image.url, {
        customMetadata: { userId, expiresAt: String(now + 24 * 3600_000) },
      })
      prepared.push({ ...image, animateId: id })
    } catch {
      // A transfer preparation error must not turn a successful paid image into
      // a failed generation. The client can still download/upload the image.
      prepared.push(image)
    }
  }
  return prepared
}

export async function transferGeneratedImage(request: Request, {
  getUserId, bucket, limiter, fetchImpl = fetch, now = Date.now(),
}: {
  getUserId: () => Promise<string | undefined>
  bucket?: R2Bucket
  limiter?: { limit(input: { key: string }): Promise<{ success: boolean }> }
  fetchImpl?: typeof fetch
  now?: number
}) {
  const fail = (status: number, message: string) => Response.json({ success: false, message }, {
    status, headers: { 'cache-control': 'no-store' },
  })
  const url = new URL(request.url)
  const origin = request.headers.get('origin')
  if (origin && origin !== url.origin) return fail(403, 'Cross-site transfer is not allowed.')
  const userId = await getUserId()
  if (!userId) return fail(401, 'Log in to animate this image.')
  if (!bucket || !limiter) return fail(503, 'Image transfer is temporarily unavailable.')
  const id = url.searchParams.get('image') || ''
  if (!UUID.test(id)) return fail(400, 'Invalid generated image.')
  if (!(await limiter.limit({ key: `animate-image:${userId}` })).success) return fail(429, 'Please wait a minute and try again.')
  const source = await bucket.get(`references/sources/${id}`)
  if (!source || source.size > 8192 || source.customMetadata?.userId !== userId || !(Number(source.customMetadata?.expiresAt) > now)) {
    return fail(404, 'This image is unavailable. Save it and upload it in H3 instead.')
  }
  const sourceUrl = await source.text()
  if (!safeSource(sourceUrl)) return fail(400, 'Invalid image source.')
  let image: Response
  try {
    image = await fetchImpl(sourceUrl, { redirect: 'error', signal: AbortSignal.timeout(30_000) })
  } catch { return fail(502, 'Could not retrieve this image. Please try again or save and upload it in H3.') }
  if (!image.ok || !image.body) return fail(502, 'The image link expired. Save and upload the image in H3 instead.')
  return uploadVideoReference(new Request(`${url.origin}/api/videos/references`, {
    method: 'POST', body: image.body,
    headers: {
      'content-type': image.headers.get('content-type') || 'application/octet-stream',
      ...(image.headers.has('content-length') ? { 'content-length': image.headers.get('content-length')! } : {}),
    }, duplex: 'half',
  } as RequestInit), { getUserId: async () => userId, bucket, limiter, now })
}
