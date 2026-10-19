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
import { generateImageWithGuestAccess } from '../../../lib/guest-image-generation'
import { createGuestImageTrialStore } from '../../../db/guest-image-trials'
import { prepareImageAnimation } from '../../../lib/image-to-video'

export const Route = createFileRoute('/api/images/generate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const db = createAppDatabase(env)
        const creditStore = createGenerationCreditStore(db)
        return generateImageWithGuestAccess({
          request,
          guestOptions: { secret: env.BETTER_AUTH_SECRET, store: createGuestImageTrialStore(db) },
          getSession: async () => {
            const session = await createAuth(request, env).api.getSession({ headers: request.headers })
            return session?.user?.id ? { user: { id: session.user.id } } : null
          },
          creditStore,
          preflight: (protectedRequest) => preflightImageGenerationRequest(protectedRequest, env),
          getCreditCost: getRequestedImageCreditCost,
          generate: async (protectedRequest, userId) => handleImageGenerationRequest(
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
