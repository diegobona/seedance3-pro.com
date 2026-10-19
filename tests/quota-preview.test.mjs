import assert from 'node:assert/strict';
import test from 'node:test';
import { createCreditSummaryController } from '../app/studio-controls.mjs';

function harness({ context = 'guest-image', remaining = 10, duration = '5' } = {}) {
  const quantity = Object.assign(new EventTarget(), { value: '1' });
  const seconds = Object.assign(new EventTarget(), { value: duration });
  const balanceElement = { textContent: '' }, label = { textContent: '' }, events = new EventTarget();
  const states = [], flags = {};
  const controller = createCreditSummaryController({
    container: { classList: { toggle: (key, value) => { flags[key] = value; } } },
    quantityControl: quantity, additionalCostControls: [seconds],
    costElement: { textContent: '' }, currentBalanceElement: balanceElement, balanceLabelElement: label,
    getContext: () => context, getCost: () => context === 'guest-video' ? Number(seconds.value) : Number(quantity.value) * 5,
    eventTarget: events, onChange: state => states.push(state),
    fetchImpl: async () => Response.json({ credits: { remaining, guest: context !== 'account', expiresDaily: false } }),
  });
  return { controller, states, flags, label, balanceElement,
    async focus() { events.dispatchEvent(new Event('focus')); await new Promise(resolve => setImmediate(resolve)); },
    select(value) { const control = context === 'guest-video' ? seconds : quantity; control.value = value; control.dispatchEvent(new Event('change')); },
    credits(value, cost = 5, scope = context) {
      remaining = value;
      const event = new Event('seedance:credits-updated');
      Object.defineProperty(event, 'detail', { value: { remaining: value, cost, context: scope } });
      events.dispatchEvent(event);
    },
  };
}

test('selecting one or two images previews one or zero images without spending the real balance', async () => {
  const h = harness();
  try {
    await h.controller.loadBalance();
    assert.equal(h.states.at(-1).displayBalance, 5);
    assert.equal(h.balanceElement.textContent, '1 image remaining');
    assert.equal(h.states.at(-1).currentBalance, 10);
    assert.equal(h.label.textContent, 'AFTER GENERATION');
    h.select('2');
    assert.equal(h.states.at(-1).displayBalance, 0);
    assert.equal(h.balanceElement.textContent, '0 images remaining');
    assert.equal(h.states.at(-1).currentBalance, 10);
    assert.equal(h.flags['is-exhausted'], false);
    assert.equal(h.flags['is-insufficient'], false);
  } finally { h.controller.destroy(); }
});

test('image success and refund show actual balances until a new selection, including after refresh', async () => {
  const h = harness();
  try {
    await h.controller.loadBalance();
    h.credits(5);
    assert.equal(h.states.at(-1).displayBalance, 5);
    assert.equal(h.balanceElement.textContent, '1 image remaining');
    assert.equal(h.label.textContent, 'REMAINING');
    await h.controller.loadBalance();
    assert.equal(h.states.at(-1).displayBalance, 5, 'loading after completion must not subtract again');
    await h.focus();
    assert.equal(h.states.at(-1).displayBalance, 5, 'focusing a completed task keeps its actual balance');
    h.select('1');
    assert.equal(h.states.at(-1).displayBalance, 0);
    assert.equal(h.flags['is-exhausted'], false);
    h.credits(10);
    assert.equal(h.states.at(-1).displayBalance, 10, 'a refund is already reflected in the actual balance');
    h.select('2');
    assert.equal(h.states.at(-1).displayBalance, 0);
  } finally { h.controller.destroy(); }
});

