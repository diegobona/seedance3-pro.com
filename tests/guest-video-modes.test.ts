import test from 'node:test'
import assert from 'node:assert/strict'
import { buildYirVideoRequest } from '../scripts/yir-video.mjs'
import { selectVideoWorkflow, YIR_IMAGE_WORKFLOW_ID } from '../src/lib/video-providers'
import { readVideoGenerationInput } from '../src/lib/video-generation-input'
import { optimizeGuestVideoPrompt } from '../src/lib/guest-prompt-optimization'

const base = { prompt: 'The subject waves.', duration: 5, resolution: '768p', aspectRatio: '16:9' }
const urls = Array.from({length: 6}, (_, i) => `https://images.example/${i}.png`)
test('guest multi-image mode submits all five images as references on Metaso', () => {
  const payload = {...base, inputMode: 'reference' as const, referenceImageUrls: urls.slice(0,5)}
  assert.equal(selectVideoWorkflow(payload, {GUEST_VIDEO_PROVIDER:'yir'}, {guest:true}), YIR_IMAGE_WORKFLOW_ID)
  const body = buildYirVideoRequest(payload)
  assert.equal(body.input.type, 'reference')
  assert.deepEqual(body.input.references, urls.slice(0,5).map(url => ({role:'reference_image',url})))
  assert.deepEqual(body.routing, {only:['metaso'],fallback:false})
  assert.equal(body.parameters.duration,5)
})
test('frames mode accepts a required first frame with an optional last frame in order', () => {
  for (const count of [1,2]) {
    const payload={...base,inputMode:'frames' as const,referenceImageUrls:urls.slice(0,count)}
    assert.equal(selectVideoWorkflow(payload,{GUEST_VIDEO_PROVIDER:'yir'},{guest:true}),YIR_IMAGE_WORKFLOW_ID)
    const body=buildYirVideoRequest(payload)
    assert.equal(body.input.type,'image')
    assert.deepEqual(body.input.references,urls.slice(0,count).map((url,index)=>({role:index?'last_frame':'first_frame',url})))
  }
})
test('rejects extra images, missing frames and text with hidden references before submission', () => {
  for(const [mode,count] of [['reference',6],['reference',0],['frames',0],['frames',3],['text',1],['bad',1]] as const) {
    const payload={...base,inputMode:mode,referenceImageUrls:urls.slice(0,count)}
    assert.throws(()=>buildYirVideoRequest(payload))
    assert.throws(()=>selectVideoWorkflow(payload as any,{GUEST_VIDEO_PROVIDER:'yir'},{guest:true}))
  }
})
test('combined multipart preserves five reference files under one verification request',async()=>{
  const form=new FormData()
  form.append('payload',JSON.stringify({...base,inputMode:'reference'}))
  for(let i=0;i<5;i++) form.append('reference',new Blob([`image-${i}`],{type:'image/png'}),`${i}.png`)
  const result=await readVideoGenerationInput(new Request('https://example.com/api/videos/generate',{method:'POST',body:form}))
  assert.equal(result.ok,true)
  if(!result.ok)return
  assert.equal(result.payload.inputMode,'reference')
  assert.deepEqual(await Promise.all(result.references!.map(file=>file.text())),['image-0','image-1','image-2','image-3','image-4'])
  assert.equal(result.payload.referenceImageIds?.length,5)
})
test('optimizer keeps multi-image references as references, not an opening frame',async()=>{
  let seen:any
  const result=await optimizeGuestVideoPrompt({...base,inputMode:'reference',referenceImageUrls:urls.slice(0,5)}, {
    guest:true,environment:{DEEPSEEK_API_KEY:'test-only'},fetchImpl:async(_,init)=>{
      seen=JSON.parse(String(init?.body))
      return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({alignment:'',integrated_multimodal_description:'[Shot 1] The subject from <Picture 1> waves.',overall_soundscape:'N/A',non_diegetic_music:'N/A'})}}]})
    }
  })
  assert.equal(result.status,'optimized')
  assert.equal(seen.messages[1].content.filter((part:any)=>part.type==='image_url').length,5)
  assert.match(seen.messages[0].content, /REFERENCE MODE PRIORITIES/)
  assert.match(seen.messages[0].content, /subject identity, clothing, scene, prop or style/)
  assert.doesNotMatch(seen.messages[0].content, /Only fix grammar/)
  assert.doesNotMatch(result.payload.prompt,/opening frame/)
  assert.equal(result.payload.inputMode,'reference')
})
test('optimizer preserves first and last frame instructions',async()=>{
  let seen:any
  const result=await optimizeGuestVideoPrompt({...base,inputMode:'frames' as const,referenceImageUrls:urls.slice(0,2)}, {
    guest:true,environment:{DEEPSEEK_API_KEY:'test-only'},fetchImpl:async(_,init)=>{
      seen=JSON.parse(String(init?.body))
      return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({alignment:'',integrated_multimodal_description:'[Shot 1] The subject waves.',overall_soundscape:'N/A',non_diegetic_music:'N/A'})}}]})
    }
  })
  assert.equal(JSON.parse(seen.messages[1].content[0].text).mode,'FL2VA')
  assert.match(seen.messages[0].content,/FRAME MODE PRIORITIES/)
  assert.match(seen.messages[0].content,/continuous motion path/)
  assert.doesNotMatch(seen.messages[0].content,/Only fix grammar/)
  assert.equal(result.status,'optimized')
  assert.match(result.payload.prompt,/<Picture 1>.*opening frame/)
  assert.match(result.payload.prompt,/<Picture 2>.*final frame/)
})

test('text optimization focuses on a feasible scene and respects detailed prompts',async()=>{
  let seen:any
  const result=await optimizeGuestVideoPrompt({...base,inputMode:'text',optimizePrompt:true},{
    guest:true,environment:{DEEPSEEK_API_KEY:'test-only'},fetchImpl:async(_,init)=>{
      seen=JSON.parse(String(init?.body))
      return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({alignment:'',integrated_multimodal_description:'[Shot 1] A person waves at the camera.',overall_soundscape:'Quiet outdoor ambience.',non_diegetic_music:'N/A'})}}]})
    }
  })
  assert.equal(result.status,'optimized')
  assert.match(seen.messages[0].content,/TEXT MODE PRIORITIES/)
  assert.match(seen.messages[0].content,/subject, action, setting and camera/)
  assert.match(seen.messages[0].content,/detailed prompt/)
  assert.equal(seen.messages[1].content.length,1)
})
