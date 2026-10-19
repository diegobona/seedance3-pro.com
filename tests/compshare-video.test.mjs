import assert from 'node:assert/strict';
import test from 'node:test';
import { submitCompshareVideoTask, queryCompshareVideoTask } from '../scripts/compshare-video.mjs';

const localTaskId = '5c43b8fb-3d1c-4b11-910b-839b55f73143';
const key = 'sk-ml-private-key';
const payload = { prompt: 'private prompt', duration: 5, resolution: '480p', aspectRatio: '16:9', referenceImageUrls: ['https://seedance3-pro.com/api/videos/references?id=private-reference'] };
const json = (body, init) => Response.json(body, init);
const options = (fetchImpl) => ({ apiKey: key, localTaskId, fetchImpl });
const result = (status, url = 'https://cdn.example.test/output.mp4?signature=1', id = 'provider/1') => json({ task: { id, status, content: { url } } });
const isError = (expected = {}) => (error) => {
  assert.match(error.message, /CompShare|Video provider/);
  for (const sensitive of [key, payload.prompt, payload.referenceImageUrls[0], 'upstream-secret']) {
    assert.equal(JSON.stringify(error, Object.getOwnPropertyNames(error)).includes(sensitive), false);
  }
  for (const [name, value] of Object.entries(expected)) assert.equal(error[name], value, name);
  return true;
};

test('POST matches the fixed H3 first-frame contract and preserves duration and selected ratio', async () => {
  for (const duration of [5, 10, 15]) for (const aspectRatio of ['16:9', '9:16']) {
    let calls = 0;
    const response = await submitCompshareVideoTask({ ...payload, duration, aspectRatio }, options(async (url, init) => {
      calls++;
      assert.equal(url, 'https://cp.compshare.cn/minimax/v2/video_generation');
      assert.equal(init.method, 'POST');
      assert.equal(init.redirect, 'manual');
      assert.equal(init.headers.Authorization, `Bearer ${key}`);
      assert.equal(init.headers['Content-Type'], 'application/json');
      assert.equal(init.headers.Accept, 'application/json');
      assert.equal(init.headers['Idempotency-Key'], `seedance-video:${localTaskId}`);
      assert.ok(init.signal instanceof AbortSignal);
      assert.deepEqual(JSON.parse(init.body), { model: 'MiniMax-H3', content: [
        { type: 'text', text: payload.prompt },
        { type: 'image_url', image_url: { url: payload.referenceImageUrls[0] }, role: 'first_frame' },
      ], resolution: '480P', duration, ratio: aspectRatio, use_context_ir: true });
      return json({ task_id: 'provider/1' });
    }));
    assert.deepEqual(response, { providerTaskId: 'provider/1' });
    assert.equal(calls, 1);
  }
});

test('first-frame submission supports documented inline image data and rejects malformed data before submission', async () => {
  const image = 'data:image/png;base64,iVBORw0KGgo=';
  const response = await submitCompshareVideoTask({ ...payload, referenceImageUrls: [image] }, options(async (_url, init) => {
    assert.equal(JSON.parse(init.body).content[1].image_url.url, image);
    return json({ task_id: 'inline-frame-task' });
  }));
  assert.equal(response.providerTaskId, 'inline-frame-task');
  for (const invalid of ['data:image/svg+xml;base64,AAAA', 'data:image/png;base64,not base64', 'data:image/png;base64,', 'data:image/png;base64,AAA']) {
    await assert.rejects(submitCompshareVideoTask({ ...payload, referenceImageUrls: [invalid] }, options(async () => {
      assert.fail('invalid image data must never reach the provider');
    })), isError({ code: 'COMPSHARE_CONFIGURATION_ERROR' }));
  }
});

test('invalid input, local ID and blank credentials fail before fetch', async () => {
  const invalid = [
    { referenceImageUrls: undefined }, { referenceImageUrls: [] },
    { referenceImageUrls: [...payload.referenceImageUrls, ...payload.referenceImageUrls] },
    ...['http://example.test/ref.png', 'https://user:pass@example.test/ref.png', 'not-a-url', 'https://example.test/ref#fragment'].map(url => ({ referenceImageUrls: [url] })),
    { resolution: '768p' }, { duration: 4 }, { duration: '5' }, { aspectRatio: '1:1' }, { prompt: '' }, { prompt: 'x'.repeat(7001) },
  ];
  let calls = 0;
  const fetchImpl = async () => { calls++; throw new Error('must not fetch'); };
  for (const change of invalid) await assert.rejects(submitCompshareVideoTask({ ...payload, ...change }, options(fetchImpl)), isError({ status: 503, ambiguous: false }));
  for (const change of [{ apiKey: '' }, { apiKey: ' ' }, { localTaskId: 'provider-task' }, { localTaskId: '' }]) {
    await assert.rejects(submitCompshareVideoTask(payload, { ...options(fetchImpl), ...change }), isError({ status: 503 }));
  }
  assert.equal(calls, 0);
});

