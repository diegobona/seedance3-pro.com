export const CREDIT_OFFER_CYCLE_MS = 5 * 24 * 60 * 60 * 1_000;
export const CREDIT_OFFER_STORAGE_KEY = 'seedance:credit-pack-offer:start:v1';

function readStart(storage, timestamp) {
  try {
    const raw = storage?.getItem(CREDIT_OFFER_STORAGE_KEY);
    if (raw == null || raw.trim() === '') return null;
    const value = Number(raw);
    return Number.isSafeInteger(value) && value >= 0 && value <= timestamp ? value : null;
  } catch { return null; }
}

export function createCreditOfferClock({ storage, now = Date.now } = {}) {
  const timestamp = now();
  let start = readStart(storage, timestamp);
  if (start === null) {
    start = timestamp;
    try { storage?.setItem(CREDIT_OFFER_STORAGE_KEY, String(start)); } catch { /* Continue for this visit when storage is blocked. */ }
  }
  return () => {
    const current = now();
    start = readStart(storage, current) ?? start;
    const elapsed = Math.max(0, current - start);
    const total = Math.ceil((CREDIT_OFFER_CYCLE_MS - elapsed % CREDIT_OFFER_CYCLE_MS) / 1_000);
    const pad = value => String(value).padStart(2, '0');
    return {
      days: pad(Math.floor(total / 86_400)),
      hours: pad(Math.floor(total % 86_400 / 3_600)),
      minutes: pad(Math.floor(total % 3_600 / 60)),
      seconds: pad(total % 60),
    };
  };
}

export function subscribeCreditOfferCountdown(onChange, {
  storage, now = Date.now, eventTarget = globalThis.window,
  setIntervalImpl = globalThis.setInterval, clearIntervalImpl = globalThis.clearInterval,
} = {}) {
  if (storage === undefined) {
    try { storage = globalThis.localStorage; } catch { /* Storage can be blocked by browser privacy settings. */ }
  }
  const clock = createCreditOfferClock({ storage, now });
  const update = () => onChange(clock());
  const onStorage = event => {
    if (event.key === CREDIT_OFFER_STORAGE_KEY || event.key === null) update();
  };
  update();
  const timer = setIntervalImpl(update, 1_000);
  eventTarget?.addEventListener('pageshow', update);
  eventTarget?.addEventListener('focus', update);
  eventTarget?.addEventListener('storage', onStorage);
  return () => {
    clearIntervalImpl(timer);
    eventTarget?.removeEventListener('pageshow', update);
    eventTarget?.removeEventListener('focus', update);
    eventTarget?.removeEventListener('storage', onStorage);
  };
}
