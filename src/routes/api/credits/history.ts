import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { createAppDatabase } from '../../../db'
import { createAuth } from '../../../lib/auth'
import { creditHistoryResponse } from '../../../lib/credit-history-response'

export const Route = createFileRoute('/api/credits/history')({
  server: { handlers: { GET: async ({ request }) => {
    try {
      return await creditHistoryResponse(request, createAppDatabase(env), async request => {
        const session = await createAuth(request, env).api.getSession({ headers: request.headers })
        return session?.user?.id ? { user: { id: session.user.id } } : null
      })
    } catch {
      return Response.json({ error: 'Credit history is temporarily unavailable.' }, {
        status: 503, headers: { 'cache-control': 'no-store' },
      })
    }
  } } },
})
