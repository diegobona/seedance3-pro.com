import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { optimizeGuestVideoPrompt } from '../src/lib/guest-prompt-optimization'
import { verifyGuestVideoRequest } from '../src/lib/guest-video-verification'
import { generateImageWithGuestAccess } from '../src/lib/guest-image-generation'
import { readVideoGenerationInput } from '../src/lib/video-generation-input'
import { protectVideoGenerationStart, guestVideoPayloadError } from '../src/lib/protected-video-generation'
import { uploadVideoReference, resolveVideoReferences } from '../src/lib/video-references'

async function handler(route: string, siteverify: typeof fetch, signedIn = false, balance = 10, optimize = false) {
  const file = new URL(`../src/routes/api/${route}.ts`, import.meta.url)
  const fallback = createRequire(file)
  const touched: string[] = []
  const submittedPrompts: string[] = []
  const references = new Map()
  const task = { id:crypto.randomUUID(),status:'queued',workflowId:'test' }
  const environment = { DEEPSEEK_API_KEY: optimize ? 'test-only' : undefined, BETTER_AUTH_SECRET:'guest-route-test-secret-at-least-32-characters', TURNSTILE_SITE_KEY:'public', TURNSTILE_SECRET:'secret', TURNSTILE_HOSTNAMES:'seedance3-pro.com',
    VIDEO_REFERENCES:{put:async(key:string,_bytes:unknown,metadata:unknown)=>{touched.push('upload');references.set(key,metadata)},head:async(key:string)=>references.get(key)},
    VIDEO_UPLOAD_RATE_LIMITER:{limit:async()=>({success:true})}, IMAGE_RATE_LIMITER:{limit:async()=>({success:true})} }
  const modules: Record<string,unknown> = {
    '@tanstack/react-router':{createFileRoute:()=> (value:unknown)=>value}, '@tanstack/react-start':{}, 'cloudflare:workers':{env:environment},
    '../../../lib/auth':{createAuth:()=>({api:{getSession:async()=>signedIn ? {user:{id:'paid'}} : null}})},
    '../../../db':{createAppDatabase:()=>({}),databaseConfigured:()=>true,isD1Database:()=>false},
    '../../../lib/guest-video-verification':{verifyGuestVideoRequest:(request:Request, env:typeof environment, action:Parameters<typeof verifyGuestVideoRequest>[2])=>verifyGuestVideoRequest(request,env,action,siteverify)},
    '../../../lib/video-generation-input':{readVideoGenerationInput:async(request:Request)=>request.headers.get('content-type')?.startsWith('multipart/')
      ? readVideoGenerationInput(request) : {ok:true,payload:{prompt:'test',duration:5,resolution:'768p',aspectRatio:'16:9'}}},
    '../../../lib/video-providers':{selectVideoWorkflow:()=> 'test',assertVideoProviderConfigured:()=>{}, submitVideoTask:async(payload:{prompt:string})=>{touched.push('supplier');submittedPrompts.push(payload.prompt);return {providerTaskId:'mock'}}},
    '../../../lib/video-task-activity':{createTrackedVideoTaskStore:(store:unknown)=>store,createVideoTaskActivity:()=>({})},
    '../../../db/video-generation-tasks':{createVideoGenerationTaskStore:()=>({
      reserveAndCreate:async()=>{touched.push('reservation');if(balance<5)return null;balance-=5;return {task,remainingCredits:balance}},
      attachProviderTask:async()=>task,getBalance:async()=>balance,
    })},
    '../../../db/guest-video-trials':{createGuestVideoTrialStore:()=>({getBalance:async()=>balance})},
    '../../../lib/guest-video-trial':{guestVideoNetworkHash:async()=> 'a'.repeat(64),resolveGuestVideoTrial:async()=>{touched.push('guest');return {session:{user:{id:'guest',isGuest:true}}}},withGuestVideoCookie:(response:Response)=>response,guestVideoTrialErrorResponse:()=>new Response('',{status:503})},
    '../../../lib/guest-prompt-optimization': { optimizeGuestVideoPrompt: (payload: Parameters<typeof optimizeGuestVideoPrompt>[0], options: Parameters<typeof optimizeGuestVideoPrompt>[1]) => optimizeGuestVideoPrompt(payload, { ...options, fetchImpl: async () => { touched.push('optimize'); return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ alignment: '', integrated_multimodal_description: '[Shot 1] A quiet scene.', overall_soundscape: 'Quiet ambience.', non_diegetic_music: 'N/A' }) } }] }) } }) },
    '../../../lib/guest-credit-reconciliation':{reconcileGuestCredits:async()=>{}},
    '../../../lib/guest-resource-ownership':{readGuestVideoResourceOwner:async()=>undefined},
    '../../../lib/protected-video-generation':{guestVideoPayloadError,protectVideoGenerationStart},
    '../../../lib/video-references':{uploadVideoReference,resolveVideoReferences},
    'cloudflare:sockets':{connect:()=>{}},
    '../../../../scripts/tuzi-tls-fetch.mjs':{createTuziTlsFetch:()=>async()=>Response.json({})},
    '../../../../scripts/tuzi-image.mjs':{getRequestedImageCreditCost:()=>1,preflightImageGenerationRequest:async()=>null,
      handleImageGenerationRequest:async()=>{touched.push('supplier');return Response.json({success:true,image:{url:'https://example.test/image.png'}})}},
    '../../../lib/guest-image-generation':{generateImageWithGuestAccess},
    '../../../lib/creation-storage':{saveGeneratedImages:async()=>{touched.push('storage')}},
    '../../../lib/image-to-video':{prepareImageAnimation:async(images:unknown)=>images},
    '../../../db/generation-credits':{createGenerationCreditStore:()=>({
      reserve:async()=>{touched.push('reservation');return {id:'image-reservation',remainingCredits:1}},
      getBalance:async()=>1,settle:async()=>{},refund:async()=>({remainingCredits:2}),
    })},
    '../../../db/guest-image-trials':{createGuestImageTrialStore:()=>({
      getById:async()=>null,hasNetwork:async()=>false,getBalance:async()=>2,create:async()=>{touched.push('guest')},
    })},
    '../../../lib/guest-image-animation':{transferImageWithGuestAccess:async()=>{touched.push('transfer');return new Response('',{status:201})}},
  }
  const exports = {} as {Route:{server:{handlers:{POST:(input:{request:Request})=>Promise<Response>}}}}
  const compiled = ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  runInNewContext(compiled,{exports,require:(name:string)=>modules[name]??fallback(name),Request,Response,Headers,URL,crypto,console,Date})
  return { run:(token='',body?:FormData)=>exports.Route.server.handlers.POST({request:new Request(`https://seedance3-pro.com/api/${route}`,{method:'POST',headers:{'x-seedance-verification':token,'cf-connecting-ip':'203.0.113.11'},body})}), touched, submittedPrompts }
}

