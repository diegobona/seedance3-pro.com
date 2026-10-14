import assert from 'node:assert/strict';
import test from 'node:test';
import { handleImageGenerationRequest, preflightImageGenerationRequest } from '../scripts/tuzi-image.mjs';
import { requestImageGeneration } from '../app/image-generation.mjs';
import { sizeForAspectRatio, creditCostForQuantity } from '../app/studio-controls.mjs';

const config = await import('../app/image-models.mjs').catch(() => null);
const model = 'gpt-image-2-5-1k';
const env = { TUZI_API_KEY: 'fixture-key', IMAGE_RATE_LIMITER: { limit: async () => ({ success: true }) } };

function request({ selected = model, header = selected, size = '1254x1254', quantity = '1', references = [], duplicate = false } = {}) {
  const form = new FormData();
  form.set('prompt', 'A ceramic rabbit on a green table');
  form.set('quantity', quantity);
  form.set('resolution', '1K');
  form.set('size', size);
  if (selected !== null) form.append('model', selected);
  if (duplicate) form.append('model', selected);
  for (const file of references) form.append('image', file, 'reference.png');
  const headers = { 'x-seedance-image-quantity': quantity };
  if (header !== null) headers['x-seedance-image-model'] = header;
  return new Request('https://seedance3-pro.com/api/images/generate', { method: 'POST', body: form, headers });
}

test('shared image model configuration preserves GPT Image 2 and Tuzi 2.5 fixed sizes and costs', () => {
  assert.ok(config, 'shared model configuration exists');
  assert.equal(config.getImageModel(model).providerModel, 'gpt-image-2.5-1k');
  assert.equal(config.getImageModel(model).creditCost, 5);
  assert.equal(config.getImageModel('arbitrary-provider-model'), null);
  assert.equal(sizeForAspectRatio('1:1'), '1024x1024');
  assert.equal(sizeForAspectRatio('1:1', model), '1254x1254');
  assert.equal(sizeForAspectRatio('16:9', model), '1672x941');
  assert.equal(sizeForAspectRatio('9:21', model), '821x1915');
  assert.equal(creditCostForQuantity(3, model), 15);
});

test('Tuzi 2.5 text generation uses the exact allowlisted provider alias and its square size', async () => {
  let sent;
  const response = await handleImageGenerationRequest(request(), env, { fetchImpl: async (url, init) => {
    assert.equal(url, 'https://api.tu-zi.com/v1/images/generations');
    sent = JSON.parse(init.body);
    return Response.json({ data: [{ b64_json: 'iVBORw0KGgo=' }] });
  } });
  assert.equal(response.status, 200);
  assert.equal(sent.model, 'gpt-image-2.5-1k');
  assert.equal(sent.size, '1254x1254');
  assert.equal(sent.n, 1);
  assert.equal(sent.quality, 'low');
  assert.equal(sent.response_format, 'b64_json');
  assert.equal((await response.json()).image.dataUrl, 'data:image/png;base64,iVBORw0KGgo=');
});

test('old clients without a selected model still generate GPT Image 2', async () => {
  let sent;
  const response = await handleImageGenerationRequest(request({ selected: null, header: null, size: '1024x1024' }), env, { fetchImpl: async (_url, init) => {
    sent = JSON.parse(init.body);
    return Response.json({ data: [{ url: 'https://cdn.example/old.png' }] });
  } });
  assert.equal(response.status, 200);
  assert.equal(sent.model, 'gpt-image-2');
  assert.equal(sent.quality, 'medium');
});

test('invalid image model headers are rejected before rate limiting or provider work', async () => {
  let limited = 0;
  const result = await preflightImageGenerationRequest(request({ selected: 'unlisted-model' }), {
    ...env, IMAGE_RATE_LIMITER: { limit: async () => { limited += 1; return { success: true }; } },
  });
  assert.equal(result?.status, 400);
  assert.equal(limited, 0);
});

test('model/body mismatch, missing model header, duplicates and incorrect model sizes never reach Tuzi', async () => {
  for (const input of [
    { header: 'gpt-image-2' }, { header: null }, { duplicate: true },
    { size: '1024x1024' }, { selected: 'gpt-image-2', size: '1254x1254' },
    { selected: 'gpt-image-2.5-1k' },
  ]) {
    let called = false;
    const response = await handleImageGenerationRequest(request(input), env, { fetchImpl: async () => { called = true; return Response.json({}); } });
    assert.equal(response.status, 400, JSON.stringify(input));
    assert.equal(called, false);
  }
});

test('Tuzi 2.5 reference requests use the documented single and multi-image JSON fields', async () => {
  const file = new Blob([new Uint8Array([137, 80, 78, 71, 0, 255])], { type: 'image/png' });
  for (const references of [[file], [file, file]]) {
    let sent;
    const response = await handleImageGenerationRequest(request({ references }), env, { fetchImpl: async (_url, init) => {
      sent = JSON.parse(init.body);
      return Response.json({ data: [{ url: 'https://cdn.example/edited.png' }] });
    } });
    assert.equal(response.status, 200);
    if (references.length === 1) {
      assert.equal(sent.image, 'data:image/png;base64,iVBORwD/');
      assert.equal(Object.hasOwn(sent, 'images'), false);
    } else {
      assert.deepEqual(sent.images, ['data:image/png;base64,iVBORwD/', 'data:image/png;base64,iVBORwD/']);
      assert.equal(Object.hasOwn(sent, 'image'), false);
    }
    assert.equal((await response.json()).mode, 'image-to-image');
  }
});

test('the client carries the selected model in both body and billing header', async () => {
  await requestImageGeneration({ model, prompt: 'ceramic rabbit', size: '1254x1254', fetchImpl: async (url, init) => {
    assert.equal(url, '/api/images/generate');
    assert.equal(init.body.get('model'), model);
    assert.equal(init.headers['x-seedance-image-model'], model);
    assert.equal(init.body.get('size'), '1254x1254');
    return Response.json({ success: true, image: { url: 'https://cdn.example/new.png' } });
  } });
});

test('Tuzi 2.5 refuses more than four references while GPT Image 2 keeps its previous limit', async () => {
  const file = new Blob([new Uint8Array([137, 80, 78, 71, 0, 255])], { type: 'image/png' });
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return Response.json({ data: [{ url: 'https://cdn.example/edited.png' }] }); };
  const response = await handleImageGenerationRequest(request({ references: [file, file, file, file, file] }), env, { fetchImpl });
  assert.equal(response.status, 400);
  assert.equal(calls, 0);
  const oldResponse = await handleImageGenerationRequest(request({ selected: 'gpt-image-2', size: '1024x1024', references: [file, file, file, file, file] }), env, { fetchImpl });
  assert.equal(oldResponse.status, 200);
  assert.equal(calls, 1);
});
