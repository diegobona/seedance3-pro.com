import assert from 'node:assert/strict';
import test from 'node:test';
import { createCreditSummaryController } from '../app/studio-controls.mjs';

test('guest duration defaults to five, caps at ten, and uses the remaining seconds', async () => {
  const { guestVideoDurationState } = await import('../app/guest-video.mjs');
  assert.deepEqual(guestVideoDurationState({ guest: true, remaining: 10, value: '5' }), { value: '5', disabled: [15] });
  assert.deepEqual(guestVideoDurationState({ guest: true, remaining: 5, value: '10' }), { value: '5', disabled: [10, 15] });
  assert.deepEqual(guestVideoDurationState({ guest: true, remaining: 10, value: '15' }), { value: '5', disabled: [15] });
  assert.deepEqual(guestVideoDurationState({ guest: false, remaining: 15, value: '15' }), { value: '15', disabled: [] });
});

test('switching models discards the old guest balance and ignores late guest credit events', async () => {
  const quantityControl = Object.assign(new EventTarget(), { value: '1' });
  const eventTarget = new EventTarget(), changes = [];
  let context = 'guest-video', resolveGuest;
  const controller = createCreditSummaryController({ quantityControl,
    costElement: { textContent: '' }, currentBalanceElement: { textContent: '' },
    container: { classList: { toggle() {} } }, eventTarget,
    getContext: () => context,
    getBalanceUrl: () => context,
    onChange: summary => changes.push(summary),
    fetchImpl: async url => url === 'guest-video' ? new Promise(resolve => { resolveGuest = resolve; }) : new Response(null, { status: 401 }),
  });
  const firstLoad = controller.loadBalance();
  context = 'account';
  await controller.reset();
  resolveGuest(Response.json({ credits: { remaining: 10, guest: true, expiresDaily: false } }));
  await firstLoad;
  const late = new Event('seedance:credits-updated');
  Object.defineProperty(late, 'detail', { value: { remaining: 5, context: 'guest-video' } });
  eventTarget.dispatchEvent(late);
  assert.equal(changes.at(-1).currentBalance, null);
  controller.destroy();
});

test('guest balance metadata reaches the UI before rendering, with no daily reset timer', async () => {
  const quantityControl = Object.assign(new EventTarget(), { value: '1' });
  const costElement = { textContent: '' }, currentBalanceElement = { textContent: '' };
  const requests = [], timers = [], changes = [];
  let guest = false;
  const controller = createCreditSummaryController({ quantityControl, costElement, currentBalanceElement,
    container: { classList: { toggle() {} } }, eventTarget: new EventTarget(),
    getBalanceUrl: () => '/api/credits/balance?guest_video=1',
    getCost: () => guest ? 5 : 15,
    onBalanceLoaded: (_remaining, credits) => { guest = credits?.guest === true; },
    onChange: summary => changes.push(summary),
    setTimeoutImpl: (...args) => { timers.push(args); return 1; },
    fetchImpl: async url => { requests.push(url); return Response.json({ credits: { remaining: 5, guest: true, expiresDaily: false } }); },
  });
  await controller.loadBalance();
  assert.deepEqual(requests, ['/api/credits/balance?guest_video=1']);
  assert.equal(timers.length, 0);
  assert.equal(changes.at(-1).cost, 5);
  assert.equal(changes.at(-1).insufficient, false);
  controller.destroy();
});
