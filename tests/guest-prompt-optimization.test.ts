import assert from 'node:assert/strict'
import test from 'node:test'
import { H3_REWRITE_INSTRUCTIONS, optimizeGuestVideoPrompt } from '../src/lib/guest-prompt-optimization'
import { protectVideoGenerationStart, type VideoGenerationPayload } from '../src/lib/protected-video-generation'
import { readVideoGenerationInput } from '../src/lib/video-generation-input'

const base: VideoGenerationPayload = { prompt: 'A cat turns toward the camera.', duration: 5, resolution: '768p', aspectRatio: '16:9' }
const environment = { DEEPSEEK_API_KEY: 'test-secret-never-in-client' }
const fields = { alignment: '', integrated_multimodal_description: '[Shot 1] A cat turns toward the camera in one continuous shot.', overall_soundscape: 'Soft room ambience.', non_diegetic_music: 'N/A' }
const answer = (value = fields, finish_reason = 'stop') => Response.json({ choices: [{ finish_reason, message: { content: JSON.stringify(value) } }] })

test('defaults on for guests; uses bounded server-side request and preserves original payload', async () => {
  const result = await optimizeGuestVideoPrompt(base, { guest: true, environment, fetchImpl: async (url, init) => {
    assert.equal(url, 'https://api.deepseek.com/chat/completions')
    assert.equal(init?.redirect, 'manual')
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer ' + environment.DEEPSEEK_API_KEY)
    const body = JSON.parse(init?.body as string)
    assert.equal(body.model, 'deepseek-flash')
    assert.equal(body.thinking.type, 'disabled')
    assert.equal(body.max_tokens, 2000)
    assert.equal(body.messages[1].content.length, 1)
    assert.equal(body.messages[0].content, H3_REWRITE_INSTRUCTIONS)
    assert.equal(JSON.parse(body.messages[1].content[0].text).duration_seconds, 5)
    return answer()
  } })
  assert.equal(result.status, 'optimized')
  assert.match(result.payload.prompt, /^integrated_multimodal_description: \[Shot 1\]/)
  assert.equal(base.prompt, 'A cat turns toward the camera.')
  assert.equal(result.payload.duration, 5)
})

test('disabled and signed-in requests do not call DeepSeek', async () => {
  for (const [guest, optimizePrompt] of [[true, false], [false, true], [false, undefined]] as const) {
    const payload = { ...base, optimizePrompt }
    const result = await optimizeGuestVideoPrompt(payload, { guest, environment, fetchImpl: async () => { throw assert.fail('Must not call') } })
    assert.equal(result.status, 'off'); assert.equal(result.payload, payload)
  }
})

test('long multilingual prompts bypass DeepSeek by default and keep the exact original text', async () => {
  const prompts = [
    'camera '.repeat(80), 'cámara '.repeat(80), 'камера '.repeat(80),
    '画'.repeat(150), 'あ'.repeat(150), '안녕'.repeat(75), '가'.repeat(150).normalize('NFD'),
    'camera '.repeat(40) + '画'.repeat(75),
  ]
  for (const prompt of prompts) {
    let calls = 0
    const payload = { ...base, prompt }
    const result = await optimizeGuestVideoPrompt(payload, { guest: true, environment,
      fetchImpl: async () => { calls += 1; return answer() } })
    assert.deepEqual(result, { payload, status: 'off' })
    assert.equal(calls, 0)
  }
})

test('short multilingual prompts still optimize; an explicit choice overrides length', async () => {
  const prompts = ['camera '.repeat(79), 'cámara '.repeat(79), 'камера '.repeat(79),
    '画'.repeat(149), 'あ'.repeat(149), '가'.repeat(149).normalize('NFD'),
    'camera '.repeat(40) + '画'.repeat(74), 'A cat.' + ' !😀'.repeat(200)]
  for (const prompt of prompts) {
    const result = await optimizeGuestVideoPrompt({ ...base, prompt }, { guest: true, environment, fetchImpl: async () => answer() })
    assert.equal(result.status, 'optimized')
  }
  const forced = await optimizeGuestVideoPrompt({ ...base, prompt: 'камера '.repeat(100), optimizePrompt: true },
    { guest: true, environment, fetchImpl: async () => answer() })
  assert.equal(forced.status, 'optimized')
})

