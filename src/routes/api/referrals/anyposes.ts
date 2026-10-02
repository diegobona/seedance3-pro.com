import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { createDb } from '../../../db'
import { createReferralVisitStore } from '../../../db/referral-visits'
import { recordAnyposesReferralResponse } from '../../../lib/anyposes-referral-response'

export const Route = createFileRoute('/api/referrals/anyposes')({
  server: {
    handlers: {
      POST: ({ request }) => recordAnyposesReferralResponse(request, visit =>
        createReferralVisitStore(createDb(env.DATABASE_URL)).recordVisit(visit)),
    },
  },
})
