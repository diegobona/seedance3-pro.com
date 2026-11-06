import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudioEnvironment } from './helpers/studio-dom.mjs';
import { initializeStudio } from '../app/studio.js';

const trial = { guest: true, remaining: 10, generationCost: 5, videoModelName: 'MiniMax H3 Max Turbo', videoResolutionLabel: '768P', maxReferences: 1, maxDuration: 5 };
const image = name => new File(['image'], name, { type: 'image/png' });
async function flush() { for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve)); }

function setup(context, credits = trial, locale = 'en') {
  const state = { credits };
  const environment = createStudioEnvironment({ modelId: 'minimax-h3', fetchImpl: async url => {
    if (String(url).startsWith('/api/credits/balance')) return Response.json({ credits: state.credits });
    throw Error(`Unexpected request: ${url}`);
  } });
  if (locale === 'zh') history.pushState({}, '', '/zh/app/?model=minimax-h3');
  const cleanup = initializeStudio();
  context.after(async () => { cleanup(); await flush(); environment.restore(); });
  return { ...environment, state, references(files) {
    environment.element('video-reference-input').files = files;
    environment.element('video-reference-input').dispatchEvent(new Event('change'));
  }, referenceMode() { environment.document.querySelector('[data-video-mode="reference"]').click(); } };
}

test('guest provider metadata preserves site display labels and restricts the reference picker', async context => {
  const ui = setup(context); await flush();
  assert.equal(ui.element('model-name').textContent, 'Seedance 2.5');
  assert.equal(ui.element('selected-name').textContent, 'Seedance 2.5');
  if (ui.state.credits.guest) assert.deepEqual(ui.element('video-duration').options.map(option => option.value), ['5']);
  assert.equal(ui.element('video-reference-count').textContent, '0 / 1');
  assert.equal(ui.element('video-reference-input').multiple, false);
  assert.equal(ui.element('video-resolution').options[0].textContent, '1080P');
  ui.referenceMode(); ui.input('studio-prompt', 'A cloud moves');
  ui.references([image('first.png'), image('second.png')]);
  assert.equal(ui.element('video-reference-count').textContent, '0 / 1');
  assert.match(ui.element('generation-status').textContent, /1 reference image/);
  assert.equal(ui.element('generate-button').disabled, true);
  ui.references([image('first.png')]);
  assert.equal(ui.element('video-reference-count').textContent, '1 / 1');
  assert.equal(ui.element('generate-button').disabled, false);
});

test('references already in a guest draft stay visible when the new limit arrives and block generation', async context => {
  const ui = setup(context, { guest: true, remaining: 10 }); await flush();
  ui.referenceMode(); ui.input('studio-prompt', 'Preserve my two reference images');
  ui.references([image('first.png'), image('second.png')]);
  assert.equal(ui.element('video-reference-count').textContent, '2 / 9');
  ui.state.credits = trial; ui.window.dispatchEvent(new Event('focus')); await flush();
  assert.equal(ui.element('video-reference-count').textContent, '2 / 1');
  assert.equal(ui.element('video-reference-grid').children.length, 2);
  assert.equal(ui.element('generate-button').disabled, true);
  assert.match(ui.element('generation-status').textContent, /Remove extra images/);
  ui.element('video-reference-grid').children[1].querySelector('button').click();
  assert.equal(ui.element('video-reference-count').textContent, '1 / 1');
  assert.equal(ui.element('generate-button').disabled, false);
  assert.doesNotMatch(ui.element('generation-status').textContent, /Remove extra images/);
});

test('paid users recover their original model and nine-reference controls after the guest metadata changes', async context => {
  const ui = setup(context); await flush();
  ui.state.credits = { ...trial, guest: false, remaining: 500, paidRemaining: 500 };
  ui.window.dispatchEvent(new Event('focus')); await flush();
  assert.equal(ui.element('model-name').textContent, 'Seedance 2.5');
  assert.equal(ui.element('selected-name').textContent, 'Seedance 2.5');
  assert.equal(ui.element('video-reference-count').textContent, '0 / 9');
  assert.equal(ui.element('video-reference-input').multiple, true);
  assert.equal(ui.element('video-duration').options.find(option => option.value === '15').disabled, false);
  ui.referenceMode(); ui.input('studio-prompt', 'Keep the paid reference workflow');
  ui.references([image('first.png'), image('second.png')]);
  assert.equal(ui.element('video-reference-count').textContent, '2 / 9');
  assert.equal(ui.element('generate-button').disabled, false);
});

test('Chinese guest controls use the display labels and localize duration and single-image warning', async context => {
  const ui = setup(context, trial, 'zh'); await flush();
  assert.equal(ui.element('model-name').textContent, 'Seedance 2.5');
  assert.equal(ui.element('video-resolution').options[0].textContent, '1080P');
  assert.equal(ui.element('video-duration').options[0].textContent, '5 秒');
  ui.referenceMode(); ui.references([image('一.png'), image('二.png')]);
  assert.match(ui.element('generation-status').textContent, /支持 1 张参考图/);
});
