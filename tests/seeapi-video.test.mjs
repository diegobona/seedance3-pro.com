import test from 'node:test';
import assert from 'node:assert/strict';
import { submitSeeApiVideoTask, querySeeApiVideoTask, buildSeeApiVideoRequest, areSeeApiReferencesReachable } from '../scripts/seeapi-video.mjs';

const payload = { prompt: 'A paper fox walks slowly', duration: 5, resolution: '768p', aspectRatio: '16:9' };
const localTaskId = '7fb56c12-59c1-4d10-92a5-c34931ba42bb';

test('local image preflight rejects disconnected tunnels and HTML pages before generation', async () => {
  const urls = ['https://test.lhr.life/api/videos/references?id=example'];
  for (const response of [new Response('no tunnel', { status: 502 }),
    new Response('<html>warning</html>', { headers: { 'content-type': 'text/html' } }),
    new Response('<html>warning</html>', { headers: { 'content-type': 'image/png' } }),
    new Response(null, { status: 302, headers: { location: 'http://localhost/private' } })]) {
    assert.equal(await areSeeApiReferencesReachable(urls, { fetchImpl: async (_, init) => {
      assert.equal(init.method, 'GET'); assert.equal(init.redirect, 'manual');
      assert.equal(init.headers, undefined); return response;
    } }), false);
  }
  assert.equal(await areSeeApiReferencesReachable(urls, { fetchImpl: async () => { throw Error('timeout'); } }), false);
  let chunks = 0;
  assert.equal(await areSeeApiReferencesReachable(urls, { fetchImpl: async () => new Response(new ReadableStream({
    pull(controller) {
      if (chunks++ === 0) controller.enqueue(Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13]));
      else controller.error(new Error('download interrupted'));
    },
  }), { headers: { 'content-type': 'image/png' } }) }), false);
  assert.equal(await areSeeApiReferencesReachable(['http://localhost/private'], { fetchImpl: async () => { assert.fail('must not fetch private URLs'); } }), false);
  assert.equal(await areSeeApiReferencesReachable(urls, { fetchImpl: async () => new Response(
    Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13]), { headers: { 'content-type': 'image/png' } }
  ) }), true);
});

test('text and image requests use the exact Turbo model and documented endpoint fields', () => {
  assert.deepEqual(buildSeeApiVideoRequest(payload), { model: 'minimax-h3-max-turbo', endpoint: 'text-to-video', provider: 'fal', input: {
    prompt: payload.prompt, duration_seconds: 5, resolution: '768P', prompt_expansion_mode: 'balanced', aspect_ratio: '16:9',
  } });
  const image = buildSeeApiVideoRequest({ ...payload, referenceImageUrls: ['https://example.com/frame.png'] });
  assert.equal(image.endpoint, 'image-to-video');
  assert.equal(image.input.first_frame_image, 'https://example.com/frame.png');
  assert.ok(!('aspect_ratio' in image.input));
  assert.throws(() => buildSeeApiVideoRequest({ ...payload, duration: 10 }));
  assert.throws(() => buildSeeApiVideoRequest({ ...payload, referenceImageUrls: ['https://example.com/a.png', 'https://example.com/b.png'] }));
  assert.throws(() => buildSeeApiVideoRequest({ ...payload, referenceImageUrls: ['http://127.0.0.1/image'] }));
});

test('submission is authenticated server-side and carries a stable idempotency key', async () => {
  let calls = 0;
  const result = await submitSeeApiVideoTask(payload, { apiKey: 'private-test-key', localTaskId, fetchImpl: async (url, init) => {
    calls++; assert.equal(url, 'https://api.seeapi.com/v1/generations');
    assert.equal(init.headers.Authorization, 'Bearer private-test-key');
    assert.equal(init.headers['Idempotency-Key'], `seedance-video:${localTaskId}`);
    assert.equal(init.redirect, 'manual');
    assert.equal(JSON.parse(init.body).endpoint, 'text-to-video');
    return Response.json({ generation: { id: 'task_full-id', status: 'processing' } }, { status: 202 });
  } });
  assert.deepEqual(result, { providerTaskId: 'task_full-id' }); assert.equal(calls, 1);
});

test('polling uses the persisted ID and returns the video asset rather than a thumbnail', async () => {
  assert.deepEqual(await querySeeApiVideoTask('task_full-id', { apiKey: 'key', fetchImpl: async url => {
    assert.equal(url, 'https://api.seeapi.com/v1/generations/task_full-id');
    return Response.json({ generation: { status: 'succeeded', result: { assets: [
      { type: 'image', url: 'https://cdn.example.com/poster.png' }, { type: 'video', url: 'https://cdn.example.com/video.mp4' },
    ] } } });
  } }), { status: 'succeeded', terminal: true, videoUrl: 'https://cdn.example.com/video.mp4' });
  for (const status of ['failed', 'canceled', 'refunded', 'expired']) assert.deepEqual(await querySeeApiVideoTask('task1', {
    apiKey: 'key', fetchImpl: async () => Response.json({ generation: { status } }),
  }), { status: 'failed', terminal: true });
  assert.deepEqual(await querySeeApiVideoTask('task1', { apiKey: 'key', fetchImpl: async () => Response.json({ generation: { status: 'processing' } }) }), { status: 'running', terminal: false });
});

test('transient status errors keep an accepted task alive; submission ambiguity never triggers fallback', async () => {
  for (const status of [401, 403, 404, 429, 503]) await assert.rejects(querySeeApiVideoTask('task1', {
    apiKey: 'key', fetchImpl: async () => new Response('private provider details', { status }),
  }), e => e.retriable === true && !e.message.includes('private'));
  await assert.rejects(submitSeeApiVideoTask(payload, { apiKey: 'key', localTaskId, fetchImpl: async () => { throw Error('secret'); } }),
    e => e.ambiguous === true && !e.message.includes('secret'));
  await assert.rejects(submitSeeApiVideoTask(payload, { apiKey: '', localTaskId, fetchImpl: async () => { throw Error('must not call'); } }),
    e => e.code === 'SEEAPI_CONFIGURATION_ERROR');
  await assert.rejects(querySeeApiVideoTask('task1', { apiKey: 'key', fetchImpl: async () => Response.json({ generation: { status: 'succeeded', result: { assets: [{ type: 'video', url: 'javascript:alert(1)' }] } } }) }));
});

test('only a terminal failure with confirmed zero provider charge releases the safety budget', async () => {
  for (const consumed of [undefined, 90, '0']) {
    const result = await querySeeApiVideoTask('task1', { apiKey: 'key', fetchImpl: async () => Response.json({ generation: { status: 'failed', consumed_credits: consumed } }) });
    assert.deepEqual(result, { status: 'failed', terminal: true });
  }
  assert.deepEqual(await querySeeApiVideoTask('task1', { apiKey: 'key', fetchImpl: async () => Response.json({ generation: { status: 'failed', consumed_credits: 0 } }) }),
    { status: 'failed', terminal: true, freeCostRefundable: true });
});
