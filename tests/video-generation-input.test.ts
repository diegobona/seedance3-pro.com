import assert from 'node:assert/strict'
import test from 'node:test'
import { readVideoGenerationInput } from '../src/lib/video-generation-input'

const payload = { prompt: 'Animate a sunset', duration: 5, resolution: '768p', aspectRatio: '16:9' }
function request(form: FormData) {
  return new Request('https://seedance3-pro.com/api/videos/generate', { method: 'POST', body: form })
}
function form() {
  const data = new FormData()
  data.append('payload', JSON.stringify(payload))
  data.append('reference', new Blob(['image bytes'], {type:'image/png'}), 'image.png')
  return data
}
test('combined request retains the image and validates the generation fields with the existing preflight', async () => {
  const input = await readVideoGenerationInput(request(form()))
  assert.equal(input.ok, true)
  if (!input.ok) return
  assert.equal(await input.reference?.text(), 'image bytes')
  assert.equal(input.payload.prompt, payload.prompt)
  assert.equal(input.payload.referenceImageIds?.length, 1)
  for (const bad of [{duration:99}, {resolution:'invalid'}, {prompt:''}, {unknown:'field'}]) {
    const data = form(); data.set('payload',JSON.stringify({...payload,...bad}))
    assert.equal((await readVideoGenerationInput(request(data))).ok, false)
  }
})
test('combined uploads reject extra fields, duplicate images, mixed IDs and unsupported content', async () => {
  for (const change of [
    (f:FormData) => f.append('reference',new Blob(['other'],{type:'image/png'})),
    (f:FormData) => f.append('extra','x'),
    (f:FormData) => f.set('payload',JSON.stringify({...payload,referenceImageIds:[crypto.randomUUID()]})),
    (f:FormData) => f.set('payload','['),
    (f:FormData) => f.set('reference',new Blob(['text'],{type:'text/plain'})),
    (f:FormData) => f.set('reference','not a file'),
    (f:FormData) => f.set('payload','x'.repeat(16385)),
  ]) {
    const data=form(); change(data)
    assert.equal((await readVideoGenerationInput(request(data))).ok,false)
  }
})
test('oversized bodies are bounded even when the client omits Content-Length', async () => {
  let cancelled=false
  const stream=new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(50*1024*1024+65536)) },
    cancel() { cancelled=true },
  })
  const input=await readVideoGenerationInput(new Request('https://seedance3-pro.com/api/videos/generate',{
    method:'POST', headers:{'content-type':'multipart/form-data; boundary=test'}, body:stream,duplex:'half',
  } as RequestInit))
  assert.equal(input.ok,false)
  if (!input.ok) assert.equal(input.response.status,413)
  assert.equal(cancelled,true)
})
test('existing text/ID JSON submissions remain supported',async()=>{
  const input=await readVideoGenerationInput(new Request('https://seedance3-pro.com/api/videos/generate',{
    method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload),
  }))
  assert.equal(input.ok,true)
})
