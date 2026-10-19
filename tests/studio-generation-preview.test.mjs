import assert from 'node:assert/strict';
import test from 'node:test';
import { initializeStudio } from '../app/studio.js';
import { createStudioEnvironment } from './helpers/studio-dom.mjs';

const taskId = '11111111-1111-4111-8111-111111111111';
const animateId = '22222222-2222-4222-8222-222222222222';
const referenceId = '33333333-3333-4333-8333-333333333333';
const json = (value, status = 200) => Response.json(value, { status });
const imageResult = (name, extra = {}) => json({ success: true, image: { url: `https://images.example/${name}.png`, ...extra } });
const videoResult = status => json({ success: true, task: { id: taskId, status, ...(status === 'succeeded' ? { resultUrl: 'https://videos.example/result.mp4' } : {}) } });

async function flush() { for (let index = 0; index < 3; index++) await new Promise(resolve => setImmediate(resolve)); }

function network({ deferAnimate = false } = {}) {
  const calls = [];
  const fetchImpl = (url, options = {}) => {
    const call = { url: String(url), method: options.method || 'GET', options };
    calls.push(call);
    if (call.url.startsWith('/api/credits/balance')) return Promise.resolve(json({ success: true, credits: { remaining: 100, guest: false, expiresDaily: false } }));
    if (call.url.startsWith('/api/images/animate?') && !deferAnimate) return Promise.resolve(json({ success: true, id: referenceId }));
    if (call.url === '/api/videos/references') return Promise.resolve(json({ success: true, id: referenceId }));
    if (!['/api/images/generate', '/api/videos/generate'].includes(call.url) && !call.url.startsWith('/api/videos/status?') && !call.url.startsWith('/api/images/animate?')) {
      throw new Error(`Unexpected test request: ${call.method} ${call.url}`);
    }
    return new Promise((resolve, reject) => { call.resolve = resolve; call.reject = reject; });
  };
  return {
    calls, fetchImpl,
    images: () => calls.filter(call => call.url === '/api/images/generate'),
    videoPosts: () => calls.filter(call => call.url === '/api/videos/generate'),
    videoGets: () => calls.filter(call => call.url.startsWith('/api/videos/status?')),
  };
}

async function setup(context, { modelId, deferAnimate } = {}) {
  const requests = network({ deferAnimate });
  const environment = createStudioEnvironment({ fetchImpl: requests.fetchImpl, modelId });
  let cleanup;
  context.after(async () => {
    try { cleanup?.(); await flush(); } finally { environment.restore(); }
  });
  cleanup = initializeStudio();
  await flush();
  return { ...environment, requests };
}

test('real studio keeps overlapping image/video jobs on their captured models through delayed completion', async context => {
  const { element, input, selectModel, requests } = await setup(context);
  input('studio-prompt', 'A silver cup on a blue table');
  element('generate-button').click();
  assert.equal(requests.images().length, 1);
  assert.equal(element('generation-preview').dataset.state, 'pending');
  assert.equal(element('generation-preview').dataset.model, 'gpt-image-2');

  selectModel('minimax-h3');
  await flush();
  input('studio-prompt', 'Slow orbit around a red sculpture');
  element('generate-button').click();
  assert.equal(requests.videoPosts().length, 1, 'video can start while an image request is unresolved');
  assert.equal(element('generation-preview').dataset.model, 'minimax-h3');
  requests.videoPosts()[0].resolve(videoResult('queued'));
  await flush();
  assert.equal(requests.videoGets().length, 1);
  requests.videoGets()[0].resolve(videoResult('succeeded'));
  await flush();
  assert.equal(element('result-gallery').querySelector('video').src, 'https://videos.example/result.mp4');

  requests.images()[0].resolve(imageResult('cup'));
  await flush();
  assert.equal(element('generation-preview').dataset.model, 'minimax-h3');
  assert.equal(element('result-gallery').querySelector('img'), null, 'background image completion cannot replace video');
  assert.equal(element('view-generation-result').hidden, false);
  assert.match(element('view-generation-result').textContent, /GPT Image 2/);
  element('view-generation-result').click();
  await flush();
  assert.equal(element('generation-preview').dataset.model, 'gpt-image-2');
  assert.equal(element('result-gallery').querySelector('img').src, 'https://images.example/cup.png');
  assert.equal(element('view-generation-result').hidden, true);
});

