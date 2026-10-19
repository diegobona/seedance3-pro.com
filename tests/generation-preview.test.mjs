import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { createPreviewFixture } from './helpers/preview-dom.mjs';

async function setup(options = {}, callbacks = {}) {
  assert.ok(existsSync(new URL('../app/generation-preview.mjs', import.meta.url)), 'expected generation-preview controller module');
  const { createGenerationPreviewController } = await import('../app/generation-preview.mjs');
  const fixture = createPreviewFixture(options);
  const controller = createGenerationPreviewController({ ...fixture.options, ...callbacks });
  return { ...fixture, fixture, controller };
}

function visibleState(elements) {
  return ['preview-idle', 'preview-pending', 'result-card', 'preview-error'].filter(id => !elements[id].hidden);
}

test('idle groups stay in their React-owned hosts while pending changes into a result', async () => {
  const { controller, elements, resultItem } = await setup();
  const idleGroup = elements['idle-image-a'];
  const idleParent = idleGroup.parentNode;
  const galleryParent = elements['result-gallery'].parentNode;
  controller.selectModel('image-a');
  assert.deepEqual(visibleState(elements), ['preview-idle']);
  assert.equal(idleGroup.hidden, false);
  assert.equal(elements['idle-image-b'].hidden, true);
  assert.equal(elements['preview-placeholder'].hidden, true);
  const handle = controller.begin({ modelId: 'image-a', modelName: 'Image A', kind: 'image' });
  assert.equal(handle.modelId, 'image-a');
  assert.deepEqual(visibleState(elements), ['preview-pending']);
  assert.equal(elements['generation-preview'].getAttribute('aria-busy'), 'true');
  controller.update(handle, { stage: 'submitting', message: 'Sending image request…' });
  assert.equal(elements['preview-status'].textContent, 'Sending image request…');
  const { item } = resultItem();
  controller.succeed(handle, { items: [item], note: 'Download before this link expires.' });
  assert.deepEqual(visibleState(elements), ['result-card']);
  assert.equal(elements['result-gallery'].firstChild, item);
  assert.equal(elements['result-note'].textContent, 'Download before this link expires.');
  assert.equal(elements['result-model-label'].textContent, 'Image A');
  assert.equal(elements['generation-preview'].getAttribute('aria-busy'), 'false');
  assert.equal(idleGroup.parentNode, idleParent);
  assert.equal(elements['result-gallery'].parentNode, galleryParent);
  controller.selectModel('no-example');
  assert.equal(elements['preview-placeholder'].hidden, false);
  controller.destroy();
});

test('image batches have neutral placeholders with sanitized aspect ratios', async () => {
  const { controller, elements } = await setup();
  controller.selectModel('image-a');
  controller.begin({ modelId: 'image-a', kind: 'image', count: 2, aspectRatio: '16:9' });
  const slots = elements['preview-placeholders'].querySelectorAll('.preview-loading-slot');
  assert.equal(slots.length, 2);
  assert.equal(slots[0].style.getPropertyValue('--preview-ratio'), '16 / 9');
  assert.doesNotMatch(elements['preview-pending'].textContent, /\d+%/);
  controller.begin({ modelId: 'image-a', kind: 'image', count: 500, aspectRatio: '1:1; background:url(evil)' });
  assert.equal(elements['preview-placeholders'].children.length, 3);
  assert.equal(elements['preview-placeholders'].firstChild.style.getPropertyValue('--preview-ratio'), '1 / 1');
  controller.begin({ modelId: 'image-a', kind: 'video', count: 2, aspectRatio: '0:9' });
  assert.equal(elements['preview-placeholders'].children.length, 1);
  assert.equal(elements['preview-placeholders'].firstChild.style.getPropertyValue('--preview-ratio'), '1 / 1');
  controller.destroy();
});

