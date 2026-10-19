import { protectImageGeneration } from './protected-image-generation'
import { type GenerationCreditStore } from './generation-credits'
import { resolveGuestImageTrial, withGuestImageCookie, guestImageTrialErrorResponse,
  GUEST_IMAGE_COUNT, type GuestImageAccess, type GuestImageTrialStore } from './guest-image-trial'
import { GPT_IMAGE_2_CREDIT_COST } from './generation-credits'

export async function generateImageWithGuestAccess(options: {
  request: Request
  getSession: () => Promise<{ user: { id: string } } | null>
  guestOptions: { secret: string; store: GuestImageTrialStore }
  creditStore: GenerationCreditStore
  preflight: (request: Request) => Promise<Response | null>
  getCreditCost: (request: Request) => number
  generate: (request: Request, userId: string) => Promise<Response>
}) {
  const { request } = options
  const origin = request.headers.get('origin')
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return Response.json({ success: false, code: 'CROSS_SITE_REQUEST', message: 'Cross-site image generation is not allowed.' },
      { status: 403, headers: { 'cache-control': 'no-store' } })
  }
  let guest: GuestImageAccess | null = null
  try {
    const invalid = await options.preflight(request)
    if (invalid) return invalid
    const session = await options.getSession()
    if (!session?.user?.id && options.getCreditCost(request) > GUEST_IMAGE_COUNT * GPT_IMAGE_2_CREDIT_COST) {
      return Response.json({ success: false, code: 'GUEST_IMAGE_QUANTITY', message: 'Guest generation supports up to 2 images.' },
        { status: 400, headers: { 'cache-control': 'no-store' } })
    }
    guest = session?.user?.id ? null : await resolveGuestImageTrial(request, { ...options.guestOptions, create: true })
    const access = session ?? guest?.session ?? null
    return withGuestImageCookie(await protectImageGeneration({
      request, getSession: async () => access, creditStore: options.creditStore,
      getCreditCost: options.getCreditCost,
      generate: request => options.generate(request, access!.user.id),
    }), guest)
  } catch (error) { return withGuestImageCookie(guestImageTrialErrorResponse(error), guest) }
}
