import assert from 'node:assert/strict'
import test from 'node:test'
import { createD1TestDatabase } from './helpers/d1-test-db'
import { createGenerationCreditStore } from '../src/db/generation-credits'
import { createGuestVideoTrialStore } from '../src/db/guest-video-trials'
import { handleImageGenerationRequest, getRequestedImageCreditCost, preflightImageGenerationRequest } from '../scripts/tuzi-image.mjs'

const secret = 'guest-image-test-secret-at-least-thirty-two-characters'
function request(model = 'gpt-image-2', quantity = 1, cookie = '') {
  const form = new FormData()
  form.set('model', model); form.set('prompt', 'A mountain at sunrise'); form.set('quantity', String(quantity))
  return new Request('https://seedance3-pro.com/api/images/generate', {
    method: 'POST', body: form, headers: { cookie, origin: 'https://seedance3-pro.com',
      'cf-connecting-ip': '203.0.113.98', 'x-seedance-image-model': model, 'x-seedance-image-quantity': String(quantity) },
  })
}

test('both image models spend the same two-image D1 allowance independently of video seconds', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    const { createGuestImageTrialStore } = await import('../src/db/guest-image-trials')
    const { getGuestImageBalance } = await import('../src/lib/guest-image-trial')
    const { generateImageWithGuestAccess } = await import('../src/lib/guest-image-generation')
    const store = createGuestImageTrialStore(db), credits = createGenerationCreditStore(db)
    const video = createGuestVideoTrialStore(db), videoId = crypto.randomUUID()
    await video.create({ id: videoId, userId: `video-${videoId}`, networkHash: 'v'.repeat(64) })
    let calls = 0, fail = false
    const generate = (req: Request) => generateImageWithGuestAccess({
      request: req, getSession: async () => null, guestOptions: { store, secret }, creditStore: credits,
      preflight: request => preflightImageGenerationRequest(request, {}, { skipRateLimit: true }),
      getCreditCost: getRequestedImageCreditCost,
      generate: request => handleImageGenerationRequest(request, { TUZI_API_KEY: 'test-only' }, {
        skipPreflight: true, fetchImpl: async (_url: string, options: RequestInit) => {
          calls++
          if (fail) return Response.json({ error: { message: 'Synthetic failure' } }, { status: 502 })
          const body = JSON.parse(String(options.body))
          return Response.json({ data: Array.from({ length: body.n }, () => ({ url: 'https://example.com/image.png' })) })
        },
      }),
    })
    const preview = await getGuestImageBalance(request(), { store, secret })
    assert.equal(preview.remainingImages, 2)
    assert.equal((await db.prepare('SELECT count(*) AS n FROM guest_image_trial').first<{n:number}>())?.n, 0)
    const first = await generate(request())
    assert.equal(first.status, 200)
    assert.equal(first.headers.get('x-seedance-credit-scope'), 'guest-image')
    assert.equal(first.headers.get('x-seedance-credit-remaining'), '5')
    const cookie = first.headers.get('set-cookie')!.split(';')[0]
    const tooMany = await generate(request('gpt-image-2-5-1k', 2, cookie))
    assert.equal(tooMany.status, 402)
    assert.equal(calls, 1)
    fail = true
    assert.equal((await generate(request('gpt-image-2-5-1k', 1, cookie))).status, 502)
    assert.equal((await getGuestImageBalance(request('gpt-image-2', 1, cookie), { store, secret })).remainingImages, 1)
    fail = false
    assert.equal((await generate(request('gpt-image-2-5-1k', 1, cookie))).status, 200)
    const exhausted = await generate(request('gpt-image-2', 1, cookie))
    assert.equal(exhausted.status, 402)
    assert.equal((await exhausted.json() as {code:string}).code, 'GUEST_IMAGE_INSUFFICIENT')
    assert.equal(calls, 3, 'exhausted trial must not call a paid provider')
    assert.equal(await video.getBalance(`video-${videoId}`), 10)
    const identity = await db.prepare('SELECT user_id AS id FROM guest_image_trial').first<{id:string}>()
    await db.prepare("UPDATE \"user\" SET daily_credit_date='2000-01-01' WHERE id=?").bind(identity!.id).run()
    assert.equal(await credits.getBalance(identity!.id), 0, 'image allowance never refreshes daily')
    assert.equal((await getGuestImageBalance(request(), { store, secret })).remainingImages, 0, 'deleting cookie cannot reset trial')
  } finally { await dispose() }
})