test('reference mode passes the owned image and requires first-frame alignment', async () => {
  const payload = { ...base, referenceImageUrls: ['https://example.test/owned-image.png'] }
  const result = await optimizeGuestVideoPrompt(payload, { guest: true, environment, fetchImpl: async (_url, init) => {
    const body = JSON.parse(init?.body as string)
    assert.equal(JSON.parse(body.messages[1].content[0].text).mode, 'I2VA')
    assert.equal(body.messages[1].content[1].image_url.url, payload.referenceImageUrls[0])
    return answer({ ...fields, alignment: 'Use <Picture 1> as the opening frame at 0.00 seconds in [Shot 1].' })
  } })
  assert.equal(result.status, 'optimized')
  assert.ok(result.payload.prompt.startsWith('Use <Picture 1>'))
})

test('image mode uses a separate light-edit policy and preserves a clear action without extra sound or music', async () => {
  const payload = { ...base, prompt: 'The person slowly turns and smiles. No camera movement.',
    referenceImageUrls: ['https://example.test/owned-image.png'] }
  let request: any
  const result = await optimizeGuestVideoPrompt(payload, { guest: true, environment, fetchImpl: async (_url, init) => {
    request = JSON.parse(init?.body as string)
    return answer({ alignment: '', integrated_multimodal_description: '[Shot 1] ' + payload.prompt,
      overall_soundscape: 'N/A', non_diegetic_music: 'N/A' })
  } })
  assert.notEqual(request.messages[0].content, H3_REWRITE_INSTRUCTIONS)
  assert.match(request.messages[0].content, /light edit/i)
  assert.doesNotMatch(request.messages[0].content, /Describe observable composition, lighting/)
  assert.equal(request.messages[1].content[1].image_url.detail, 'high')
  assert.equal(JSON.parse(request.messages[1].content[0].text).user_prompt, payload.prompt)
  assert.equal(result.status, 'optimized')
  assert.ok(result.payload.prompt.includes('[Shot 1] ' + payload.prompt))
  assert.match(result.payload.prompt, /overall_soundscape: N\/A\n\nnon_diegetic_music: N\/A$/)
  assert.equal(result.payload.referenceImageUrls, payload.referenceImageUrls)
  assert.equal(result.payload.duration, 5)
})

test('missing key, timeout, refusal, oversized and malformed responses fall back without exposing errors', async () => {
  assert.equal((await optimizeGuestVideoPrompt(base, { guest: true, environment: {} })).status, 'fallback')
  const failures = [
    async () => { throw new Error('secret provider error') },
    async () => new Response('private detail', { status: 429 }),
    async () => answer(fields, 'length'),
    async () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'No' } }] }),
    async () => new Response(' '.repeat(65537)),
    async () => answer({ ...fields, integrated_multimodal_description: '[Shot 1] Cat. [Shot 2] At 00:06.000, cut.' }),
    async () => answer({ ...fields, integrated_multimodal_description: '[Shot 1] ' + 'x'.repeat(6000) }),
    async () => answer({ ...fields, alignment: '<Picture 1>' }),
  ]
  for (const fetchImpl of failures) {
    const result = await optimizeGuestVideoPrompt(base, { guest: true, environment, fetchImpl })
    assert.deepEqual(result, { payload: base, status: 'fallback' })
  }
})

test('JSON and multipart accept only boolean optimizePrompt and preserve false', async () => {
  for (const value of [true, false, 'false', 0, null]) for (const multipart of [false, true]) {
    const payload = JSON.stringify({ ...base, optimizePrompt: value })
    const form = new FormData(); form.set('payload', payload); form.set('reference', new File(['image'], 'i.png', { type: 'image/png' }))
    const input = await readVideoGenerationInput(new Request('https://example.test/api/videos/generate', { method: 'POST',
      body: multipart ? form : payload, headers: multipart ? {} : { 'content-type': 'application/json' } }))
    assert.equal(input.ok, typeof value === 'boolean')
    if (input.ok) assert.equal(input.payload.optimizePrompt, value)
  }
})