test('switching between image models restores their pending and completed previews without assigning a late result to the current model', async context => {
  const { element, input, selectModel, requests } = await setup(context);
  input('studio-prompt', 'First model prompt');
  element('generate-button').click();
  selectModel('gpt-image-2-5-1k');
  await flush();
  assert.equal(element('generation-preview').dataset.state, 'idle');
  selectModel('gpt-image-2');
  await flush();
  assert.equal(element('generation-preview').dataset.state, 'pending');
  selectModel('gpt-image-2-5-1k');
  await flush();
  requests.images()[0].resolve(imageResult('model-two'));
  await flush();
  assert.equal(element('generation-preview').dataset.state, 'idle');
  assert.equal(element('result-gallery').querySelector('img'), null);
  input('studio-prompt', 'Second model prompt');
  element('generate-button').click();
  assert.equal(requests.images()[1].options.body.get('model'), 'gpt-image-2-5-1k');
  selectModel('gpt-image-2');
  await flush();
  assert.equal(element('result-gallery').querySelector('img').src, 'https://images.example/model-two.png');
  requests.images()[1].resolve(imageResult('model-two-five'));
  await flush();
  assert.equal(element('result-gallery').querySelector('img').src, 'https://images.example/model-two.png');
  selectModel('gpt-image-2-5-1k');
  await flush();
  assert.equal(element('result-gallery').querySelector('img').src, 'https://images.example/model-two-five.png');
  assert.equal(element('result-model-label').textContent, 'GPT Image 2.5');
});

test('video status callbacks and a background video completion leave the current image job visible', async context => {
  const { element, input, selectModel, requests } = await setup(context, { modelId: 'minimax-h3' });
  input('studio-prompt', 'A delayed video scene');
  element('generate-button').click();
  selectModel('gpt-image-2');
  await flush();
  input('studio-prompt', 'An image while the video is running');
  element('generate-button').click();
  const imageStatus = element('preview-status').textContent;
  const formStatus = element('generation-status').textContent;
  requests.videoPosts()[0].resolve(videoResult('queued'));
  await flush();
  assert.equal(element('generation-preview').dataset.model, 'gpt-image-2');
  assert.equal(element('generation-preview').dataset.state, 'pending');
  assert.equal(element('preview-status').textContent, imageStatus);
  assert.equal(element('generation-status').textContent, formStatus);
  requests.videoGets()[0].resolve(videoResult('succeeded'));
  await flush();
  assert.equal(element('generation-preview').dataset.state, 'pending');
  assert.equal(element('preview-status').textContent, imageStatus);
  assert.equal(element('generation-status').textContent, formStatus);
  assert.equal(element('view-generation-result').hidden, false);
  requests.images()[0].resolve(imageResult('image-before-video-reveal'));
  await flush();
  assert.equal(element('result-gallery').querySelector('img').src, 'https://images.example/image-before-video-reveal.png');
  element('view-generation-result').click();
  await flush();
  assert.equal(element('generation-preview').dataset.model, 'minimax-h3');
  assert.equal(element('result-gallery').querySelector('video').src, 'https://videos.example/result.mp4');
});

test('a prior image retains its exact download and animate action nodes across a second generation and model switches', async context => {
  const { element, input, selectModel, requests, navigations } = await setup(context);
  input('studio-prompt', 'First retained image');
  element('generate-button').click();
  requests.images()[0].resolve(imageResult('retained', { animateId }));
  await flush();
  const item = element('result-gallery').querySelector('.result-item');
  const download = item.querySelector('a');
  const animate = item.querySelector('.animate-image-button');
  input('studio-prompt', 'A second image');
  element('generate-button').click();
  assert.equal(element('generation-history-list').contains(item), true);
  requests.images()[1].resolve(imageResult('latest'));
  await flush();
  selectModel('gpt-image-2-5-1k');
  await flush();
  selectModel('gpt-image-2');
  await flush();
  assert.equal(element('generation-history-list').querySelector('.result-item'), item);
  assert.equal(item.querySelector('a'), download);
  assert.equal(download.href, 'https://images.example/retained.png');
  assert.equal(item.querySelector('.animate-image-button'), animate);
  animate.click();
  await flush();
  assert.equal(requests.calls.filter(call => call.url === `/api/images/animate?image=${animateId}` && call.method === 'POST').length, 1);
  assert.deepEqual(navigations, [`/app/video/minimax-h3?reference=${referenceId}&aspect_ratio=16%3A9`]);
});