test('guest image claims are atomic, isolated from video cookies, and cannot overspend concurrently', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    const { createGuestImageTrialStore } = await import('../src/db/guest-image-trials')
    const { resolveGuestImageTrial } = await import('../src/lib/guest-image-trial')
    const { resolveGuestVideoTrial } = await import('../src/lib/guest-video-trial')
    const store = createGuestImageTrialStore(db)
    const claims = await Promise.allSettled([1, 2].map(() => resolveGuestImageTrial(request(), { store, secret, create: true })))
    assert.equal(claims.filter(r => r.status === 'fulfilled').length, 1)
    assert.equal((await db.prepare('SELECT count(*) AS n FROM "user"').first<{n:number}>())?.n, 1)
    const guest = claims.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<NonNullable<Awaited<ReturnType<typeof resolveGuestImageTrial>>>>
    const cookie = guest.value.setCookie!.split(';')[0]
    assert.equal(await resolveGuestVideoTrial(request('gpt-image-2', 1, cookie), { secret, store: createGuestVideoTrialStore(db) }), null)
    const tampered = cookie.slice(0, -1) + (cookie.endsWith('0') ? '1' : '0')
    assert.equal(await resolveGuestImageTrial(request('gpt-image-2', 1, tampered), { store, secret }), null)
    const credits = createGenerationCreditStore(db)
    const results = await Promise.all([1, 2, 3].map(() => credits.reserve(guest.value.session.user.id, 5)))
    assert.equal(results.filter(Boolean).length, 2)
    assert.equal(await store.getBalance(guest.value.session.user.id), 0)
    await credits.refund(results.find(Boolean)!.id)
    await credits.refund(results.find(Boolean)!.id)
    assert.equal(await store.getBalance(guest.value.session.user.id), 5)
  } finally { await dispose() }
})

test('invalid or cross-site image requests never allocate a guest allowance', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    const { createGuestImageTrialStore } = await import('../src/db/guest-image-trials')
    const { generateImageWithGuestAccess } = await import('../src/lib/guest-image-generation')
    const generate = (req: Request) => generateImageWithGuestAccess({ request: req,
      getSession: async () => null, guestOptions: { store: createGuestImageTrialStore(db), secret },
      creditStore: createGenerationCreditStore(db), getCreditCost: getRequestedImageCreditCost,
      preflight: request => preflightImageGenerationRequest(request, {}, { skipRateLimit: true }),
      generate: async () => { throw new Error('Provider must not be called') },
    })
    assert.equal((await generate(request('gpt-image-2', 3))).status, 400)
    const crossSite = request(); crossSite.headers.set('origin', 'https://example.org')
    assert.equal((await generate(crossSite)).status, 403)
    assert.equal((await generate(new Request('https://seedance3-pro.com/api/images/generate', { method: 'POST' }))).status, 415)
    assert.equal((await db.prepare('SELECT count(*) AS n FROM guest_image_trial').first<{n:number}>())?.n, 0)
  } finally { await dispose() }
})

test('a two-image batch consumes both trial images and signed-in generation uses only account credits', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    const { createGuestImageTrialStore } = await import('../src/db/guest-image-trials')
    const { generateImageWithGuestAccess } = await import('../src/lib/guest-image-generation')
    const store = createGuestImageTrialStore(db), credits = createGenerationCreditStore(db)
    let account: {user:{id:string}} | null = null
    const generate = (req: Request) => generateImageWithGuestAccess({ request: req,
      getSession: async () => account, guestOptions: { store, secret }, creditStore: credits,
      getCreditCost: getRequestedImageCreditCost,
      preflight: request => preflightImageGenerationRequest(request, {}, { skipRateLimit: true }),
      generate: async () => Response.json({ success: true, image: { url: 'https://example.com/image.png' } }, {
        headers: { 'x-seedance-validated-image-count': account ? '3' : '2' },
      }),
    })
    const batch = await generate(request('gpt-image-2-5-1k', 2))
    assert.equal(batch.status, 200)
    assert.equal(batch.headers.get('x-seedance-credit-remaining'), '0')
    const id = 'signed-in-test-user'
    await db.prepare('INSERT INTO "user" (id,name,email) VALUES (?,?,?)').bind(id, 'Account', `${id}@example.invalid`).run()
    account = { user: { id } }
    const signedIn = await generate(request('gpt-image-2', 3, batch.headers.get('set-cookie')!.split(';')[0]))
    assert.equal(signedIn.status, 200)
    assert.equal(signedIn.headers.get('x-seedance-credit-scope'), 'account')
    assert.equal(signedIn.headers.get('set-cookie'), null)
    assert.equal((await db.prepare('SELECT count(*) AS n FROM guest_image_trial').first<{n:number}>())?.n, 1)
  } finally { await dispose() }
})

