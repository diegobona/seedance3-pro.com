import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudioEnvironment } from './helpers/studio-dom.mjs';
import { initializeStudio } from '../app/studio.js';

async function flush() { for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve)); }

for (const code of ['FREE_BUDGET_EXCEEDED', 'NETWORK_FREE_BUDGET_EXCEEDED']) {
test(`${code} requires a visible explicit choice before sending a paid image request`, async context => {
  const submissions = [];
  const environment = createStudioEnvironment({
    modelId: 'gpt-image-2-5-1k',
    fetchImpl: async (url, options = {}) => {
      if (String(url).startsWith('/api/credits/balance')) return Response.json({
        credits: { remaining: 505, dailyRemaining: 5, paidRemaining: 500, guest: false, expiresDaily: false },
      });
      if (url === '/api/images/generate') {
        submissions.push(options);
        return submissions.length === 1
          ? Response.json({ code, message: 'Today’s free generation budget is reached.' }, { status: 402 })
          : Response.json({ success: true, image: { url: 'https://example.com/result.png' } });
      }
      throw new Error(`Unexpected request: ${url}`);
    },
  });
  const { document, element, input } = environment;
  for (const [id, tag] of [['credit-balance-split', 'p'], ['credit-debit-preview', 'p'], ['paid-only-option', 'label'], ['paid-only-checkbox', 'input'], ['free-budget-notice', 'p']]) {
    const node = document.createElement(tag);
    node.setAttribute('id', id);
    node.hidden = true;
    document.querySelector('.studio-shell').append(node);
  }
  const cleanup = initializeStudio();
  context.after(async () => { cleanup(); await flush(); environment.restore(); });
  await flush();
  input('studio-prompt', 'A blue ceramic cup');
  element('generate-button').click();
  await flush();
  assert.equal(submissions.length, 1);
  assert.equal(new Headers(submissions[0].headers).get('x-seedance-credit-source'), null);
  assert.equal(element('paid-only-option').hidden, false);
  assert.equal(element('paid-only-checkbox').checked, false);
  assert.equal(element('generate-button').disabled, true);
  element('generate-button').click();
  assert.equal(submissions.length, 1);
  element('paid-only-checkbox').checked = true;
  element('paid-only-checkbox').dispatchEvent(new Event('change'));
  assert.equal(element('credit-debit-preview').textContent, 'Next generation: 0 daily + 1 purchased credits.');
  assert.equal(element('generate-button').disabled, false);
  element('generate-button').click();
  await flush();
  assert.equal(submissions.length, 2);
  assert.equal(new Headers(submissions[1].headers).get('x-seedance-credit-source'), 'paid');
  environment.advance(24 * 60 * 60 * 1000);
  environment.window.dispatchEvent(new Event('focus'));
  await flush();
  assert.equal(element('paid-only-option').hidden, true, 'a new Shanghai day restores daily-first generation');
  assert.equal(element('paid-only-checkbox').checked, false);
  assert.equal(element('generate-button').disabled, false);
});
}