test('reservation and validation precede optimization; exhausted guests never trigger an LLM call', async () => {
  for (const credits of [0, 5]) {
    const calls: string[] = []
    const response = await protectVideoGenerationStart({
      request: new Request('https://example.test/api/videos/generate', { method: 'POST' }),
      getSession: async () => ({ user: { id: 'guest-test', isGuest: true } }),
      preflight: async () => { calls.push('validate'); return { ok: true, payload: base } },
      taskStore: {
        reserveAndCreate: async () => { calls.push('reserve'); return credits ? { task: { id: 'task', workflowId: 'h3' }, remainingCredits: 0 } : null },
        getBalance: async () => 0,
        attachProviderTask: async () => ({ id: 'task', status: 'queued' }),
      } as never,
      submit: async (payload) => {
        const result = await optimizeGuestVideoPrompt(payload, { guest: true, environment, fetchImpl: async () => { calls.push('optimize'); return answer() } })
        assert.equal(result.status, 'optimized'); calls.push('video'); return { providerTaskId: 'provider' }
      },
    })
    assert.equal(response.status, credits ? 202 : 402)
    assert.deepEqual(calls, credits ? ['validate', 'reserve', 'optimize', 'video'] : ['validate', 'reserve'])
  }
})

test('fallback diagnostics identify the stage without including prompts or credentials', async () => {
  const events: unknown[] = []
  await optimizeGuestVideoPrompt(base, { guest:true, environment,
    onDiagnostic: event => events.push(event),
    fetchImpl: async () => new Response('secret provider body', {status:429}),
  })
  assert.equal((events[0] as {reason:string}).reason,'http_error')
  assert.equal((events[0] as {httpStatus:number}).httpStatus,429)
  assert.ok(!JSON.stringify(events).includes(base.prompt))
  assert.ok(!JSON.stringify(events).includes(environment.DEEPSEEK_API_KEY))
})


test('image first-frame alignment is assembled deterministically instead of rejecting equivalent time wording', async () => {
  const payload={...base,referenceImageUrls:['https://example.test/owned-image.png']}
  for(const alignment of ['Picture 1 is the first frame at 0 seconds.', '<Picture 1> begins [Shot 1].']) {
    const result=await optimizeGuestVideoPrompt(payload,{guest:true,environment,fetchImpl:async()=>answer({...fields,alignment})})
    assert.equal(result.status,'optimized')
    assert.match(result.payload.prompt,/^Use <Picture 1> as the opening frame at 0\.00 seconds in \[Shot 1\]\./)
  }
})

test('redirect responses are rejected without forwarding the DeepSeek credential', async () => {
  let calls=0
  const result=await optimizeGuestVideoPrompt(base,{guest:true,environment,fetchImpl:async(_url,init)=>{
    calls++;assert.equal(init?.redirect,'manual')
    return new Response(null,{status:302,headers:{location:'https://untrusted.example'}})
  }})
  assert.equal(result.status,'fallback');assert.equal(calls,1)
})

test('image modes accept an optimizer response arriving after the old twelve-second cutoff', async () => {
  await Promise.all((['reference', 'frames'] as const).map(async inputMode => {
    const payload = { ...base, inputMode, referenceImageUrls: ['https://example.test/one.png', 'https://example.test/two.png'] }
    const result = await optimizeGuestVideoPrompt(payload, { guest: true, environment, fetchImpl: async (_url, init) => {
      return await new Promise<Response>((resolve, reject) => {
        const timer = setTimeout(() => { init?.signal?.removeEventListener('abort', abort); resolve(answer()) }, 13_000)
        const abort = () => { clearTimeout(timer); reject(init?.signal?.reason) }
        init?.signal?.addEventListener('abort', abort, { once: true })
      })
    } })
    assert.equal(result.status, 'optimized', inputMode)
  }))
})

test('an explicitly configured optimizer deadline still falls back safely', async () => {
  const result = await optimizeGuestVideoPrompt({ ...base, inputMode: 'reference', referenceImageUrls: ['https://example.test/one.png'] }, {
    guest: true, environment, timeoutMs: 5,
    fetchImpl: async (_url, init) => new Promise<Response>((_resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Abort was not delivered')), 1000)
      init?.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(init.signal?.reason) }, { once: true })
    }),
  })
  assert.equal(result.status, 'fallback')
})