test('real video polling timeout stays pending and explicit resume only GETs the stored task', async context => {
  const { element, input, advance, selectModel, requests, sessionStorage } = await setup(context, { modelId: 'minimax-h3' });
  input('studio-prompt', 'A cloud drifts across the sky');
  element('generate-button').click();
  requests.videoPosts()[0].resolve(videoResult('queued'));
  await flush();
  requests.videoGets()[0].resolve(videoResult('running'));
  await flush();
  advance(10 * 60 * 1000 + 1);
  await flush();
  assert.equal(element('generation-preview').dataset.state, 'pending');
  assert.equal(element('preview-resume').hidden, false);
  assert.equal(element('preview-error').hidden, true);
  assert.equal(sessionStorage.getItem('seedance:minimax-h3:active-task'), taskId);
  assert.equal(requests.videoPosts().length, 1);
  assert.equal(requests.videoGets().length, 1, 'timeout must wait for an explicit resume click');
  selectModel('gpt-image-2');
  await flush();
  selectModel('minimax-h3');
  await flush();
  assert.equal(requests.videoGets().length, 1, 'switching back to a paused model must not resume polling');
  assert.equal(element('preview-resume').hidden, false);
  element('preview-resume').click();
  await flush();
  assert.equal(requests.videoPosts().length, 1, 'resume must never submit another paid generation');
  assert.equal(requests.videoGets().length, 2);
  assert.equal(requests.videoGets()[1].url, `/api/videos/status?task=${taskId}`);
  requests.videoGets()[1].resolve(videoResult('succeeded'));
  await flush();
  assert.equal(element('generation-preview').dataset.state, 'succeeded');
  assert.equal(element('result-gallery').querySelector('video').src, 'https://videos.example/result.mp4');
  assert.equal(sessionStorage.getItem('seedance:minimax-h3:active-task'), null);
});

test('explicit image failure retry restores the captured model, prompt, quantity and aspect ratio', async context => {
  const { element, input, change, selectModel, requests } = await setup(context);
  input('studio-prompt', 'The original wide two-image prompt');
  change('image-quantity', '2');
  change('image-aspect-ratio', '16:9');
  element('generate-button').click();
  const original = requests.images()[0].options.body;
  requests.images()[0].resolve(json({ success: false, message: 'Provider temporarily unavailable', code: 'IMAGE_GENERATION_FAILED' }, 503));
  await flush();
  assert.equal(element('generation-preview').dataset.state, 'failed');
  assert.equal(requests.images().length, 1, 'failures do not automatically submit another request');
  input('studio-prompt', 'An unrelated edited prompt');
  change('image-quantity', '1');
  change('image-aspect-ratio', '9:16');
  selectModel('gpt-image-2-5-1k');
  await flush();
  selectModel('gpt-image-2');
  await flush();
  element('preview-retry').click();
  await flush();
  assert.equal(requests.images().length, 2);
  const retried = requests.images()[1].options.body;
  for (const key of ['model', 'prompt', 'quantity', 'size', 'resolution']) assert.equal(retried.get(key), original.get(key), `retry preserves ${key}`);
  requests.images()[1].resolve(imageResult('retried'));
  await flush();
  assert.equal(element('generation-preview').dataset.state, 'succeeded');
});

test('terminal video failure retry uses the captured prompt and video settings after edits', async context => {
  const { element, input, change, requests } = await setup(context, { modelId: 'minimax-h3' });
  input('studio-prompt', 'Original vertical video scene');
  change('video-duration', '10');
  change('video-aspect-ratio', '9:16');
  element('generate-button').click();
  const original = JSON.parse(requests.videoPosts()[0].options.body);
  requests.videoPosts()[0].resolve(videoResult('queued'));
  await flush();
  requests.videoGets()[0].resolve(videoResult('failed'));
  await flush();
  assert.equal(element('generation-preview').dataset.state, 'failed');
  assert.equal(requests.videoPosts().length, 1);
  input('studio-prompt', 'Unrelated horizontal scene');
  change('video-duration', '5');
  change('video-aspect-ratio', '16:9');
  element('preview-retry').click();
  await flush();
  assert.equal(requests.videoPosts().length, 2);
  assert.deepEqual(JSON.parse(requests.videoPosts()[1].options.body), original);
  requests.videoPosts()[1].resolve(videoResult('queued'));
  await flush();
  requests.videoGets()[1].resolve(videoResult('succeeded'));
  await flush();
  assert.equal(element('generation-preview').dataset.state, 'succeeded');
});

test('H3 rejects multiple selections and a pasted second image while retaining the first reference', async context => {
  const { element, document } = await setup(context, { modelId: 'minimax-h3' });
  document.querySelector('[data-video-mode="reference"]').click();
  const first = new File(['first'], 'first.png', { type: 'image/png' });
  const second = new File(['second'], 'second.png', { type: 'image/png' });
  const choose = files => {
    element('video-reference-input').files = files;
    element('video-reference-input').dispatchEvent(new Event('change'));
  };
  choose([first, second]);
  assert.equal(element('video-reference-grid').children.length, 0);
  assert.match(element('generation-status').textContent, /only one reference image/i);
  choose([first]);
  assert.equal(element('video-reference-count').textContent, '1 / 1');
  assert.equal(element('video-reference-add').disabled, true);
  const event = new Event('paste', { cancelable: true });
  Object.defineProperty(event, 'clipboardData', { value: { files: [second] } });
  document.dispatchEvent(event);
  assert.match(element('generation-status').textContent, /only one reference image/i);
  assert.equal(element('video-reference-grid').children.length, 1);
  assert.match(element('video-reference-grid').querySelector('img').alt, /first.png/);
  element('video-reference-grid').querySelector('button').onclick();
  assert.equal(element('video-reference-count').textContent, '0 / 1');
  assert.equal(element('video-reference-add').disabled, false);
  choose([second]);
  assert.match(element('video-reference-grid').querySelector('img').alt, /second.png/);
});

