const DAY_MS = 24 * 60 * 60 * 1000;
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

export function millisecondsUntilCreditReset(now = Date.now()) {
  return DAY_MS - ((now + BEIJING_OFFSET_MS) % DAY_MS) + 1000;
}

export function formatCreditResetTime({ now = Date.now(), locale = 'en', timeZone } = {}) {
  const nextReset = new Date(now + millisecondsUntilCreditReset(now) - 1000);
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone,
  }).format(nextReset);
}
