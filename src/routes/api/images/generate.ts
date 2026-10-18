import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { connect } from 'cloudflare:sockets'
import { createTuziTlsFetch } from '../../../../scripts/tuzi-tls-fetch.mjs'
import {
  getRequestedImageCreditCost,
  handleImageGenerationRequest,
  preflightImageGenerationRequest,
} from '../../../../scripts/tuzi-image.mjs'
import { createAppDatabase } from '../../../db'
import { createGenerationCreditStore } from '../../../db/generation-credits'
import { createAuth } from '../../../lib/auth'
import { protectImageGeneration } from '../../../lib/protected-image-generation'
import { prepareImageAnimation } from '../../../lib/image-to-video'

export const Route = createFileRoute('/api/images/generate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let userId = ''
        const creditStore = createGenerationCreditStore(createAppDatabase(env))
        return protectImageGeneration({
          request,
          getSession: async () => {
            const session = await createAuth(request, env).api.getSession({ headers: request.headers })
            userId = session?.user?.id || ''
            return session?.user?.id ? { user: { id: session.user.id } } : null
          },
          creditStore,
          preflight: (protectedRequest) => preflightImageGenerationRequest(protectedRequest, env),
          getCreditCost: getRequestedImageCreditCost,
          generate: async (protectedRequest) => handleImageGenerationRequest(
            protectedRequest,
            env,
            { skipPreflight: true, fetchImpl: createTuziTlsFetch(connect), prepareImages: (images: Array<{ url?: string; dataUrl?: string }>) =>
              prepareImageAnimation(images, userId, env.VIDEO_REFERENCES) },
          ),
        })
      },
    },
  },
})
