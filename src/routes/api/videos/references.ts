import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { createAuth } from '../../../lib/auth'
import { createAppDatabase } from '../../../db'
import { createGuestVideoTrialStore } from '../../../db/guest-video-trials'
import { resolveGuestVideoTrial, withGuestVideoCookie, guestVideoTrialErrorResponse, GuestVideoTrialError, type GuestVideoAccess } from '../../../lib/guest-video-trial'
import { serveVideoReference, uploadVideoReference } from '../../../lib/video-references'

export const Route = createFileRoute('/api/videos/references')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let guest: GuestVideoAccess | null = null
        try {
          const origin = request.headers.get('origin')
          if (origin && origin !== new URL(request.url).origin) return Response.json({ success: false, message: 'Cross-site upload is not allowed.' }, { status: 403 })
          const session = await createAuth(request, env).api.getSession({ headers: request.headers })
          const store = createGuestVideoTrialStore(createAppDatabase(env))
          guest = session?.user?.id ? null : await resolveGuestVideoTrial(request, {
            secret: env.BETTER_AUTH_SECRET, store, create: true,
          })
          if (guest && await store.getBalance(guest.session.user.id) < 5) throw new GuestVideoTrialError('GUEST_TRIAL_USED')
          const response = await uploadVideoReference(request, {
            getUserId: async () => session?.user?.id ?? guest?.session.user.id,
            bucket: env.VIDEO_REFERENCES,
            limiter: env.VIDEO_UPLOAD_RATE_LIMITER,
          })
          return withGuestVideoCookie(response, guest)
        } catch (error) { return withGuestVideoCookie(guestVideoTrialErrorResponse(error), guest) }
      },
      GET: ({ request }) => serveVideoReference(request, env.VIDEO_REFERENCES),
      HEAD: ({ request }) => serveVideoReference(request, env.VIDEO_REFERENCES),
    },
  },
})
