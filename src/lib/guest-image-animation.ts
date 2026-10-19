import { resolveGuestImageTrial, type GuestImageTrialStore } from './guest-image-trial'
import { resolveGuestVideoTrial, withGuestVideoCookie, guestVideoTrialErrorResponse,
  GuestVideoTrialError, type GuestVideoAccess, type GuestVideoTrialStore } from './guest-video-trial'
import { transferGeneratedImage } from './image-to-video'

export async function transferImageWithGuestAccess(request: Request, options: {
  secret: string
  getSession: () => Promise<{ user: { id: string } } | null>
  imageStore: GuestImageTrialStore
  videoStore: GuestVideoTrialStore
  bucket?: R2Bucket
  limiter?: { limit(input: { key: string }): Promise<{ success: boolean }> }
  fetchImpl?: typeof fetch
}) {
  let guest: GuestVideoAccess | null = null
  try {
    const origin = request.headers.get('origin')
    if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
      return Response.json({ success: false, message: 'Cross-site transfer is not allowed.' }, { status: 403 })
    }
    const session = await options.getSession()
    const imageGuest = await resolveGuestImageTrial(request, { secret: options.secret, store: options.imageStore })
    const response = await transferGeneratedImage(request, {
      bucket: options.bucket, limiter: options.limiter, fetchImpl: options.fetchImpl,
      getUserId: async () => session?.user.id ?? imageGuest?.session.user.id,
      additionalOwnerIds: imageGuest ? [imageGuest.session.user.id] : [],
      // Validate the source first. The video identity owns the new reference, while
      // its seconds and the image identity's remaining images stay untouched.
      getDestinationUserId: async () => {
        if (session?.user.id) return session.user.id
        guest = await resolveGuestVideoTrial(request, { secret: options.secret, store: options.videoStore, create: true })
        if (!guest || await options.videoStore.getBalance(guest.session.user.id) < 5) throw new GuestVideoTrialError('GUEST_TRIAL_USED')
        return guest.session.user.id
      },
    })
    return withGuestVideoCookie(response, guest)
  } catch (error) { return withGuestVideoCookie(guestVideoTrialErrorResponse(error), guest) }
}