test('guest control fallback is applied before cost and projection are computed', async () => {
  const { guestImageQuantityState } = await import('../app/guest-image.mjs');
  const quantity = Object.assign(new EventTarget(), { value: '2' });
  const states = [];
  const controller = createCreditSummaryController({
    quantityControl: quantity, costElement: { textContent: '' }, currentBalanceElement: { textContent: '' },
    container: { classList: { toggle() {} } }, eventTarget: new EventTarget(), getContext: () => 'guest-image',
    prepareControls: remaining => { quantity.value = guestImageQuantityState({ guest: true, remaining, value: quantity.value }).value; },
    fetchImpl: async () => Response.json({ credits: { remaining: 5, guest: true, expiresDaily: false } }),
    onChange: state => states.push(state),
  });
  try {
    await controller.loadBalance();
    assert.equal(quantity.value, '1');
    assert.equal(states.at(-1).cost, 5);
    assert.equal(states.at(-1).displayBalance, 0);
    assert.equal(states.at(-1).insufficient, false);
  } finally { controller.destroy(); }
});

test('a resumed task uses its already reserved balance while a new task previews its upcoming cost', async () => {
  const h = harness({ context: 'guest-video', remaining: 5 });
  try {
    await h.controller.loadBalance();
    h.controller.beginGeneration({ reserved: true });
    assert.equal(h.states.at(-1).displayBalance, 5);
    h.controller.beginGeneration();
    assert.equal(h.states.at(-1).displayBalance, 0);
    assert.equal(h.states.at(-1).currentBalance, 5);
  } finally { h.controller.destroy(); }
});

test('H3 previews five or zero seconds, and reservation, repeated status and refunds do not double subtract', async () => {
  const h = harness({ context: 'guest-video' });
  try {
    await h.controller.loadBalance();
    assert.equal(h.states.at(-1).displayBalance, 5);
    assert.equal(h.balanceElement.textContent, '5 seconds remaining');
    h.select('10');
    assert.equal(h.states.at(-1).displayBalance, 0);
    h.credits(0, 10);
    assert.equal(h.states.at(-1).displayBalance, 0);
    h.credits(0, 10);
    assert.equal(h.states.at(-1).displayBalance, 0);
    h.credits(10, 10);
    assert.equal(h.states.at(-1).displayBalance, 10);
    h.select('5');
    assert.equal(h.states.at(-1).displayBalance, 5);
    h.credits(5);
    h.credits(5);
    await h.controller.loadBalance();
    assert.equal(h.states.at(-1).displayBalance, 5);
    h.select('5');
    assert.equal(h.states.at(-1).displayBalance, 0);
    assert.equal(h.flags['is-exhausted'], false);
  } finally { h.controller.destroy(); }
});

test('unknown balances stay unknown, account previews agree, and other quota pools cannot overwrite them', async () => {
  const h = harness({ context: 'account', remaining: 15 });
  try {
    assert.equal(h.states.at(-1).displayBalance, null);
    await h.controller.loadBalance();
    assert.equal(h.states.at(-1).displayBalance, 10);
    h.credits(0, 5, 'guest-image');
    assert.equal(h.states.at(-1).currentBalance, 15);
    assert.equal(h.states.at(-1).displayBalance, 10);
    await h.controller.reset();
    assert.equal(h.label.textContent, 'AFTER GENERATION');
  } finally { h.controller.destroy(); }
});

test('Chinese image and H3 summaries distinguish forecast and actual remaining in their own units', async () => {
  const original = globalThis.window;
  globalThis.window = { location: { pathname: '/zh/app' } };
  try {
    for (const [context, expected] of [['guest-image', '剩余 1 张图片'], ['guest-video', '剩余 5 秒']]) {
      const h = harness({ context });
      try {
        await h.controller.loadBalance();
        assert.equal(h.balanceElement.textContent, expected);
        assert.equal(h.label.textContent, '生成后预计剩余');
        h.credits(5);
        assert.equal(h.balanceElement.textContent, expected);
        assert.equal(h.label.textContent, '实际剩余');
      } finally { h.controller.destroy(); }
    }
  } finally {
    if (original === undefined) delete globalThis.window;
    else globalThis.window = original;
  }
});
