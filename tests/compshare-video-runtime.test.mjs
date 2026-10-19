import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const apiKey = 'offline-runtime-key';
const localTaskId = '5c43b8fb-3d1c-4b11-910b-839b55f73143';
const payload = { prompt: 'Offline runtime regression', duration: 5, resolution: '480p', aspectRatio: '16:9',
  referenceImageUrls: ['https://seedance3-pro.com/api/videos/references?id=offline'] };

async function runtime(outboundService) {
  return new Miniflare(convertV4MiniflareOptions({
    // Match the deployed Worker. Use its real fetch rather than injecting fetchImpl.
    compatibilityDate: '2026-09-18', compatibilityFlags: ['nodejs_compat'],
    modules: [
      { type: 'ESModule', path: 'entry.mjs', contents: `
        import { submitCompshareVideoTask, queryCompshareVideoTask } from './compshare-video.mjs';
        export default { async fetch(request) {
          try {
            const options = ${JSON.stringify({ apiKey, localTaskId })};
            const result = new URL(request.url).pathname === '/submit'
              ? await submitCompshareVideoTask(${JSON.stringify(payload)}, options)
              : await queryCompshareVideoTask('runtime-task', options);
            return Response.json({ result });
          } catch (error) {
            return Response.json({ code: error.code, providerStatus: error.providerStatus,
              ambiguous: error.ambiguous, retriable: error.retriable }, { status: 502 });
          }
        } };` },
      { type: 'ESModule', path: 'compshare-video.mjs', contents: await readFile(new URL('../scripts/compshare-video.mjs', import.meta.url), 'utf8') },
    ],
    // Intercept every outbound destination so these tests cannot reach a real provider.
    outboundService,
  }));
}

test('real workerd fetch submits and queries the CompShare adapter with mocked outbound transport', async () => {
  const requests = [];
  const worker = await runtime(async request => {
    requests.push({ url: request.url, method: request.method, authorization: request.headers.get('authorization'),
      idempotency: request.headers.get('idempotency-key') });
    return Response.json(request.method === 'POST'
      ? { task_id: 'runtime-task' }
      : { task: { id: 'runtime-task', status: 'queued' } });
  });
  try {
    const submitted = await worker.dispatchFetch('https://runtime.test/submit');
    assert.equal(submitted.status, 200, 'native workerd fetch must accept the adapter request options');
    assert.deepEqual(await submitted.json(), { result: { providerTaskId: 'runtime-task' } });
    const queried = await worker.dispatchFetch('https://runtime.test/query');
    assert.equal(queried.status, 200);
    assert.deepEqual(await queried.json(), { result: { status: 'queued', terminal: false } });
    assert.deepEqual(requests, [
      { url: 'https://cp.compshare.cn/minimax/v2/video_generation', method: 'POST', authorization: `Bearer ${apiKey}`, idempotency: `seedance-video:${localTaskId}` },
      { url: 'https://cp.compshare.cn/minimax/v2/query/video_generation/runtime-task', method: 'GET', authorization: `Bearer ${apiKey}`, idempotency: null },
    ]);
  } finally { await worker.dispose(); }
});

test('workerd rejects every provider redirect without following, forwarding credentials or resubmitting', async () => {
  const requests = [];
  let redirectStatus = 301;
  const worker = await runtime(async request => {
    requests.push({ url: request.url, method: request.method, authorization: request.headers.get('authorization') });
    if (new URL(request.url).origin === 'https://cp.compshare.cn') {
      return new Response(null, { status: redirectStatus, headers: { location: 'https://redirect-target.test/stolen' } });
    }
    return Response.json({ task_id: 'unexpected-follow', task: { id: 'runtime-task', status: 'queued' } });
  });
  try {
    for (redirectStatus of [301, 302, 303, 307, 308]) for (const operation of ['submit', 'query']) {
      requests.length = 0;
      const response = await worker.dispatchFetch(`https://runtime.test/${operation}`);
      assert.equal(response.status, 502);
      assert.deepEqual(await response.json(), { code: 'COMPSHARE_PROVIDER_FAILURE', providerStatus: redirectStatus,
        ambiguous: false, retriable: false });
      assert.deepEqual(requests, [{
        url: operation === 'submit' ? 'https://cp.compshare.cn/minimax/v2/video_generation'
          : 'https://cp.compshare.cn/minimax/v2/query/video_generation/runtime-task',
        method: operation === 'submit' ? 'POST' : 'GET', authorization: `Bearer ${apiKey}`,
      }], 'only the original provider request is allowed; no redirect or retry may carry credentials');
    }
  } finally { await worker.dispose(); }
});
