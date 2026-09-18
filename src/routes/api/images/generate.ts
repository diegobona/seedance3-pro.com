import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import {
  getRequestedImageQuantity,
  handleImageGenerationRequest,
  preflightImageGenerationRequest,
} from '../../../../scripts/tuzi-image.mjs'
import { createDb } from '../../../db'
import { createGenerationCreditStore } from '../../../db/generation-credits'
import { createAuth } from '../../../lib/auth'
import { GPT_IMAGE_2_CREDIT_COST } from '../../../lib/generation-credits'
import { protectImageGeneration } from '../../../lib/protected-image-generation'

export const Route = createFileRoute('/api/images/generate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const creditStore = createGenerationCreditStore(createDb(env.DATABASE_URL ?? ''))
        return protectImageGeneration({
          request,
          getSession: async () => {
            const session = await createAuth(request, env).api.getSession({ headers: request.headers })
            return session?.user?.id ? { user: { id: session.user.id } } : null
          },
          creditStore,
          preflight: (protectedRequest) => preflightImageGenerationRequest(protectedRequest, env),
          getCreditCost: (protectedRequest) => (
            GPT_IMAGE_2_CREDIT_COST * getRequestedImageQuantity(protectedRequest)
          ),
          generate: async (protectedRequest) => handleImageGenerationRequest(
            protectedRequest,
            env,
            { skipPreflight: true },
          ),
        })
      },
    },
  },
})
