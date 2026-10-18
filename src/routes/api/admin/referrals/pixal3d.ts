import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { createAppDatabase } from '../../../../db'
import { createReferralVisitStore } from '../../../../db/referral-visits'
import { getReferralStatsResponse } from '../../../../lib/anyposes-referral-response'

export const Route = createFileRoute('/api/admin/referrals/pixal3d')({
  server: {
    handlers: {
      GET: ({ request }) => getReferralStatsResponse(request, env.ANALYTICS_ADMIN_TOKEN ?? '', () =>
        createReferralVisitStore(createAppDatabase(env), 'pixal3d').getStats()),
    },
  },
})
