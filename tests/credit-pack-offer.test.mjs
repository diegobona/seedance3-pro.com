import test from 'node:test';
import assert from 'node:assert/strict';
import { createCreditOfferClock, subscribeCreditOfferCountdown, CREDIT_OFFER_CYCLE_MS, CREDIT_OFFER_STORAGE_KEY } from '../assets/credit-pack-offer.mjs';

const initialTime = Date.parse('2026-10-28T00:00:00Z');
function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('a new visitor starts with five full days', () => {
  const storage = memoryStorage();
  const clock = createCreditOfferClock({ storage, now: () => initialTime });
  assert.deepEqual(clock(), { days: '05', hours: '00', minutes: '00', seconds: '00' });
  assert.equal(Number(storage.getItem(CREDIT_OFFER_STORAGE_KEY)), initialTime);
});

test('refreshes and other purchase surfaces share the original countdown', () => {
  const storage = memoryStorage();
  createCreditOfferClock({ storage, now: () => initialTime });
  const clock = createCreditOfferClock({ storage, now: () => initialTime + 3_661_000 });
  assert.deepEqual(clock(), { days: '04', hours: '22', minutes: '58', seconds: '59' });
});

test('expiry starts the next five-day cycle and sleeping tabs catch up without drift', () => {
  let currentTime = initialTime;
  const clock = createCreditOfferClock({ storage: memoryStorage(), now: () => currentTime });
  currentTime += CREDIT_OFFER_CYCLE_MS - 1;
  assert.deepEqual(clock(), { days: '00', hours: '00', minutes: '00', seconds: '01' });
  currentTime += 1;
  assert.deepEqual(clock(), { days: '05', hours: '00', minutes: '00', seconds: '00' });
  currentTime = initialTime + CREDIT_OFFER_CYCLE_MS * 3 + 2_000;
  assert.deepEqual(clock(), { days: '04', hours: '23', minutes: '59', seconds: '58' });
});

test('blocked browser storage still counts down for the current visit', () => {
  let currentTime = initialTime;
  const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const clock = createCreditOfferClock({ storage, now: () => currentTime });
  currentTime += 1_000;
  assert.deepEqual(clock(), { days: '04', hours: '23', minutes: '59', seconds: '59' });
});

test('corrupt or future timestamps cannot extend a cycle beyond five days', () => {
  for (const value of ['invalid', 'NaN', '-1', String(initialTime + CREDIT_OFFER_CYCLE_MS)]) {
    const storage = memoryStorage();
    storage.setItem(CREDIT_OFFER_STORAGE_KEY, value);
    const clock = createCreditOfferClock({ storage, now: () => initialTime });
    assert.deepEqual(clock(), { days: '05', hours: '00', minutes: '00', seconds: '00' });
    assert.equal(Number(storage.getItem(CREDIT_OFFER_STORAGE_KEY)), initialTime);
  }
});

test('subscription ticks, resyncs on return, and releases its timer and listeners', () => {
  let currentTime = initialTime, tick, cleared;
  const eventTarget = new EventTarget(), values = [];
  const stop = subscribeCreditOfferCountdown(value => values.push(value), {
    storage: memoryStorage(), now: () => currentTime, eventTarget,
    setIntervalImpl: (callback, delay) => { tick = callback; assert.equal(delay, 1_000); return 42; },
    clearIntervalImpl: id => { cleared = id; },
  });
  assert.equal(values.length, 1);
  currentTime += 1_000; tick();
  assert.equal(values.at(-1).seconds, '59');
  currentTime = initialTime + CREDIT_OFFER_CYCLE_MS;
  eventTarget.dispatchEvent(new Event('pageshow'));
  assert.equal(values.at(-1).days, '05');
  stop();
  const count = values.length;
  eventTarget.dispatchEvent(new Event('pageshow'));
  assert.equal(values.length, count);
  assert.equal(cleared, 42);
});
