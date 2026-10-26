import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { billingHistory } from '../../../lib/stripe-payments'
import { stripeRouteDependencies, stripeUnavailableResponse } from '../../../lib/stripe-route-dependencies'

export const Route = createFileRoute('/api/billing/history')({
  server: { handlers: { GET: async ({ request }) => {
    try { return await billingHistory(request, stripeRouteDependencies(env)) }
    catch { return stripeUnavailableResponse() }
  } } },
})
