import { guestDeviceHash } from './guest-device'
import { guestNetworkAddress } from './guest-network'
import { GUEST_VIDEO_DURATION_SECONDS } from '../../app/guest-video.mjs'

export const GUEST_VIDEO_SECONDS = 10
const COOKIE_NAME = 'seedance_guest_video'
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'
const COOKIE_PATTERN = new RegExp(`^(${UUID})\\.([0-9a-f]{64})$`)

export interface GuestVideoIdentity { id: string; userId: string; networkHash: string; deviceHash?: string | null; budgetKey?: string; claimedUserId?: string | null }
export interface GuestVideoTrialStore {
  getById(id: string): Promise<GuestVideoIdentity | null>
  hasNetwork(networkHash: string): Promise<boolean>
  bindNetwork?(networkHash: string, userId: string): Promise<void>
  hasDevice?(deviceHash: string): Promise<boolean>
  bindDevice?(deviceHash: string, userId: string): Promise<void>
  create(identity: GuestVideoIdentity): Promise<void>
  getBalance(userId: string): Promise<number>
  syncBudget?(networkHashes: string[], budgetKey: string): Promise<void>
}
export interface GuestVideoAccess {
  session: { user: { id: string; isGuest: true } }
  setCookie?: string
}
interface Options { secret: string; store: GuestVideoTrialStore; create?: boolean }

export class GuestVideoTrialError extends Error {
  constructor(public code: 'GUEST_TRIAL_USED' | 'GUEST_TRIAL_UNAVAILABLE') {
    super(code === 'GUEST_TRIAL_USED'
      ? 'This device or network has already claimed the guest video trial. Sign up to keep creating.'
      : 'Guest video generation is temporarily unavailable. Please try again later.')
  }
}
async function signingKey(secret: string) {
  if (secret.length < 32) throw new GuestVideoTrialError('GUEST_TRIAL_UNAVAILABLE')
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}
function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('')
}
async function sign(secret: string, value: string) {
  return hex(await crypto.subtle.sign('HMAC', await signingKey(secret), new TextEncoder().encode(value)))
}
export async function readGuestVideoIdentity(request: Request, { secret, store }: Options) {
  const cookie = (request.headers.get('cookie') ?? '').split(';').map(value => value.trim())
    .find(value => value.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1) ?? ''
  const match = COOKIE_PATTERN.exec(cookie)
  if (!match) return null
  const [, id, signature] = match
  const valid = await crypto.subtle.verify('HMAC', await signingKey(secret),
    Uint8Array.from(signature.match(/../g)!, pair => parseInt(pair, 16)), new TextEncoder().encode(`guest-video:${id}`))
  return valid ? store.getById(id) : null
}
export async function guestVideoNetworkHash(request: Request, secret: string, shared: boolean | string = false, legacy = false) {
  let ip: string
  try { ip = guestNetworkAddress(request, legacy) } catch { throw new GuestVideoTrialError('GUEST_TRIAL_UNAVAILABLE') }
  return sign(secret, `${typeof shared === "string" ? shared : shared ? "guest-budget-network" : "guest-video-network"}:${ip}`)
}
async function hasClaimedNetwork(request: Request, options: Options) {
  const hash = await guestVideoNetworkHash(request, options.secret)
  if (await options.store.hasNetwork(hash)) return true
  const oldHash = await guestVideoNetworkHash(request, options.secret, false, true)
  return oldHash !== hash && await options.store.hasNetwork(oldHash)
}
export async function resolveGuestVideoTrial(request: Request, options: Options): Promise<GuestVideoAccess | null> {
  if (options.store.syncBudget) {
    const [own,other,budget] = await Promise.all([
      guestVideoNetworkHash(request,options.secret),
      guestVideoNetworkHash(request,options.secret,'guest-image-network'),
      guestVideoNetworkHash(request,options.secret,true),
    ])
    await options.store.syncBudget([own,other],budget)
    // Keep pre-prefix trial wallets in the current shared budget when they return.
    const [oldOwn,oldOther] = await Promise.all([
      guestVideoNetworkHash(request,options.secret,false,true),
      guestVideoNetworkHash(request,options.secret,'guest-image-network',true),
    ])
    if (oldOwn !== own) await options.store.syncBudget([oldOwn,oldOther],budget)
  }
  const existing = await readGuestVideoIdentity(request, options)
  const deviceHash = await guestDeviceHash(request, options.secret)
  if (existing?.claimedUserId) throw new GuestVideoTrialError('GUEST_TRIAL_USED')
  if (existing) {
    // A generation/upload on a new network must not leave that network eligible
    // for a fresh wallet after cookie deletion. Read-only status calls do not bind.
    if (options.create) await options.store.bindNetwork?.(
      await guestVideoNetworkHash(request, options.secret), existing.userId,
    )
    if (deviceHash) await options.store.bindDevice?.(deviceHash, existing.userId)
    return { session: { user: { id: existing.userId, isGuest: true } } }
  }
  if (!options.create) return null
  const hash = await guestVideoNetworkHash(request, options.secret)
  const alreadyClaimed = async () => await hasClaimedNetwork(request, options) || Boolean(deviceHash && await options.store.hasDevice?.(deviceHash))
  if (await alreadyClaimed()) throw new GuestVideoTrialError('GUEST_TRIAL_USED')
  const identity = { id: crypto.randomUUID(), userId: `guest-${crypto.randomUUID()}`, networkHash: hash, deviceHash, budgetKey: await guestVideoNetworkHash(request,options.secret,true) }
  try {
    await options.store.create(identity)
  } catch (error) {
    if (await alreadyClaimed()) throw new GuestVideoTrialError('GUEST_TRIAL_USED')
    throw error
  }
  const signature = await sign(options.secret, `guest-video:${identity.id}`)
  return {
    session: { user: { id: identity.userId, isGuest: true } },
    setCookie: `${COOKIE_NAME}=${identity.id}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`,
  }
}
export async function getGuestVideoBalance(request: Request, options: Options) {
  const identity = await readGuestVideoIdentity(request, options)
  const deviceHash = await guestDeviceHash(request, options.secret)
  const remaining = identity ? await options.store.getBalance(identity.userId)
    : await hasClaimedNetwork(request, options)
      || (deviceHash && await options.store.hasDevice?.(deviceHash)) ? 0 : GUEST_VIDEO_SECONDS
  return { remaining, generationCost: GUEST_VIDEO_DURATION_SECONDS, guest: true, maxDuration: GUEST_VIDEO_DURATION_SECONDS, expiresDaily: false }
}
export function withGuestVideoCookie(response: Response, guest: GuestVideoAccess | null) {
  if (!guest?.setCookie) return response
  const headers = new Headers(response.headers)
  headers.append('set-cookie', guest.setCookie)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}
export function guestVideoTrialErrorResponse(error: unknown) {
  const trialError = error instanceof GuestVideoTrialError ? error : new GuestVideoTrialError('GUEST_TRIAL_UNAVAILABLE')
  return Response.json({ success: false, code: trialError.code, message: trialError.message }, {
    status: trialError.code === 'GUEST_TRIAL_USED' ? 403 : 503, headers: { 'cache-control': 'no-store' },
  })
}