test('one real elapsed timer covers concurrent jobs and preserves placeholder nodes', async () => {
  const changes = [];
  const { controller, fixture, elements } = await setup({}, { onChange: state => changes.push(state) });
  controller.selectModel('image-a');
  const image = controller.begin({ modelId: 'image-a', kind: 'image', startedAt: 9_000 });
  const slot = elements['preview-placeholders'].firstChild;
  const callsBeforeTick = changes.length;
  fixture.advance(41_000);
  assert.equal(elements['preview-elapsed'].textContent, 'Waiting 0:42');
  assert.equal(elements['preview-placeholders'].firstChild, slot);
  assert.equal(changes.length, callsBeforeTick);
  const video = controller.begin({ modelId: 'video', kind: 'video' });
  assert.equal(fixture.timerStarts, 1);
  controller.succeed(image, { items: [] });
  assert.equal(fixture.timers.size, 1);
  controller.fail(video, { message: 'Provider unavailable' });
  assert.equal(fixture.timers.size, 0);
  assert.equal(fixture.clearedTimers.length, 1);
  controller.destroy();
});

test('failed retry and paused resume only call their explicit actions', async () => {
  const retries = [];
  const { controller, elements, fixture } = await setup({}, { onRetry: (...args) => retries.push(args) });
  controller.selectModel('video');
  const handle = controller.begin({ modelId: 'video', kind: 'video' });
  controller.pause(handle, { message: 'Still running. Continue checking when ready.' });
  assert.deepEqual(visibleState(elements), ['preview-pending']);
  assert.equal(elements['preview-resume'].hidden, false);
  assert.equal(controller.getState('video').phase, 'pending');
  assert.equal(retries.length, 0);
  fixture.advance(2_000);
  assert.equal(retries.length, 0);
  elements['preview-resume'].click();
  elements['preview-resume'].click();
  assert.deepEqual(retries, [[handle, { resume: true }], [handle, { resume: true }]]);
  controller.update(handle, { stage: 'checking', message: 'Checking status…' });
  assert.equal(elements['preview-resume'].hidden, true);
  controller.fail(handle, { message: 'Video rejected', canRetry: true });
  assert.deepEqual(visibleState(elements), ['preview-error']);
  assert.equal(elements['preview-error-message'].textContent, 'Video rejected');
  assert.equal(retries.length, 2);
  elements['preview-retry'].click();
  assert.deepEqual(retries[2], [handle, { resume: false }]);
  const noRetry = controller.begin({ modelId: 'video', kind: 'video' });
  controller.fail(noRetry, { message: 'Not permitted', canRetry: false });
  assert.equal(elements['preview-retry'].hidden, true);
  elements['preview-retry'].click();
  assert.equal(retries.length, 3);
  controller.destroy();
});

test('previous result nodes and actions survive pending, failure, new batches and model switches', async () => {
  const { controller, elements, resultItem } = await setup();
  let actions = 0;
  const first = resultItem(() => actions++);
  const second = resultItem(() => actions++);
  controller.selectModel('image-a');
  controller.succeed(controller.begin({ modelId: 'image-a', kind: 'image' }), { items: [first.item] });
  const failed = controller.begin({ modelId: 'image-a', kind: 'image' });
  assert.equal(elements['generation-history'].hidden, false);
  assert.equal(elements['generation-history-list'].contains(first.item), true);
  controller.fail(failed, { message: 'Network error' });
  assert.equal(elements['generation-history-list'].contains(first.item), true);
  const next = controller.begin({ modelId: 'image-a', kind: 'image' });
  controller.succeed(next, { items: [second.item] });
  assert.equal(elements['result-gallery'].firstChild, second.item);
  assert.equal(elements['generation-history-list'].contains(first.item), true);
  controller.selectModel('image-b');
  assert.deepEqual(visibleState(elements), ['preview-idle']);
  assert.equal(elements['generation-history'].hidden, true);
  controller.selectModel('image-a');
  assert.equal(elements['result-gallery'].firstChild, second.item);
  assert.equal(elements['generation-history-list'].contains(first.item), true);
  first.action.click();
  second.action.click();
  assert.equal(actions, 2);
  assert.equal(controller.getState('image-a').completedCount, 2);
  controller.destroy();
});