for (const route of ['videos/generate','videos/references','images/animate','images/generate']) {
  test(`${route}: missing and forged verification cannot provision guests, write references, reserve credits or call a supplier`, async()=>{
    const h = await handler(route,async()=>Response.json({success:false}))
    assert.equal((await h.run()).status,403)
    assert.equal((await h.run('forged')).status,403)
    assert.deepEqual(h.touched,[])
  })
}

test('generation accepts one fresh token but replay never provisions or submits again',async()=>{
  let calls=0
  const h=await handler('videos/generate',async()=>Response.json(++calls===1
    ? {success:true,hostname:'seedance3-pro.com',action:'guest_video_generate'} : {success:false}))
  assert.equal((await h.run('one-use')).status,202)
  assert.equal((await h.run('one-use')).status,403)
  assert.deepEqual(h.touched,['guest','reservation','supplier'])
})

test('authenticated generation retains the existing payment/credit flow without a guest challenge',async()=>{
  const h=await handler('videos/generate',async()=>assert.fail('paid user must not be challenged'),true)
  assert.equal((await h.run()).status,202)
  assert.deepEqual(h.touched,['reservation','supplier'])
})

function imageRequest(duration=5,validImage=true) {
  const data=new FormData()
  data.append('payload',JSON.stringify({prompt:'Animate',duration,resolution:'768p',aspectRatio:'16:9'}))
  data.append('reference',new Blob([new Uint8Array(validImage ? [137,80,78,71,13,10,26,10,0,0,0,0] : [0,0,0,0])],{type:'image/png'}),'image.png')
  return data
}

