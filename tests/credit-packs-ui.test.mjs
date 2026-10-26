import test from 'node:test';
import assert from 'node:assert/strict';
import * as creditUi from '../app/daily-credits.mjs';
import { requestImageGeneration } from '../app/image-generation.mjs';
import { requestVideoGeneration } from '../app/video-generation.mjs';
import { createCreditSummaryController } from '../app/studio-controls.mjs';

test('debit preview uses daily credits first and shows purchased remainder', () => {
  assert.equal(typeof creditUi.creditDebitPreview, 'function');
  assert.deepEqual(creditUi.creditDebitPreview({ dailyRemaining: 2, paidRemaining: 500 }, 5), {
    daily: 2, paid: 3, dailyAfter: 0, paidAfter: 497, insufficient: false,
  });
});

test('paid-only preview never silently consumes daily credits', () => {
  assert.equal(typeof creditUi.creditDebitPreview, 'function');
  assert.deepEqual(creditUi.creditDebitPreview({ dailyRemaining: 15, paidRemaining: 3 }, 5, true), {
    daily: 0, paid: 5, dailyAfter: 15, paidAfter: 0, insufficient: true,
  });
  assert.equal(creditUi.creditDebitPreview(null, 5), null);
});

test('checkout query alone cannot confirm a credit grant', () => {
  assert.equal(typeof creditUi.verifiedCheckoutStatus, 'function');
  assert.equal(creditUi.verifiedCheckoutStatus('success', 'cs_1', []), 'pending');
  assert.equal(creditUi.verifiedCheckoutStatus('success', 'cs_1', [{ sessionId: 'cs_other', status: 'paid' }]), 'pending');
  assert.equal(creditUi.verifiedCheckoutStatus('success', 'cs_1', [{ sessionId: 'cs_1', status: 'paid' }]), 'paid');
  assert.equal(creditUi.verifiedCheckoutStatus('cancelled', '', []), 'cancelled');
  assert.equal(creditUi.verifiedCheckoutStatus('success', 'cs_1', [{ sessionId: 'cs_1', status: 'reversed' }]), 'reversed');
});

for (const [name, request] of [['image', requestImageGeneration], ['video', requestVideoGeneration]]) {
  test(`${name} generation sends purchased-only header only on explicit opt-in`, async () => {
    for (const paidOnly of [false, true]) {
      let headers;
      await assert.rejects(request({ prompt: 'test', paidOnly, fetchImpl: async (_url, init) => {
        headers = new Headers(init.headers);
        return Response.json({ code: 'FREE_BUDGET_EXCEEDED', message: 'Daily free budget reached.' }, { status: 402 });
      } }), error => error.code === 'FREE_BUDGET_EXCEEDED');
      assert.equal(headers.get('x-seedance-credit-source'), paidOnly ? 'paid' : null);
    }
  });
}

test('studio hides balance details and shows a purchase prompt only for insufficient credits', async () => {
  const quantity = Object.assign(new EventTarget(), { value: '1' });
  const debit = {}, split = {}, current = {}, cost = {}, notice = {};
  let paidOnly = false, summary;
  const controller = createCreditSummaryController({
    container: { classList: { toggle() {} } }, quantityControl: quantity,
    costElement: cost, currentBalanceElement: current, debitElement: debit, splitBalanceElement: split, purchaseNoticeElement: notice,
    getCost: () => 5, getPaidOnly: () => paidOnly, eventTarget: new EventTarget(),
    fetchImpl: async () => Response.json({ credits: { remaining: 17, dailyRemaining: 15, paidRemaining: 2 } }),
    onChange: value => { summary = value; },
  });
  await controller.loadBalance();
  assert.equal(split.hidden, true);
  assert.equal(debit.hidden, true);
  assert.equal(notice.hidden, true);
  assert.equal(split.textContent, 'Balance: 15 daily · 2 purchased');
  assert.equal(debit.textContent, 'Next generation: 5 daily + 0 purchased credits.');
  paidOnly = true;
  controller.refresh();
  assert.equal(debit.textContent, 'Next generation: 0 daily + 5 purchased credits.');
  assert.equal(summary.insufficient, true);
  assert.equal(notice.hidden, false);
  paidOnly = false;
  controller.refresh();
  assert.equal(notice.hidden, true);
  controller.destroy();
});

test('purchase warning stays hidden during loading and generation, and clears after replenishment', async () => {
  const notice = {}, quantity = Object.assign(new EventTarget(), { value: '1' });
  let remaining = 0, pending = false;
  const controller = createCreditSummaryController({
    container: { classList: { toggle() {} } }, quantityControl: quantity,
    costElement: {}, currentBalanceElement: {}, purchaseNoticeElement: notice,
    getCost: () => 5, isGenerationPending: () => pending, eventTarget: new EventTarget(),
    fetchImpl: async () => Response.json({ credits: { remaining } }),
  });
  assert.equal(notice.hidden, true);
  await controller.loadBalance();
  assert.equal(notice.hidden, false);
  pending = true; controller.refresh();
  assert.equal(notice.hidden, true);
  pending = false; remaining = 100; await controller.loadBalance();
  assert.equal(notice.hidden, true);
  controller.destroy();
});
