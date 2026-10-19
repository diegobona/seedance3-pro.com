import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { createAuth } from '../../../lib/auth'
import { createAppDatabase } from '../../../db'
import { createGuestImageTrialStore } from '../../../db/guest-image-trials'
import { createGuestVideoTrialStore } from '../../../db/guest-video-trials'
import { transferImageWithGuestAccess } from '../../../lib/guest-image-animation'

export const Route = createFileRoute('/api/images/animate')({
  server: { handlers: { POST: async ({ request }) => {
    try {
      const db = createAppDatabase(env)
      return await transferImageWithGuestAccess(request, {
        secret: env.BETTER_AUTH_SECRET,
        getSession: async () => {
          const session = await createAuth(request, env).api.getSession({ headers: request.headers })
          return session?.user?.id ? { user: { id: session.user.id } } : null
        },
        imageStore: createGuestImageTrialStore(db), videoStore: createGuestVideoTrialStore(db),
        bucket: env.VIDEO_REFERENCES,
        limiter: env.VIDEO_UPLOAD_RATE_LIMITER,
      })
    } catch {
      return Response.json({ success: false, message: 'Image transfer failed. Please try again.' }, {
        status: 503, headers: { 'cache-control': 'no-store' },
      })
    }
  } } },
})