test('reference previews preserve the complete original and update the native frame when the ratio changes', async context => {
  const { element, change, document } = await setup(context, { modelId: 'minimax-h3' });
  document.querySelector('[data-video-mode="reference"]').click();
  const file = new File(['unchanged reference'], 'near-square.jpg', { type: 'image/jpeg' });
  element('video-reference-input').files = [file];
  element('video-reference-input').dispatchEvent(new Event('change'));
  const source = element('video-reference-grid').querySelector('img').src;
  for (const [ratio, expected] of [['16:9', '864 / 480'], ['9:16', '480 / 864'], ['16:9', '864 / 480']]) {
    change('video-aspect-ratio', ratio);
    const image = element('video-reference-grid').querySelector('img');
    assert.equal(image.style.aspectRatio, expected);
    assert.equal(image.src, source, 'ratio changes reuse the original preview rather than an already-padded frame');
  }
  assert.equal(await file.text(), 'unchanged reference');
  assert.match(element('video-reference-grid').querySelector('img').alt, /near-square.jpg/);
  document.querySelector('[data-video-mode="text"]').click();
  change('video-aspect-ratio', '1:1');
  document.querySelector('[data-video-mode="reference"]').click();
  assert.equal(element('video-aspect-ratio').value, '16:9');
  assert.equal(element('video-reference-grid').querySelector('img').style.aspectRatio, '864 / 480');
});

test('switching H3 back to text mode does not upload or submit hidden reference images', async context => {
  const { element, input, document, requests } = await setup(context, { modelId: 'minimax-h3' });
  document.querySelector('[data-video-mode="reference"]').click();
  element('video-reference-input').files = [new File([new Uint8Array([1, 2, 3])], 'reference.png', { type: 'image/png' })];
  element('video-reference-input').dispatchEvent(new Event('change'));
  assert.equal(element('video-reference-count').textContent, '1 / 1');
  document.querySelector('[data-video-mode="text"]').click();
  assert.equal(element('video-reference-group').hidden, true);
  input('studio-prompt', 'A text-only cinematic scene');
  element('generate-button').click();
  await flush();
  assert.equal(requests.calls.filter(call => call.url === '/api/videos/references').length, 0);
  assert.equal(requests.videoPosts().length, 1);
  const submitted = JSON.parse(requests.videoPosts()[0].options.body);
  assert.equal(Object.hasOwn(submitted, 'referenceImageIds'), false);
  assert.equal(Object.hasOwn(submitted, 'image_urls'), false);
  requests.videoPosts()[0].resolve(videoResult('queued'));
  await flush();
  requests.videoGets()[0].resolve(videoResult('succeeded'));
  await flush();
  assert.equal(element('generation-preview').dataset.state, 'succeeded');
});

test('an image animate action becomes retryable after its transfer fails while its model is detached', async context => {
  const { element, input, selectModel, requests } = await setup(context, { deferAnimate: true });
  input('studio-prompt', 'Retain this image while a transfer is pending');
  element('generate-button').click();
  requests.images()[0].resolve(imageResult('transfer-retry', { animateId }));
  await flush();
  const animate = element('result-gallery').querySelector('.animate-image-button');
  animate.click();
  await flush();
  const transferCalls = () => requests.calls.filter(call => call.url.startsWith('/api/images/animate?'));
  assert.equal(transferCalls().length, 1);
  assert.equal(animate.disabled, true);
  selectModel('gpt-image-2-5-1k');
  await flush();
  transferCalls()[0].reject(new Error('Network offline'));
  await flush();
  selectModel('gpt-image-2');
  await flush();
  assert.equal(element('result-gallery').querySelector('.animate-image-button') === animate, true);
  assert.equal(animate.disabled, false, 'a detached cached button must be enabled after the transfer settles');
  animate.click();
  await flush();
  assert.equal(transferCalls().length, 2, 'the preserved callback can retry the failed transfer');
  transferCalls()[1].resolve(json({ success: true, id: referenceId }));
  await flush();
});