test('GET encodes task ID, checks response ID, and normalizes only the exact documented statuses', async () => {
  for (const [status, expected] of [
    ['queued', { status: 'queued', terminal: false }], ['running', { status: 'running', terminal: false }],
    ['failed', { status: 'failed', terminal: true }], ['cancelled', { status: 'failed', terminal: true }],
    ['succeeded', { status: 'succeeded', terminal: true, videoUrl: 'https://cdn.example.test/output.mp4?signature=1' }],
    ['SUCCESS', { status: 'unknown', terminal: false, retriable: true }],
    ['new-state', { status: 'unknown', terminal: false, retriable: true }],
  ]) {
    assert.deepEqual(await queryCompshareVideoTask('provider/1', options(async (url, init) => {
      assert.equal(url, 'https://cp.compshare.cn/minimax/v2/query/video_generation/provider%2F1');
      assert.equal(init.method, 'GET');
      assert.equal(init.redirect, 'manual');
      assert.equal(init.headers.Authorization, `Bearer ${key}`);
      assert.equal(init.headers.Accept, 'application/json');
      return result(status);
    })), expected);
  }
  await assert.rejects(queryCompshareVideoTask('provider/1', options(async () => result('succeeded', undefined, 'other-id'))), isError({ retriable: false }));
});

test('query rejects unsafe result URLs and invalid IDs before fetch', async () => {
  for (const url of ['http://cdn.test/v.mp4', 'https://user:pass@cdn.test/v.mp4', 'https://cdn.test/v.webm', 'javascript:alert(1)', 'https://cdn.test/v.mp4#fragment', '', null]) {
    await assert.rejects(queryCompshareVideoTask('provider/1', options(async () => result('succeeded', url))), isError({ retriable: false }));
  }
  let calls = 0;
  for (const id of ['', ' ', null, 'id\nsecret', 'a'.repeat(257), '.', '..', '\ud800']) {
    await assert.rejects(queryCompshareVideoTask(id, options(async () => { calls++; })), isError());
  }
  assert.equal(calls, 0);
});

test('CompShare accepts the documented 7000-character prompt boundary', async () => {
  assert.deepEqual(await submitCompshareVideoTask({ ...payload, prompt: 'x'.repeat(7000) }, options(async () => json({ task_id: 'id' }))), { providerTaskId: 'id' });
});

test('query configuration failures and 408/425/429/5xx or authentication responses are retriable with bounded Retry-After', async () => {
  await assert.rejects(queryCompshareVideoTask('provider/1', { apiKey: '' }), isError({ status: 503, retriable: true }));
  for (const status of [401, 403, 408, 425, 429, 500, 503]) {
    await assert.rejects(queryCompshareVideoTask('provider/1', options(async () => json({ message: `upstream-secret ${key}` }, { status, headers: { 'retry-after': '20' } }))), isError({ retriable: true, providerStatus: status, retryAfterSeconds: 20 }));
  }
  for (const retry of ['-1', '999999', 'Infinity', '20.5', 'upstream-secret']) {
    await assert.rejects(queryCompshareVideoTask('provider/1', options(async () => json({}, { status: 429, headers: { 'retry-after': retry } }))), isError({ retryAfterSeconds: undefined }));
  }
  await assert.rejects(queryCompshareVideoTask('provider/1', options(async () => json({ message: 'upstream-secret' }, { status: 400 }))), isError({ retriable: false }));
});

test('no automatic POST retry on timeout, redirect, network or interrupted response; GET can retry', async () => {
  for (const operation of ['submit', 'query']) for (const name of ['TimeoutError', 'TypeError', 'AbortError', 'read']) {
    let calls = 0;
    const fetchImpl = async (_url, init) => {
      calls++;
      assert.equal(init.redirect, 'manual');
      if (name === 'read') return new Response(new ReadableStream({ start(c) { c.error(new Error(`upstream-secret ${key}`)); } }));
      throw Object.assign(new Error(`upstream-secret ${key}`), { name });
    };
    await assert.rejects(operation === 'submit' ? submitCompshareVideoTask(payload, options(fetchImpl)) : queryCompshareVideoTask('provider/1', options(fetchImpl)), isError({ ambiguous: operation === 'submit', retriable: operation === 'query' }));
    assert.equal(calls, 1);
  }
  let timeout;
  await submitCompshareVideoTask(payload, { ...options(async () => json({ task_id: 'id' })), signalFactory: ms => { timeout = ms; return new AbortController().signal; } });
  assert.equal(timeout, 15_000);
});

test('malformed, oversized or incomplete success bodies are safely rejected; submission remains uncertain', async () => {
  for (const operation of ['submit', 'query']) {
    const run = fetchImpl => operation === 'submit' ? submitCompshareVideoTask(payload, options(fetchImpl)) : queryCompshareVideoTask('provider/1', options(fetchImpl));
    for (const body of ['{', JSON.stringify({}), JSON.stringify({ task_id: '' }), 'x'.repeat(256 * 1024 + 1)]) {
      await assert.rejects(run(async () => new Response(body)), isError({ ambiguous: operation === 'submit' }));
    }
    let cancelled = false;
    await assert.rejects(run(async () => new Response(new ReadableStream({
      pull(controller) { controller.enqueue(new Uint8Array(256 * 1024 + 1)); },
      cancel() { cancelled = true; },
    }))), isError());
    assert.equal(cancelled, true);
    await assert.rejects(run(async () => new Response('', { headers: { 'content-length': String(256 * 1024 + 1) } })), isError());
  }
});

test('error bodies are streamed with a separate 64KiB bound and never relayed', async () => {
  for (const operation of ['submit', 'query']) {
    let cancelled = false;
    const fetchImpl = async () => new Response(new ReadableStream({
      pull(controller) { controller.enqueue(new Uint8Array(64 * 1024 + 1)); },
      cancel() { cancelled = true; },
    }), { status: 503 });
    await assert.rejects(operation === 'submit' ? submitCompshareVideoTask(payload, options(fetchImpl)) : queryCompshareVideoTask('provider/1', options(fetchImpl)), isError({ providerStatus: 503 }));
    assert.equal(cancelled, true);
  }
});
