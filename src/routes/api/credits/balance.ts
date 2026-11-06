import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { createAppDatabase } from '../../../db'
import { createGenerationCreditStore } from '../../../db/generation-credits'
import { createAuth } from '../../../lib/auth'
import { getCreditBalanceResponse } from '../../../lib/credit-balance-response'
import { createGuestVideoTrialStore } from '../../../db/guest-video-trials'
import { getGuestVideoBalance, guestVideoTrialErrorResponse } from '../../../lib/guest-video-trial'
import { createGuestImageTrialStore } from '../../../db/guest-image-trials'
import { getGuestImageBalance } from '../../../lib/guest-image-trial'
import { reconcileGuestCredits } from '../../../lib/guest-credit-reconciliation'

export const Route = createFileRoute('/api/credits/balance')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = createAppDatabase(env)
          const creditStore = createGenerationCreditStore(db)
          return await getCreditBalanceResponse({
            request,
            getSession: async (sessionRequest) => {
              const session = await createAuth(sessionRequest, env).api.getSession({ headers: sessionRequest.headers })
              if (session?.user?.id) await reconcileGuestCredits(sessionRequest, session.user.id, env.BETTER_AUTH_SECRET, db)
              return session?.user?.id ? { user: { id: session.user.id } } : null
            },
            getBalance: (userId) => creditStore.getBalance(userId),
            ...(creditStore.getBreakdown ? { getBreakdown: (userId: string) => creditStore.getBreakdown!(userId) } : {}),
            ...(new URL(request.url).searchParams.get('guest_video') === '1' ? {
              getGuestBalance: async () => ({
                ...await getGuestVideoBalance(request, { secret: env.BETTER_AUTH_SECRET, store: createGuestVideoTrialStore(db) }),
                ...(env.GUEST_VIDEO_PROVIDER === 'yir' ? { videoModelName: 'MiniMax H3', videoResolutionLabel: '768P', maxReferences: 1 } : {}),
                ...(env.GUEST_VIDEO_PROVIDER === 'seeapi' ? { videoModelName: 'MiniMax H3 Max Turbo', videoResolutionLabel: '768P', maxReferences: 1 } : {}),
              }),
            } : new URL(request.url).searchParams.get('guest_image') === '1' ? {
              getGuestBalance: () => getGuestImageBalance(request, {
                secret: env.BETTER_AUTH_SECRET, store: createGuestImageTrialStore(db),
              }),
            } : {}),
          })
        } catch (error) { return guestVideoTrialErrorResponse(error) }
      },
    },
  },
})
