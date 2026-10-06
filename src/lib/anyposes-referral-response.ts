import { createHash, timingSafeEqual } from 'node:crypto'
import type { ReferralVisit } from '../db/referral-visits'

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'cache-control': 'no-store' } })
}
function unavailable() {
  return json({ success: false, message: 'Referral statistics are temporarily unavailable.' }, 503)
}
function sameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || request.headers.get('sec-fetch-site') === 'cross-site') return false
  try { return new URL(origin).origin === new URL(request.url).origin } catch { return false }
}

async function boundedJson(request: Request) {
  const reader = request.body?.getReader()
  if (!reader) return null
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > 1024) { await reader.cancel(); throw new RangeError('Payload too large') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown
}

function validVisit(value: unknown): value is ReferralVisit {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  if (Object.keys(value).some(key => !['visitorId', 'visitId', 'entryPath'].includes(key))) return false
  const visit = value as Record<string, unknown>
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return typeof visit.visitorId === 'string' && uuid.test(visit.visitorId)
    && typeof visit.visitId === 'string' && uuid.test(visit.visitId)
    && visit.entryPath === '/app/image/gpt-image-2'
}

export async function recordReferralResponse(
  request: Request,
  record: (visit: ReferralVisit) => Promise<void>,
) {
  if (!sameOrigin(request)) return json({ success: false }, 403)
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '')) {
    return json({ success: false }, 415)
  }
  let visit: unknown
  try { visit = await boundedJson(request) } catch (error) {
    return json({ success: false }, error instanceof RangeError ? 413 : 400)
  }
  if (!validVisit(visit)) return json({ success: false }, 400)
  try {
    await record({ ...visit, visitorId: visit.visitorId.toLowerCase(), visitId: visit.visitId.toLowerCase() })
    return json({ success: true })
  } catch (error) {
    console.error(JSON.stringify({ event: 'referral_record_error', error: error instanceof Error ? error.name : 'UnknownError' }))
    return unavailable()
  }
}

export async function getReferralStatsResponse(
  request: Request,
  configuredToken: string,
  getStats: () => Promise<object>,
) {
  const token = configuredToken.trim()
  if (!token) return unavailable()
  const supplied = request.headers.get('x-analytics-token') ?? ''
  if (!supplied || supplied.length > 256 || !timingSafeEqual(
    createHash('sha256').update(token).digest(), createHash('sha256').update(supplied).digest(),
  )) return json({ success: false, message: 'Invalid analytics token.' }, 401)
  try { return json({ success: true, ...await getStats() }) } catch (error) {
    console.error(JSON.stringify({ event: 'referral_stats_error', error: error instanceof Error ? error.name : 'UnknownError' }))
    return unavailable()
  }
}

export const recordAnyposesReferralResponse = recordReferralResponse
export const getAnyposesReferralStatsResponse = getReferralStatsResponse