test('model selection restores jobs while background completions cannot replace the active preview', async () => {
  const { controller, elements, resultItem } = await setup();
  controller.selectModel('image-a');
  const image = controller.begin({ modelId: 'image-a', kind: 'image', modelName: 'Image A' });
  controller.selectModel('video');
  const video = controller.begin({ modelId: 'video', kind: 'video', modelName: 'Video' });
  controller.update(video, { message: 'Video running' });
  const { item } = resultItem();
  controller.succeed(image, { items: [item] });
  assert.deepEqual(visibleState(elements), ['preview-pending']);
  assert.equal(elements['preview-status'].textContent, 'Video running');
  assert.equal(elements['result-gallery'].contains(item), false);
  controller.selectModel('image-a');
  assert.equal(elements['result-gallery'].firstChild, item);
  controller.selectModel('video');
  assert.equal(elements['preview-status'].textContent, 'Video running');
  assert.equal(controller.getState().job.handle, video);
  controller.destroy();
});

test('status updates leave visible history nodes attached so previous video playback can continue', async () => {
  const { controller, resultItem } = await setup();
  controller.selectModel('video');
  const { item } = resultItem();
  controller.succeed(controller.begin({ modelId: 'video', kind: 'video' }), { items: [item] });
  const next = controller.begin({ modelId: 'video', kind: 'video' });
  const historyGallery = item.parentNode;
  let replacements = 0;
  const originalReplace = historyGallery.replaceChildren.bind(historyGallery);
  historyGallery.replaceChildren = (...nodes) => { replacements++; originalReplace(...nodes); };
  controller.update(next, { stage: 'queued', message: 'Queued' });
  controller.update(next, { stage: 'running', message: 'Rendering video' });
  assert.equal(item.parentNode, historyGallery);
  assert.equal(replacements, 0, 'unchanged history must not detach playing media on polling updates');
  controller.destroy();
});

test('superseded handles cannot update, fail or discard already displayed completed batches', async () => {
  const { controller, elements, resultItem } = await setup();
  controller.selectModel('image-a');
  const first = controller.begin({ modelId: 'image-a', kind: 'image' });
  const current = controller.begin({ modelId: 'image-a', kind: 'image' });
  const liveItem = resultItem().item;
  controller.succeed(current, { items: [liveItem] });
  controller.succeed(first, { items: [resultItem().item] });
  controller.fail(first, { message: 'Stale failure' });
  controller.update(first, { message: 'Stale running' });
  assert.equal(controller.getState().phase, 'succeeded');
  assert.equal(elements['result-gallery'].firstChild, liveItem);
  assert.equal(controller.getState().completedCount, 1);
  controller.destroy();
});

test('resetDraft returns pose preview to idle and retains completed results below it', async () => {
  const { controller, elements, resultItem, fixture } = await setup();
  controller.selectModel('pose');
  const handle = controller.begin({ modelId: 'pose', kind: 'image', isPose: true });
  const { item } = resultItem();
  controller.succeed(handle, { items: [item] });
  controller.resetDraft('pose');
  assert.equal(controller.getState().phase, 'idle');
  assert.deepEqual(visibleState(elements), ['preview-idle']);
  assert.equal(elements['generation-history-list'].contains(item), true);
  assert.equal(elements['generation-history'].hidden, false);
  assert.equal(fixture.timers.size, 0);
  controller.succeed(handle, { items: [resultItem().item] });
  assert.equal(controller.getState().phase, 'idle');
  controller.destroy();
});

test('mobile begin reveals pending output once and completion never scrolls or focuses', async () => {
  const { controller, elements, document, resultItem } = await setup({ width: 700 });
  const stage = elements['generation-preview'];
  controller.selectModel('image-a');
  const handle = controller.begin({ modelId: 'image-a', kind: 'image' });
  assert.equal(stage.scrolls.length, 1);
  assert.equal(stage.scrolls[0].behavior, 'smooth');
  controller.succeed(handle, { items: [resultItem().item] });
  assert.equal(stage.scrolls.length, 1);
  assert.equal(stage.focuses.length, 0);
  assert.equal(document.activeElement, null);
  assert.equal(elements['view-generation-result'].hidden, true);
  controller.destroy();
});

test('desktop begin scrolls only when outside the viewport and honors reduced motion', async () => {
  const { controller, elements } = await setup({ reducedMotion: true });
  const stage = elements['generation-preview'];
  controller.selectModel('image-a');
  controller.begin({ modelId: 'image-a', kind: 'image' });
  assert.equal(stage.scrolls.length, 0);
  stage.rect = { top: 1100, bottom: 1600, left: 100, right: 700 };
  controller.begin({ modelId: 'image-a', kind: 'image' });
  assert.deepEqual(stage.scrolls, [{ behavior: 'auto', block: 'start' }]);
  controller.destroy();
});

