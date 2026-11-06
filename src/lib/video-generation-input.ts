import { preflightVideoGenerationRequest } from '../../scripts/autodl-video.mjs'
import type { VideoGenerationPreflight } from './protected-video-generation'

// A single reference travels with its generation request, under the same one-use
// Turnstile check. Multiple paid references retain the existing upload flow.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_BODY_BYTES = MAX_IMAGE_BYTES + 32 * 1024
const MAX_PAYLOAD_BYTES = 16 * 1024
type Input = VideoGenerationPreflight & { reference?: File }

function invalid(message: string, status = 400): Input {
  return { ok: false, response: Response.json({ success: false, code: 'INVALID_VIDEO_REQUEST', message }, {
    status, headers: { 'cache-control': 'no-store' },
  }) }
}

export async function readVideoGenerationInput(request: Request): Promise<Input> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'multipart/form-data') {
    return await preflightVideoGenerationRequest(request) as VideoGenerationPreflight
  }
  const declared = request.headers.get('content-length')
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)) {
    return invalid('Reference request is too large.', 413)
  }
  const reader = request.body?.getReader()
  if (!reader) return invalid('Image is empty.')
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BODY_BYTES) {
        await reader.cancel()
        return invalid('Each reference image must be 10 MB or less.', 413)
      }
      chunks.push(new Uint8Array(value))
    }
  } finally { reader.releaseLock() }
  try {
    const form = await new Response(new Blob(chunks), { headers: { 'content-type': request.headers.get('content-type')! } }).formData()
    if ([...form.keys()].length !== 2 || form.getAll('payload').length !== 1 || form.getAll('reference').length !== 1) {
      return invalid('Provide one payload and one reference image.')
    }
    const raw = form.get('payload')
    const reference = form.get('reference')
    if (typeof raw !== 'string' || new TextEncoder().encode(raw).byteLength > MAX_PAYLOAD_BYTES) return invalid('Invalid video payload.')
    if (!reference || typeof reference === 'string' || !reference.size || reference.size > MAX_IMAGE_BYTES
      || !['image/png', 'image/jpeg', 'image/webp'].includes(reference.type)) {
      return invalid('Choose a PNG, JPEG or WebP image, up to 10 MB.')
    }
    const payload = JSON.parse(raw)
    if (!payload || Array.isArray(payload) || typeof payload !== 'object' || 'referenceImageIds' in payload) {
      return invalid('Do not mix an uploaded reference with reference IDs.')
    }
    // This server-generated ID only selects/validates the reference workflow.
    // It is replaced by the actual owned R2 upload before credit reservation.
    const validation = await preflightVideoGenerationRequest(new Request(request.url, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...payload, referenceImageIds: [crypto.randomUUID()] }),
    })) as VideoGenerationPreflight
    return validation.ok ? { ...validation, reference } : validation
  } catch { return invalid('Invalid reference upload.') }
}
