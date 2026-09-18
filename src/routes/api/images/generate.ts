import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { handleImageGenerationRequest } from '../../../../scripts/tuzi-image.mjs'
import { createAuth } from '../../../lib/auth'
import { protectImageGeneration } from '../../../lib/protected-image-generation'

export const Route = createFileRoute('/api/images/generate')({
  server: {
    handlers: {
      POST: async ({ request }) => protectImageGeneration({
        request,
        getSession: async () => {
          const session = await createAuth(request, env).api.getSession({ headers: request.headers })
          return session?.user?.id ? { user: { id: session.user.id } } : null
        },
        generate: async (protectedRequest) => handleImageGenerationRequest(protectedRequest, env),
      }),
    },
  },
})
