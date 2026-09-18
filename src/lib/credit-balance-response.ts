import { GPT_IMAGE_2_CREDIT_COST, TRIAL_CREDIT_GRANT } from './generation-credits'

type SessionLike = { user: { id: string } } | null

interface CreditBalanceResponseOptions {
  request: Request
  getSession: (request: Request) => Promise<SessionLike>
  getBalance: (userId: string) => Promise<number>
}

export async function getCreditBalanceResponse({ request, getSession, getBalance }: CreditBalanceResponseOptions) {
  const session = await getSession(request)
  if (!session?.user?.id) {
    return Response.json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Log in to view credits.',
    }, {
      status: 401,
      headers: { 'cache-control': 'no-store' },
    })
  }

  const remaining = await getBalance(session.user.id)
  return Response.json({
    success: true,
    credits: {
      remaining,
      generationCost: GPT_IMAGE_2_CREDIT_COST,
      trialGrant: TRIAL_CREDIT_GRANT,
    },
  }, {
    headers: { 'cache-control': 'no-store' },
  })
}
