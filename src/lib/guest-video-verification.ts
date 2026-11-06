export interface GuestVideoVerificationEnvironment {
  TURNSTILE_SITE_KEY?: string
  TURNSTILE_SECRET?: string
  TURNSTILE_HOSTNAMES?: string
}
export type GuestVideoAction = 'guest_video_generate' | 'guest_video_reference'

/** Fail closed before guest provisioning, credit reservation, R2 writes or supplier calls. */
export async function verifyGuestVideoRequest(request: Request, environment: GuestVideoVerificationEnvironment,
  action: GuestVideoAction, fetchImpl: typeof fetch = fetch): Promise<Response | null> {
  const siteKey = environment.TURNSTILE_SITE_KEY?.trim()
  const secret = environment.TURNSTILE_SECRET?.trim()
  const hostname = new URL(request.url).hostname
  const allowed = (environment.TURNSTILE_HOSTNAMES ?? '').split(',').map(value => value.trim()).filter(Boolean)
  const response = (status: number, code: string, message: string, challenge = false) => Response.json({
    success: false, code, message,
    ...(challenge ? { verification: { siteKey, action } } : {}),
  }, { status, headers: { 'cache-control': 'no-store' } })
  if (!siteKey || !secret || !allowed.includes(hostname)) {
    return response(503, 'GUEST_VERIFICATION_UNAVAILABLE', 'Verification is temporarily unavailable. Please try again later.')
  }
  const token = request.headers.get('x-seedance-verification') ?? ''
  if (!token) return response(403, 'GUEST_VERIFICATION_REQUIRED', 'Please complete the security check to continue.', true)
  if (token.length > 2048 || !token.trim()) {
    return response(403, 'GUEST_VERIFICATION_FAILED', 'Verification failed. Please try again.')
  }
  try {
    const result = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: request.headers.get('cf-connecting-ip') ?? '' }),
      signal: AbortSignal.timeout(10000),
    })
    if (!result.ok) throw new Error('Verification service unavailable')
    const verified = await result.json() as { success?: boolean; action?: string; hostname?: string }
    // Turnstile consumes each token once. Never cache success or trust client device hints here.
    if (verified.success === true && verified.action === action && verified.hostname === hostname) return null
    return response(403, 'GUEST_VERIFICATION_FAILED', 'Verification failed. Please try again.')
  } catch {
    return response(503, 'GUEST_VERIFICATION_UNAVAILABLE', 'Verification is temporarily unavailable. Please try again later.')
  }
}
