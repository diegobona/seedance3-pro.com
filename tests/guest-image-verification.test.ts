import assert from 'node:assert/strict'
import test from 'node:test'
import { generateImageWithGuestAccess } from '../src/lib/guest-image-generation'
import { verifyGuestVideoRequest } from '../src/lib/guest-video-verification'

const env = { TURNSTILE_SITE_KEY:'public', TURNSTILE_SECRET:'private', TURNSTILE_HOSTNAMES:'seedance3-pro.com' }
function harness(siteverify: typeof fetch, signedIn = false) {
  const touched: string[] = []
  const run = (token = '') => {
    const request = new Request('https://seedance3-pro.com/api/images/generate', {
      method:'POST', headers:{'cf-connecting-ip':'203.0.113.10','x-seedance-verification':token},
    })
    const options = {
      request,
      getSession: async () => signedIn ? {user:{id:'paid'}} : null,
      verifyGuest: (request: Request) => verifyGuestVideoRequest(request, env, 'guest_image_generate' as Parameters<typeof verifyGuestVideoRequest>[2], siteverify),
      guestOptions: {secret:'image-verification-test-secret-at-least-32-characters',store:{
        getById:async()=>null,hasNetwork:async()=>false,getBalance:async()=>2,
        create:async()=>{touched.push('guest')},
      }},
      creditStore: {
        reserve:async()=>{touched.push('reserve');return {id:'reservation',remainingCredits:1}},
        settle:async()=>{touched.push('settle')},refund:async()=>({remainingCredits:2}),getBalance:async()=>1,
      },
      preflight:async()=>null,getCreditCost:()=>1,
      generate:async()=>{touched.push('supplier');touched.push('storage');return Response.json({success:true,image:{url:'https://example.test/result.png'}})},
    }
    return generateImageWithGuestAccess(options)
  }
  return {run,touched}
}

test('image trial rejects missing or forged verification before guest allocation, credits, supplier or storage',async()=>{
  const h=harness(async()=>Response.json({success:false}))
  assert.equal((await h.run()).status,403)
  assert.equal((await h.run('forged')).status,403)
  assert.deepEqual(h.touched,[])
})

test('image verification requires the image action, not a video token',async()=>{
  const h=harness(async()=>Response.json({success:true,hostname:'seedance3-pro.com',action:'guest_video_generate'}))
  assert.equal((await h.run('video-token')).status,403)
  assert.deepEqual(h.touched,[])
})

test('fresh image token permits one request; concurrent replay cannot allocate or generate twice',async()=>{
  let calls=0
  const h=harness(async()=>Response.json(++calls===1
    ? {success:true,hostname:'seedance3-pro.com',action:'guest_image_generate'} : {success:false}))
  const responses=await Promise.all([h.run('same-token'),h.run('same-token')])
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,403])
  assert.deepEqual(h.touched,['guest','reserve','supplier','storage','settle'])
})

test('image verification service failure blocks guests without side effects',async()=>{
  const h=harness(async()=>{throw Error('verification unavailable')})
  assert.equal((await h.run('token')).status,503)
  assert.deepEqual(h.touched,[])
})

test('signed-in image generation uses account credits without guest verification',async()=>{
  const h=harness(async()=>assert.fail('signed-in user must not be challenged'),true)
  assert.equal((await h.run()).status,200)
  assert.deepEqual(h.touched,['reserve','supplier','storage','settle'])
})
