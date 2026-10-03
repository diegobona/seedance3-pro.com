import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { validateImageReferences } from '../app/image-references.mjs';
import { requestImageGeneration } from '../app/image-generation.mjs';
import { handleImageGenerationRequest } from '../scripts/tuzi-image.mjs';
const referenceTypes = [
  { mime: 'image/png', extension: 'png' },
  { mime: 'image/jpeg', extension: 'jpg' },
  { mime: 'image/webp', extension: 'webp' },
];
const files = Array.from({ length: 16 }, (_, i) => {
  const { mime, extension } = referenceTypes[i % referenceTypes.length];
  const bytes = new Uint8Array([0, 255, 128, i, i + 1, 13, 10, 65 + i]);
  return new File([bytes], `reference-${i + 1}.${extension}`, { type: mime });
});
const env = { TUZI_API_KEY:'test', IMAGE_RATE_LIMITER:{limit:async()=>({success:true})} };

test('all 16 references reach Tuzi generations with their binary contents, MIME types and order intact', async () => {
  const calls = [];
  const result = await requestImageGeneration({
    prompt: 'Use Image 1 for pose and Image 16 for clothing',
    referenceFiles: files,
    fetchImpl: async (_url, init) => handleImageGenerationRequest(
      new Request('https://example.com/api/images/generate', init),
      env,
      {
        fetchImpl: async (url, upstream) => {
          calls.push({ url, upstream });
          return Response.json({ data: [{ url: 'https://example.com/result.png' }] });
        },
      }
    ),
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.tu-zi.com/v1/images/generations');
  assert.equal(calls[0].upstream.method, 'POST');
  assert.equal(calls[0].upstream.headers['Content-Type'], 'application/json');
  const payload = JSON.parse(calls[0].upstream.body);
  assert.equal(payload.model, 'gpt-image-2');
  assert.equal(payload.image.length, 16);
  for (const [i, dataUrl] of payload.image.entries()) {
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
    assert.ok(match, `Reference ${i + 1} must be a full image data URL`);
    assert.equal(match[1], files[i].type, `Reference ${i + 1} MIME type`);
    assert.deepEqual(
      Buffer.from(match[2], 'base64'),
      Buffer.from(await files[i].arrayBuffer()),
      `Reference ${i + 1} binary contents and position`
    );
  }
  assert.equal(result.mode, 'image-to-image');
});

test('text-only requests omit the upstream image field when references are absent or empty', async () => {
  for (const referenceFiles of [undefined, []]) {
    const calls = [];
    const result = await requestImageGeneration({
      prompt: 'A text-only image',
      referenceFiles,
      fetchImpl: async (_url, init) => handleImageGenerationRequest(
        new Request('https://example.com/api/images/generate', init),
        env,
        {
          fetchImpl: async (url, upstream) => {
            calls.push({ url, upstream });
            return Response.json({ data: [{ url: 'https://example.com/result.png' }] });
          },
        }
      ),
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.tu-zi.com/v1/images/generations');
    assert.equal(calls[0].upstream.headers['Content-Type'], 'application/json');
    assert.equal(Object.hasOwn(JSON.parse(calls[0].upstream.body), 'image'), false);
    assert.equal(result.mode, 'text-to-image');
  }
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
