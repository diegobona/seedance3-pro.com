import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudioEnvironment } from './helpers/studio-dom.mjs';
import { initializeStudio } from '../app/studio.js';

async function flush() { for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve)); }

function addTrialNotice(document) {
  const notice = document.createElement('aside');
  notice.className = 'studio-trial-notice';
  const title = document.createElement('strong');
  title.setAttribute('id', 'trial-notice-title');
  notice.append(title);
  document.querySelector('.studio-shell').append(notice);
  return { notice, title };
}

for (const locale of ['en', 'zh']) {
  for (const modelId of ['gpt-image-2-5-1k', 'minimax-h3']) {
    for (const paidRemaining of [500, 0]) {
      test(`${locale} ${modelId} account allowance remains daily credits with ${paidRemaining} purchased credits`, async context => {
        const requests = [];
        const environment = createStudioEnvironment({ modelId, fetchImpl: async url => {
          requests.push(String(url));
          assert.ok(String(url).startsWith('/api/credits/balance'));
          return Response.json({ credits: { remaining: 5 + paidRemaining, dailyRemaining: 5, paidRemaining, guest: false } });
        } });
        if (locale === 'zh') history.pushState({}, '', `/zh/app/?model=${modelId}`);
        const { notice, title } = addTrialNotice(environment.document);
        const cleanup = initializeStudio();
        context.after(async () => { cleanup(); await flush(); environment.restore(); });
        const expected = locale === 'zh' ? '每日免费积分' : 'Daily free credits';
        assert.equal(title.textContent, expected, 'known accounts have an accurate heading before balance loading');
        assert.equal(notice.getAttribute('aria-label'), expected);
        await flush();
        assert.equal(title.textContent, expected);
        assert.equal(notice.getAttribute('aria-label'), expected);
        assert.equal(notice.dataset.trialState, 'account');
        assert.ok(requests.length > 0);
      });
    }
  }

  test(`${locale} pending account lookup stays neutral, then guest exhaustion and sign-in update the notice`, async context => {
    let credits = { remaining: 0, guest: true, expiresDaily: false };
    const environment = createStudioEnvironment({ modelId: 'gpt-image-2-5-1k', fetchImpl: async () => Response.json({ credits }) });
    if (locale === 'zh') history.pushState({}, '', '/zh/app/?model=gpt-image-2-5-1k');
    const shell = environment.document.querySelector('.studio-shell');
    shell.dataset.authenticated = 'false';
    shell.dataset.authPending = 'true';
    const { notice, title } = addTrialNotice(environment.document);
    const cleanup = initializeStudio();
    context.after(async () => { cleanup(); await flush(); environment.restore(); });
    const dailyTitle = locale === 'zh' ? '每日免费积分' : 'Daily free credits';
    assert.equal(title.textContent, dailyTitle);
    await flush();
    assert.equal(title.textContent, dailyTitle, 'a guest balance response cannot label a pending account as a trial');
    assert.equal(notice.getAttribute('aria-label'), dailyTitle);

    shell.dataset.authPending = 'false';
    environment.window.dispatchEvent(new Event('seedance:auth-changed'));
    await flush();
    const guestTitle = locale === 'zh' ? '游客免费体验额度已用完' : 'Free trial used up';
    assert.equal(title.textContent, guestTitle);
    assert.equal(notice.getAttribute('aria-label'), guestTitle);
    assert.equal(notice.dataset.trialState, 'guest-used');

    shell.dataset.authenticated = 'true';
    credits = { remaining: 5, dailyRemaining: 5, paidRemaining: 0, guest: false };
    environment.window.dispatchEvent(new Event('seedance:auth-changed'));
    assert.equal(title.textContent, dailyTitle, 'sign-in clears the guest heading before the refreshed balance arrives');
    await flush();
    assert.equal(title.textContent, dailyTitle);
    assert.equal(notice.getAttribute('aria-label'), dailyTitle);
    assert.equal(notice.dataset.trialState, 'account');
  });
}

for (const [remaining, expected, disabled] of [[5, '5', true], [505, '15', false]]) {
  test(`account with ${remaining} credits offers only affordable video durations`, async context => {
    const environment = createStudioEnvironment({ modelId: 'minimax-h3', fetchImpl: async () => Response.json({
      credits: { remaining, dailyRemaining: 5, paidRemaining: remaining - 5, guest: false },
    }) });
    const duration = environment.document.getElementById('video-duration');
    duration.value = '15';
    const cleanup = initializeStudio();
    context.after(async () => { cleanup(); await flush(); environment.restore(); });
    await flush();
    assert.equal(duration.options.find(option => option.value === '15').disabled, disabled);
    assert.equal(duration.options.find(option => option.value === '10').disabled, disabled);
    assert.equal(duration.value, expected);
  });
}

test('account image batches follow the remaining credits after daily usage', async context => {
  const environment = createStudioEnvironment({ modelId: 'gpt-image-2-5-1k', fetchImpl: async () => Response.json({
    credits: { remaining: 2, dailyRemaining: 2, paidRemaining: 0, guest: false },
  }) });
  const quantity = environment.document.getElementById('image-quantity');
  quantity.value = '3';
  const cleanup = initializeStudio();
  context.after(async () => { cleanup(); await flush(); environment.restore(); });
  await flush();
  assert.equal(quantity.options.find(option => option.value === '3').disabled, true);
  assert.equal(quantity.value, '1');
  quantity.value = '2';
  quantity.dispatchEvent(new Event('change'));
  assert.match(environment.document.getElementById('generate-button-label').textContent, /2 images/);
  const update = new Event('seedance:credits-updated');
  Object.defineProperty(update, 'detail', { value: { remaining: 1, context: 'account' } });
  environment.window.dispatchEvent(update);
  assert.equal(quantity.value, '1');
  assert.doesNotMatch(environment.document.getElementById('generate-button-label').textContent, /2 images/);
})