test('a credit-store failure still returns the new guest cookie so a retry retains the allowance', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    const { createGuestImageTrialStore } = await import('../src/db/guest-image-trials')
    const { generateImageWithGuestAccess } = await import('../src/lib/guest-image-generation')
    const credits = createGenerationCreditStore(db)
    const response = await generateImageWithGuestAccess({ request: request(), getSession: async () => null,
      guestOptions: { store: createGuestImageTrialStore(db), secret },
      creditStore: { ...credits, reserve: async () => { throw new Error('Synthetic D1 interruption') } },
      getCreditCost: getRequestedImageCreditCost, preflight: async () => null,
      generate: async () => { throw new Error('Provider must not be called') },
    })
    assert.equal(response.status, 503)
    assert.match(response.headers.get('set-cookie') ?? '', /seedance_guest_image=/)
  } finally { await dispose() }
})

test('anonymous and later signed-in image-to-video handoff validates image ownership without spending either pool', async () => {
  const { db, dispose } = await createD1TestDatabase()
  try {
    const { createGuestImageTrialStore } = await import('../src/db/guest-image-trials')
    const { resolveGuestImageTrial, getGuestImageBalance } = await import('../src/lib/guest-image-trial')
    const { getGuestVideoBalance } = await import('../src/lib/guest-video-trial')
    const { transferImageWithGuestAccess } = await import('../src/lib/guest-image-animation')
    const { prepareImageAnimation } = await import('../src/lib/image-to-video')
    const imageStore = createGuestImageTrialStore(db), videoStore = createGuestVideoTrialStore(db)
    const guest = (await resolveGuestImageTrial(request(), { secret, store: imageStore, create: true }))!
    const imageCookie = guest.setCookie!.split(';')[0]
    const saved = new Map<string, object>()
    const bucket = { put: async (key: string, value: string | Uint8Array, metadata: object) => {
      saved.set(key, { size: value.length, text: async () => String(value), ...metadata })
    }, get: async (key: string) => saved.get(key) ?? null } as unknown as R2Bucket
    const [image] = await prepareImageAnimation([{ url: 'https://example.com/source.png' }], guest.session.user.id, bucket)
    const sourceRequest = (cookie: string) => new Request(`https://seedance3-pro.com/api/images/animate?image=${image.animateId}`, { method: 'POST', headers: { cookie, 'cf-connecting-ip': '203.0.113.98' } })
    let session: {user:{id:string}} | null = null
    const options = { secret, imageStore, videoStore, bucket, getSession: async () => session,
      limiter: { limit: async () => ({ success: true }) }, fetchImpl: (async () => new Response(
        new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]), { headers: { 'content-type': 'image/png' } },
      )) as typeof fetch,
    }
    assert.equal((await transferImageWithGuestAccess(sourceRequest(''), options)).status, 401)
    assert.equal((await db.prepare('SELECT count(*) AS n FROM guest_video_trial').first<{n:number}>())?.n, 0)
    const response = await transferImageWithGuestAccess(sourceRequest(imageCookie), options)
    assert.equal(response.status, 201)
    const videoCookie = response.headers.get('set-cookie')!.split(';')[0]
    const both = sourceRequest(`${imageCookie}; ${videoCookie}`)
    assert.equal((await getGuestImageBalance(both, { secret, store: imageStore })).remainingImages, 2)
    assert.equal((await getGuestVideoBalance(both, { secret, store: videoStore })).remaining, 10)
    const ref = await response.json() as {id:string}
    const owner = (saved.get(`references/${ref.id}`) as {customMetadata:{userId:string}}).customMetadata.userId
    assert.notEqual(owner, guest.session.user.id)
    session = { user: { id: 'signed-in-after-image' } }
    const afterLogin = await transferImageWithGuestAccess(both, options)
    assert.equal(afterLogin.status, 201)
    assert.equal(afterLogin.headers.get('set-cookie'), null)
    const accountRef = await afterLogin.json() as {id:string}
    assert.equal((saved.get(`references/${accountRef.id}`) as {customMetadata:{userId:string}}).customMetadata.userId, session.user.id)
  } finally { await dispose() }
})
