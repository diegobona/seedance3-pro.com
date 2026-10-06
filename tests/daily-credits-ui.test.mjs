import assert from 'node:assert/strict';
import test from 'node:test';
import { millisecondsUntilCreditReset, formatCreditResetTime } from '../app/daily-credits.mjs';
import { createCreditSummaryController } from '../app/studio-controls.mjs';

test('daily refresh follows Beijing midnight independently of the browser region', () => {
  assert.equal(millisecondsUntilCreditReset(Date.parse('2026-10-04T15:59:59Z')), 2000);
  assert.equal(millisecondsUntilCreditReset(Date.parse('2026-10-04T16:00:00Z')), 86401000);
});

test('the same credit reset is displayed in the visitor timezone with daylight saving respected', () => {
  const now = Date.parse('2026-10-05T10:00:00Z');
  assert.match(formatCreditResetTime({ now, timeZone: 'America/Los_Angeles' }), /9:00 AM PDT/);
  assert.match(formatCreditResetTime({ now, timeZone: 'Europe/London' }), /5:00 PM GMT\+1/);
  assert.match(formatCreditResetTime({ now, locale: 'zh-CN', timeZone: 'Asia/Shanghai' }), /00:00/);
  assert.match(formatCreditResetTime({ now: Date.parse('2026-12-05T10:00:00Z'), timeZone: 'America/Los_Angeles' }), /8:00 AM PST/);
});

test('an open generator refreshes an exhausted balance at midnight and cleans up its timer', async () => {
  const timers = [];
  const cleared = [];
  const balances = [];
  let remaining = 0;
  const element = { textContent: '' };
  const quantity = new EventTarget();
  quantity.value = '1';
  const controller = createCreditSummaryController({
    container: { classList: { toggle() {} } },
    costElement: { textContent: '' }, currentBalanceElement: element,
    quantityControl: quantity, eventTarget: new EventTarget(),
    fetchImpl: async () => Response.json({ credits: { remaining } }),
    nowImpl: () => Date.parse('2026-10-04T15:59:59Z'),
    setTimeoutImpl: (callback, delay) => { timers.push({ callback, delay }); return timers.length; },
    clearTimeoutImpl: id => cleared.push(id),
    onBalanceLoaded: balance => balances.push(balance),
  });
  await controller.loadBalance();
  assert.equal(element.textContent, '0 credits');
  assert.equal(timers[0].delay, 2000);
  remaining = 15;
  timers[0].callback();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(element.textContent, '15 credits');
  assert.deepEqual(balances, [0, 15]);
  controller.destroy();
  assert.ok(cleared.includes(2));
});
