import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { billingWebhook } from '../../../lib/stripe-payments'
import { stripeRouteDependencies, stripeUnavailableResponse } from '../../../lib/stripe-route-dependencies'

export const Route = createFileRoute('/api/billing/webhook')({
  server: { handlers: { POST: async ({ request }) => {
    try { return await billingWebhook(request, stripeRouteDependencies(env)) }
    catch { return stripeUnavailableResponse() }
  } } },
})