test('offscreen completion persists a view-result action until explicit reveal', async () => {
  const revealed = [];
  const { controller, elements, resultItem, document } = await setup({}, { onRevealModel: modelId => revealed.push(modelId) });
  controller.selectModel('image-a');
  const handle = controller.begin({ modelId: 'image-a', kind: 'image', modelName: 'Image A' });
  const stage = elements['generation-preview'];
  stage.rect = { top: -1000, bottom: -200, left: 100, right: 700 };
  controller.succeed(handle, { items: [resultItem().item] });
  const reveal = elements['view-generation-result'];
  assert.equal(reveal.hidden, false);
  assert.equal(reveal.textContent, 'Image A is ready · View result');
  assert.equal(stage.scrolls.length, 0);
  assert.equal(document.activeElement, null);
  controller.selectModel('video');
  assert.equal(reveal.hidden, false);
  reveal.click();
  assert.deepEqual(revealed, ['image-a']);
  assert.equal(controller.getState().modelId, 'image-a');
  assert.equal(controller.getState().phase, 'succeeded');
  assert.equal(reveal.hidden, true);
  assert.equal(stage.scrolls.length, 1);
  assert.equal(document.activeElement, stage);
  controller.destroy();
});

test('background completion reveal targets its own model and new requests dismiss only relevant notices', async () => {
  const revealed = [];
  const { controller, elements, resultItem } = await setup({}, { onRevealModel: model => revealed.push(model) });
  controller.selectModel('image-a');
  const image = controller.begin({ modelId: 'image-a', kind: 'image', modelName: 'Image A' });
  controller.selectModel('video');
  controller.succeed(image, { items: [resultItem().item] });
  assert.equal(elements['view-generation-result'].hidden, false);
  controller.begin({ modelId: 'video', kind: 'video' });
  assert.equal(elements['view-generation-result'].hidden, false);
  elements['view-generation-result'].click();
  assert.deepEqual(revealed, ['image-a']);
  assert.equal(elements['result-model-label'].textContent, 'Image A');
  controller.selectModel('video');
  const next = controller.begin({ modelId: 'image-a', kind: 'image', modelName: 'Image A' });
  controller.succeed(next, { items: [resultItem().item] });
  assert.equal(elements['view-generation-result'].hidden, false);
  controller.begin({ modelId: 'image-a', kind: 'image' });
  assert.equal(elements['view-generation-result'].hidden, true);
  controller.destroy();
});

test('a result completed while the browser tab is hidden keeps a view-result notice', async () => {
  const { controller, elements, document, resultItem } = await setup();
  controller.selectModel('image-a');
  const handle = controller.begin({ modelId: 'image-a', kind: 'image' });
  document.visibilityState = 'hidden';
  controller.succeed(handle, { items: [resultItem().item] });
  assert.equal(elements['view-generation-result'].hidden, false);
  assert.equal(document.activeElement, null);
  controller.destroy();
});

test('destroy clears intervals and event handlers and ignores all late asynchronous callbacks', async () => {
  const retries = [];
  const changes = [];
  const { controller, fixture, elements, resultItem } = await setup({}, { onRetry: (...args) => retries.push(args), onChange: state => changes.push(state) });
  controller.selectModel('video');
  const handle = controller.begin({ modelId: 'video', kind: 'video' });
  controller.pause(handle, { message: 'Waiting on provider' });
  controller.destroy();
  const calls = changes.length;
  assert.equal(fixture.timers.size, 0);
  controller.succeed(handle, { items: [resultItem().item] });
  controller.fail(handle, { message: 'Late error' });
  controller.update(handle, { message: 'Late pending' });
  controller.selectModel('image-a');
  elements['preview-resume'].click();
  elements['preview-retry'].click();
  elements['view-generation-result'].click();
  assert.equal(changes.length, calls);
  assert.equal(retries.length, 0);
  assert.equal(elements['result-gallery'].children.length, 0);
  assert.equal(controller.begin({ modelId: 'image-a', kind: 'image' }), null);
});
