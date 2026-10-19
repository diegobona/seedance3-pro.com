export const GUEST_IMAGE_COUNT = 2
const GUEST_IMAGE_CREDITS = GUEST_IMAGE_COUNT * 5
const COOKIE_NAME = 'seedance_guest_image'
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'
const COOKIE_PATTERN = new RegExp(`^(${UUID})\\.([0-9a-f]{64})$`)

export interface GuestImageIdentity { id: string; userId: string; networkHash: string }
export interface GuestImageTrialStore {
  getById(id: string): Promise<GuestImageIdentity | null>
  hasNetwork(networkHash: string): Promise<boolean>
  create(identity: GuestImageIdentity): Promise<void>
  getBalance(userId: string): Promise<number>
}
export interface GuestImageAccess {
  session: { user: { id: string; isGuest: true } }
  setCookie?: string
}
interface Options { secret: string; store: GuestImageTrialStore; create?: boolean }

export class GuestImageTrialError extends Error {
  constructor(public code: 'GUEST_TRIAL_USED' | 'GUEST_TRIAL_UNAVAILABLE') {
    super(code === 'GUEST_TRIAL_USED'
      ? 'This network has already claimed the guest image trial. Sign up to keep creating.'
      : 'Guest image generation is temporarily unavailable. Please try again later.')
  }
}
async function signingKey(secret: string) {
  if (secret.length < 32) throw new GuestImageTrialError('GUEST_TRIAL_UNAVAILABLE')
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}
function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('')
}
async function sign(secret: string, value: string) {
  return hex(await crypto.subtle.sign('HMAC', await signingKey(secret), new TextEncoder().encode(value)))
}
async function readIdentity(request: Request, { secret, store }: Options) {
  const cookie = (request.headers.get('cookie') ?? '').split(';').map(value => value.trim())
    .find(value => value.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1) ?? ''
  const match = COOKIE_PATTERN.exec(cookie)
  if (!match) return null
  const [, id, signature] = match
  const valid = await crypto.subtle.verify('HMAC', await signingKey(secret),
    Uint8Array.from(signature.match(/../g)!, pair => parseInt(pair, 16)), new TextEncoder().encode(`guest-image:${id}`))
  return valid ? store.getById(id) : null
}
async function networkHash(request: Request, secret: string) {
  // Only Cloudflare's trusted header is accepted in production, never X-Forwarded-For.
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname)
  const ip = request.headers.get('cf-connecting-ip')?.trim().toLowerCase() || (local ? 'local-development' : '')
  if (!ip || ip.length > 64) throw new GuestImageTrialError('GUEST_TRIAL_UNAVAILABLE')
  return sign(secret, `guest-image-network:${ip}`)
}
export async function resolveGuestImageTrial(request: Request, options: Options): Promise<GuestImageAccess | null> {
  const existing = await readIdentity(request, options)
  if (existing) return { session: { user: { id: existing.userId, isGuest: true } } }
  if (!options.create) return null
  const hash = await networkHash(request, options.secret)
  if (await options.store.hasNetwork(hash)) throw new GuestImageTrialError('GUEST_TRIAL_USED')
  const identity = { id: crypto.randomUUID(), userId: `guest-image-${crypto.randomUUID()}`, networkHash: hash }
  try {
    await options.store.create(identity)
  } catch (error) {
    if (await options.store.hasNetwork(hash)) throw new GuestImageTrialError('GUEST_TRIAL_USED')
    throw error
  }
  const signature = await sign(options.secret, `guest-image:${identity.id}`)
  return {
    session: { user: { id: identity.userId, isGuest: true } },
    setCookie: `${COOKIE_NAME}=${identity.id}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`,
  }
}
export async function getGuestImageBalance(request: Request, options: Options) {
  const identity = await readIdentity(request, options)
  const remaining = identity ? await options.store.getBalance(identity.userId)
    : await options.store.hasNetwork(await networkHash(request, options.secret)) ? 0 : GUEST_IMAGE_CREDITS
  return { remaining, generationCost: 5, guest: true, maxImages: GUEST_IMAGE_COUNT, remainingImages: Math.floor(remaining / 5), expiresDaily: false }
}
export function withGuestImageCookie(response: Response, guest: GuestImageAccess | null) {
  if (!guest?.setCookie) return response
  const headers = new Headers(response.headers)
  headers.append('set-cookie', guest.setCookie)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}
export function guestImageTrialErrorResponse(error: unknown) {
  const trialError = error instanceof GuestImageTrialError ? error : new GuestImageTrialError('GUEST_TRIAL_UNAVAILABLE')
  return Response.json({ success: false, code: trialError.code, message: trialError.message }, {
    status: trialError.code === 'GUEST_TRIAL_USED' ? 403 : 503, headers: { 'cache-control': 'no-store' },
  })
}