test('combined upload/generation rejects missing tokens before R2 or credit writes',async()=>{
  const h=await handler('videos/generate',async()=>assert.fail('no token'))
  const response=await h.run('',imageRequest())
  assert.equal(response.status,403)
  assert.equal((await response.json() as {code:string}).code,'GUEST_VERIFICATION_REQUIRED')
  assert.deepEqual(h.touched,[])
})

test('one fresh token uploads and generates once; concurrent replay cannot write or generate twice',async()=>{
  let checks=0
  const h=await handler('videos/generate',async()=>Response.json(++checks===1
    ? {success:true,hostname:'seedance3-pro.com',action:'guest_video_generate'} : {success:false}))
  const responses=await Promise.all([h.run('same-token',imageRequest()),h.run('same-token',imageRequest())])
  assert.deepEqual(responses.map(r=>r.status).sort(),[202,403])
  assert.deepEqual(h.touched,['guest','upload','reservation','supplier'])
})

test('combined requests preserve the two five-second allowance and forbid extra duration',async()=>{
  const h=await handler('videos/generate',async()=>Response.json({success:true,hostname:'seedance3-pro.com',action:'guest_video_generate'}))
  assert.equal((await h.run('token',imageRequest(10))).status,400)
  assert.deepEqual(h.touched,[])
  for (const status of [202,202,403]) assert.equal((await h.run(crypto.randomUUID(),imageRequest())).status,status)
  assert.equal(h.touched.filter(x=>x==='upload').length,2)
  assert.equal(h.touched.filter(x=>x==='supplier').length,2)
})

test('invalid image bytes are rejected before credit reservation or supplier submission',async()=>{
  const h=await handler('videos/generate',async()=>Response.json({success:true,hostname:'seedance3-pro.com',action:'guest_video_generate'}))
  assert.equal((await h.run('fresh',imageRequest(5,false))).status,400)
  assert.deepEqual(h.touched,['guest'])
})


test('image route challenges guests and accepts the exact image action; signed-in requests skip the challenge',async()=>{
  const guest=await handler('images/generate',async()=>Response.json({success:true,hostname:'seedance3-pro.com',action:'guest_image_generate'}))
  assert.equal((await guest.run('fresh-image-token')).status,200)
  assert.deepEqual(guest.touched,['guest','reservation','supplier'])
  const signedIn=await handler('images/generate',async()=>assert.fail('signed-in image must skip challenge'),true)
  assert.equal((await signedIn.run()).status,200)
  assert.deepEqual(signedIn.touched,['reservation','supplier'])
})


test('real generate handler optimizes only after verification and reservation, never for signed-in or exhausted users', async () => {
  const verified: typeof fetch = async () => Response.json({ success: true, hostname: 'seedance3-pro.com', action: 'guest_video_generate' })
  for (const [signedIn, balance] of [[false, 10], [false, 0], [true, 10]] as const) {
    const h = await handler('videos/generate', verified, signedIn, balance, true)
    const response = await h.run('fresh')
    assert.equal(response.status, balance ? 202 : 402)
    assert.deepEqual(h.touched, signedIn ? ['reservation', 'supplier'] : balance ? ['guest', 'reservation', 'optimize', 'supplier'] : ['guest', 'reservation'])
    assert.equal(response.headers.get('x-seedance-prompt-optimization'), !signedIn && balance ? 'optimized' : 'off')
    const body = await response.json() as { promptOptimization?: { status: string; prompt: string } }
    if (!signedIn && balance) {
      assert.deepEqual(body.promptOptimization, { status: 'optimized', prompt: h.submittedPrompts[0] })
      assert.equal(response.headers.get('cache-control'), 'no-store')
      assert.ok(!JSON.stringify(body).includes('test-only'))
    } else assert.equal(body.promptOptimization, undefined)
  }
  const blocked = await handler('videos/generate', async () => Response.json({success:false}), false, 10, true)
  assert.equal((await blocked.run('forged')).status, 403)
  assert.deepEqual(blocked.touched, [])
})
