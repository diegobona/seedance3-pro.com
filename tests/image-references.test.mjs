import test from 'node:test';
import assert from 'node:assert/strict';
import { validateImageReferences } from '../app/image-references.mjs';
import { requestImageGeneration } from '../app/image-generation.mjs';
import { handleImageGenerationRequest } from '../scripts/tuzi-image.mjs';
const files = Array.from({length:16}, (_,i)=>new File([`image-${i+1}`], `reference-${i+1}.png`, {type:'image/png'}));
const env = { TUZI_API_KEY:'test', IMAGE_RATE_LIMITER:{limit:async()=>({success:true})} };

test('all 16 references reach Tuzi edits in order through client and server', async()=>{
  let calls=0;
  const result=await requestImageGeneration({prompt:'Use Image 1 for pose and Image 16 for clothing', referenceFiles:files, fetchImpl:async(_url, init)=>{
    return handleImageGenerationRequest(new Request('https://example.com/api/images/generate',init),env,{fetchImpl:async(url,upstream)=>{
      calls++;
      assert.equal(url,'https://api.tu-zi.com/v1/images/edits');
      const refs=upstream.body.getAll('image');
      assert.deepEqual(refs.map(file=>file.name),files.map(file=>file.name));
      assert.deepEqual(await Promise.all(refs.map(file=>file.text())),await Promise.all(files.map(file=>file.text())));
      return Response.json({data:[{url:'https://example.com/result.png'}]});
    }});
  }});
  assert.equal(calls,1);
  assert.equal(result.mode,'image-to-image');
});

test('17 references are rejected before provider work',async()=>{
  const form=new FormData();form.set('prompt','Test');
  for(const file of [...files,files[0]])form.append('image',file);
  const response=await handleImageGenerationRequest(new Request('https://example.com/api/images/generate',{method:'POST',body:form}),env,{fetchImpl:()=>{throw new Error('Must not call provider');}});
  assert.equal(response.status,400);
  assert.match((await response.json()).message,/16/);
});

test('reference limits cover individual file size, aggregate size, type and empty files',()=>{
  assert.equal(validateImageReferences(files),'');
  assert.match(validateImageReferences([new File([],'empty.png',{type:'image/png'})]),/non-empty/);
  assert.match(validateImageReferences([new File(['x'],'bad.txt',{type:'text/plain'})]),/PNG/);
  const fake = size => ({size,type:'image/png',arrayBuffer(){}});
  assert.match(validateImageReferences([fake(11*1024*1024)]),/10 MB/);
  assert.match(validateImageReferences([fake(9*1024*1024),fake(9*1024*1024),fake(9*1024*1024)]),/24 MB/);
});
