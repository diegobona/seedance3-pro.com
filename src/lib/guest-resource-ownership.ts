import { readGuestImageIdentity, type GuestImageTrialStore } from './guest-image-trial'
import { readGuestVideoIdentity, type GuestVideoTrialStore } from './guest-video-trial'

/** Read-only resource ownership. Never use these identities to reserve guest credits. */
export async function readGuestImageResourceOwner(request: Request, accountUserId: string,
  options: { secret: string; store: GuestImageTrialStore }): Promise<string | null> {
  const identity = await readGuestImageIdentity(request, options)
  return identity && (!identity.claimedUserId || identity.claimedUserId === accountUserId) ? identity.userId : null
}

export async function readGuestVideoResourceOwner(request: Request, accountUserId: string,
  options: { secret: string; store: GuestVideoTrialStore }): Promise<string | null> {
  const identity = await readGuestVideoIdentity(request, options)
  return identity && (!identity.claimedUserId || identity.claimedUserId === accountUserId) ? identity.userId : null
}
