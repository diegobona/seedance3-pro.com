import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { createDb } from '../../../db'
import { createReferralVisitStore } from '../../../db/referral-visits'
import { recordReferralResponse } from '../../../lib/anyposes-referral-response'

export const Route = createFileRoute('/api/referrals/pixal3d')({
  server: {
    handlers: {
      POST: ({ request }) => recordReferralResponse(request, visit =>
        createReferralVisitStore(createDb(env.DATABASE_URL), 'pixal3d').recordVisit(visit)),
    },
  },
})
