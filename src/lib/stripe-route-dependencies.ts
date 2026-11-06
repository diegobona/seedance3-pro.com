import { createAppDatabase, isD1Database, type DatabaseEnvironment } from '../db'
import { createStripePaymentStore } from '../db/stripe-payments'
import { createAuth } from './auth'
import type { StripeEnvironment } from './stripe-payments'
import { createRefundRequestStore } from '../db/refund-requests'
import type { RefundEnvironment } from './refund-requests'

export function stripeRouteDependencies(environment: StripeEnvironment & DatabaseEnvironment & RefundEnvironment & {
  BETTER_AUTH_SECRET?: string; GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string
}) {
  const db = createAppDatabase(environment)
  if (!isD1Database(db)) throw new Error('Billing requires D1.')
  return {
    environment,
    store: createStripePaymentStore(db),
    refundStore: createRefundRequestStore(db),
    getSession: async (request: Request) => {
      const session = await createAuth(request, environment).api.getSession({ headers: request.headers })
      return session?.user?.id ? { user: { id: session.user.id } } : null
    },
  }
}
export function stripeUnavailableResponse() {
  return Response.json({ error: 'Purchases are temporarily unavailable.', code: 'BILLING_UNAVAILABLE' }, {
    status: 503, headers: { 'Cache-Control': 'no-store' },
  })
}
