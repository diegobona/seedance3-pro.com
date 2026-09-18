import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { createDb } from '../../../db'
import { createGenerationCreditStore } from '../../../db/generation-credits'
import { createAuth } from '../../../lib/auth'
import { getCreditBalanceResponse } from '../../../lib/credit-balance-response'

export const Route = createFileRoute('/api/credits/balance')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const creditStore = createGenerationCreditStore(createDb(env.DATABASE_URL ?? ''))
        return getCreditBalanceResponse({
          request,
          getSession: async (sessionRequest) => {
            const session = await createAuth(sessionRequest, env).api.getSession({ headers: sessionRequest.headers })
            return session?.user?.id ? { user: { id: session.user.id } } : null
          },
          getBalance: (userId) => creditStore.getBalance(userId),
        })
      },
    },
  },
})
