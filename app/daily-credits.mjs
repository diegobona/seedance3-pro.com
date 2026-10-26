const DAY_MS = 24 * 60 * 60 * 1000;
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

export function creditDebitPreview(credits, cost, paidOnly = false) {
  if (!credits || !Number.isSafeInteger(credits.dailyRemaining) || credits.dailyRemaining < 0
    || !Number.isSafeInteger(credits.paidRemaining) || credits.paidRemaining < 0
    || !Number.isSafeInteger(cost) || cost < 0) return null;
  const daily = paidOnly ? 0 : Math.min(credits.dailyRemaining, cost);
  const paid = cost - daily;
  return { daily, paid, dailyAfter: credits.dailyRemaining - daily,
    paidAfter: Math.max(0, credits.paidRemaining - paid), insufficient: paid > credits.paidRemaining };
}

export function verifiedCheckoutStatus(checkout, sessionId, orders = []) {
  if (checkout === 'cancelled') return 'cancelled';
  if (checkout !== 'success') return null;
  const order = sessionId && orders.find(order => order.sessionId === sessionId);
  return order?.status === 'paid' ? 'paid' : order?.status === 'reversed' ? 'reversed' : 'pending';
}

export function millisecondsUntilCreditReset(now = Date.now()) {
  return DAY_MS - ((now + BEIJING_OFFSET_MS) % DAY_MS) + 1000;
}

export function formatCreditResetTime({ now = Date.now(), locale = 'en', timeZone } = {}) {
  const nextReset = new Date(now + millisecondsUntilCreditReset(now) - 1000);
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone,
  }).format(nextReset);
}
