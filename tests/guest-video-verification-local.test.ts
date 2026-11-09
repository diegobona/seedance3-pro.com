import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { transform } from 'esbuild'

const testEnv = { TURNSTILE_SITE_KEY:'1x00000000000000000000AA', TURNSTILE_SECRET:'1x0000000000000000000000000000000AA', TURNSTILE_HOSTNAMES:'localhost,127.0.0.1,seedance3-pro.com' }
const source = await readFile(new URL('../src/lib/guest-video-verification.ts',import.meta.url),'utf8')
async function build(development:boolean) {
  const {code}=await transform(source,{loader:'ts',format:'esm',define:{'import.meta.env':JSON.stringify({DEV:development})}})
  return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
}
const request=(host='127.0.0.1',token='XXXX.DUMMY.TOKEN.XXXX')=>new Request(`http://${host}/api/videos/references`,{method:'POST',headers:{'x-seedance-verification':token}})
const dummySuccess=async()=>Response.json({success:true,hostname:'example.com','error-codes':[]})
test('official test validation works for both local video actions in development',async()=>{
  const {verifyGuestVideoRequest}=await build(true)
  for(const action of ['guest_video_reference','guest_video_generate']) {
    assert.equal(await verifyGuestVideoRequest(request(),testEnv,action,dummySuccess),null)
  }
})
test('dummy validation cannot pass production builds, public hosts, real keys, or rejected tokens',async()=>{
  const prod=await build(false),dev=await build(true)
  assert.equal((await prod.verifyGuestVideoRequest(request(),testEnv,'guest_video_generate',dummySuccess)).status,403)
  assert.equal((await dev.verifyGuestVideoRequest(request('seedance3-pro.com'),testEnv,'guest_video_generate',dummySuccess)).status,403)
  assert.equal((await dev.verifyGuestVideoRequest(request(),{...testEnv,TURNSTILE_SECRET:'real-secret'},'guest_video_generate',dummySuccess)).status,403)
  assert.equal((await dev.verifyGuestVideoRequest(request('localhost','not-the-dummy-token'),testEnv,'guest_video_generate',dummySuccess)).status,403)
  assert.equal((await dev.verifyGuestVideoRequest(request(),testEnv,'guest_video_generate',async()=>Response.json({success:false}))).status,403)
})
