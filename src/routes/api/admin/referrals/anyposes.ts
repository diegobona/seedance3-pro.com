import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { createAppDatabase } from '../../../../db'
import { createReferralVisitStore } from '../../../../db/referral-visits'
import { getAnyposesReferralStatsResponse } from '../../../../lib/anyposes-referral-response'

export const Route = createFileRoute('/api/admin/referrals/anyposes')({
  server: {
    handlers: {
      GET: ({ request }) => getAnyposesReferralStatsResponse(request, env.ANALYTICS_ADMIN_TOKEN ?? '', () =>
        createReferralVisitStore(createAppDatabase(env)).getStats()),
    },
  },
})
