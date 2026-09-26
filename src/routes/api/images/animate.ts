import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { createAuth } from '../../../lib/auth'
import { transferGeneratedImage } from '../../../lib/image-to-video'

export const Route = createFileRoute('/api/images/animate')({
  server: { handlers: { POST: async ({ request }) => {
    try {
      return await transferGeneratedImage(request, {
        getUserId: async () => (await createAuth(request, env).api.getSession({ headers: request.headers }))?.user?.id,
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
