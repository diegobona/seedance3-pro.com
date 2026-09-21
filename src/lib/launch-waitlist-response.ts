export const LAUNCH_BONUS_CREDITS = 5

type SessionLike = { user: { id: string } } | null

export interface LaunchWaitlistStatus {
  joined: boolean
  bonusCredits: number
}

export interface LaunchWaitlistStore {
  getStatus(userId: string): Promise<LaunchWaitlistStatus>
  join(userId: string): Promise<LaunchWaitlistStatus>
}

interface LaunchWaitlistResponseOptions {
  request: Request
  getSession: (request: Request) => Promise<SessionLike>
  store: LaunchWaitlistStore
}

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'cache-control': 'no-store' },
  })
}

async function authenticatedUserId(options: LaunchWaitlistResponseOptions) {
  const session = await options.getSession(options.request)
  return session?.user?.id ?? ''
}

function authRequiredResponse() {
  return json({
    success: false,
    code: 'AUTH_REQUIRED',
    message: 'Log in to join the launch list.',
  }, 401)
}

export async function getLaunchWaitlistStatusResponse(options: LaunchWaitlistResponseOptions) {
  const userId = await authenticatedUserId(options)
  if (!userId) return authRequiredResponse()
  const waitlist = await options.store.getStatus(userId)
  return json({ success: true, waitlist })
}

export async function joinLaunchWaitlistResponse(options: LaunchWaitlistResponseOptions) {
  const userId = await authenticatedUserId(options)
  if (!userId) return authRequiredResponse()
  const waitlist = await options.store.join(userId)
  return json({ success: true, waitlist })
}
