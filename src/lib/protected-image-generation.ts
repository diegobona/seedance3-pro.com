import { GPT_IMAGE_2_CREDIT_COST, type GenerationCreditStore, withCreditHeaders } from './generation-credits'

const TRIAL_COMPLETE_MESSAGE = 'Your free trial is complete. More credits and ultra-affordable creator plans are coming soon.'

type SessionLike = { user: { id: string } } | null

interface ProtectedImageGenerationOptions {
  request: Request
  getSession: (request: Request) => Promise<SessionLike>
  creditStore: GenerationCreditStore
  generate: (request: Request) => Promise<Response>
  getCreditCost?: (request: Request) => number | Promise<number>
  preflight?: (request: Request) => Response | null | Promise<Response | null>
}

async function retryCreditTransition<T>(transition: () => Promise<T>) {
  try {
    return await transition()
  } catch {
    return transition()
  }
}

async function hasUsableImage(response: Response) {
  if (!response.ok || response.status === 204) return false
  const validatedImageCount = Number(response.headers.get('x-seedance-validated-image-count'))
  if (Number.isSafeInteger(validatedImageCount) && validatedImageCount > 0) return true
  const payload = await response.clone().json().catch(() => null) as {
    success?: unknown
    image?: { url?: unknown; dataUrl?: unknown }
    images?: Array<{ url?: unknown; dataUrl?: unknown }>
  } | null
  if (payload?.success !== true || !payload.image) return false
  const images = Array.isArray(payload.images) && payload.images.length
    ? payload.images
    : [payload.image]
  return images.every(isUsableGeneratedImage)
}

function isUsableGeneratedImage(image: { url?: unknown; dataUrl?: unknown }) {
  if (typeof image.url === 'string') {
    try {
      return new URL(image.url).protocol === 'https:'
    } catch {
      return false
    }
  }
  if (typeof image.dataUrl !== 'string') return false
  const match = image.dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([a-z0-9+/]*={0,2})$/i)
  if (!match || match[2].length % 4 !== 0) return false
  let binary: string
  try {
    binary = atob(match[2])
  } catch {
    return false
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  const mime = match[1].toLowerCase()
  if (mime === 'image/png') {
    return bytes.length >= 8
      && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  }
  if (mime === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  return bytes.length >= 12
    && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
}

export async function protectImageGeneration({ request, getSession, creditStore, generate, getCreditCost, preflight }: ProtectedImageGenerationOptions) {
  const session = await getSession(request)
  if (!session?.user?.id) {
    return Response.json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Log in to generate images.',
    }, {
      status: 401,
      headers: { 'cache-control': 'no-store' },
    })
  }

  const preflightResponse = preflight ? await preflight(request) : null
  if (preflightResponse) return preflightResponse

  const requestedCreditCost = getCreditCost ? await getCreditCost(request) : GPT_IMAGE_2_CREDIT_COST
  const creditCost = Number.isSafeInteger(requestedCreditCost) && requestedCreditCost > 0
    ? requestedCreditCost
    : GPT_IMAGE_2_CREDIT_COST

  const reservation = await creditStore.reserve(session.user.id, creditCost)
  if (!reservation) {
    const remainingCredits = await creditStore.getBalance(session.user.id)
    return withCreditHeaders(Response.json({
      success: false,
      code: 'INSUFFICIENT_CREDITS',
      message: remainingCredits === 0
        ? TRIAL_COMPLETE_MESSAGE
        : `You need ${creditCost} credits to generate this image.`,
      credits: { cost: creditCost, remaining: remainingCredits },
    }, {
      status: 402,
      headers: { 'cache-control': 'no-store' },
    }), creditCost, remainingCredits)
  }

  let response: Response
  try {
    response = await generate(request)
  } catch {
    const refunded = await retryCreditTransition(() => creditStore.refund(reservation.id))
    return withCreditHeaders(Response.json({
      success: false,
      code: 'GENERATION_FAILED',
      message: 'Image generation failed. Your credits were refunded.',
    }, {
      status: 502,
      headers: { 'cache-control': 'no-store' },
    }), creditCost, refunded.remainingCredits)
  }

  if (!response.ok) {
    const refunded = await retryCreditTransition(() => creditStore.refund(reservation.id))
    return withCreditHeaders(response, creditCost, refunded.remainingCredits)
  }

  if (!await hasUsableImage(response)) {
    const refunded = await retryCreditTransition(() => creditStore.refund(reservation.id))
    return withCreditHeaders(Response.json({
      success: false,
      code: 'INVALID_GENERATION_RESULT',
      message: 'Image generation did not return a usable image. Your credits were refunded.',
    }, {
      status: 502,
      headers: { 'cache-control': 'no-store' },
    }), creditCost, refunded.remainingCredits)
  }

  await retryCreditTransition(() => creditStore.settle(reservation.id))
  const remainingCredits = await retryCreditTransition(() => creditStore.getBalance(session.user.id))
    .catch(() => reservation.remainingCredits)
  return withCreditHeaders(response, creditCost, remainingCredits)
}
