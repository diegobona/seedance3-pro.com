import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { createAuth } from '../../../lib/auth'
import { serveVideoReference, uploadVideoReference } from '../../../lib/video-references'

export const Route = createFileRoute('/api/videos/references')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          return await uploadVideoReference(request, {
            getUserId: async () => (await createAuth(request, env).api.getSession({ headers: request.headers }))?.user?.id,
            bucket: env.VIDEO_REFERENCES,
            limiter: env.VIDEO_UPLOAD_RATE_LIMITER,
          })
        } catch {
          return Response.json({ success: false, message: 'Reference upload failed. Please try again.' }, {
            status: 503, headers: { 'cache-control': 'no-store' },
          })
        }
      },
      GET: ({ request }) => serveVideoReference(request, env.VIDEO_REFERENCES),
      HEAD: ({ request }) => serveVideoReference(request, env.VIDEO_REFERENCES),
    },
  },
})
