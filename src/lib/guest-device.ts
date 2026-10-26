/** A client hint for trial abuse prevention only. Never use it to authorize access. */
export async function guestDeviceHash(request: Request, secret: string): Promise<string | null> {
  const value = request.headers.get('x-seedance-device') ?? ''
  if (!/^v1:[a-f0-9]{64}$/.test(value)) return null
  if (secret.length < 32) throw new Error('Guest device signing key unavailable')
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`guest-device:${value}`))
  return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('')
}
