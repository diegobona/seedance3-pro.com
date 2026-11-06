// The same catalog is used by the picker and by server-side checkout validation.
export const CREDIT_PACKS = Object.freeze([
  Object.freeze({ id: 'starter-1190', name: 'Starter', amount: 1190, credits: 1100, bonus: 100, popular: false }),
  Object.freeze({ id: 'creator-2490', name: 'Creator', amount: 2490, credits: 3000, bonus: 500, popular: false }),
  Object.freeze({ id: 'pro-4990', name: 'Pro', amount: 4990, credits: 6500, bonus: 1500, popular: true }),
]);
/** @type {string} */
export const DEFAULT_CREDIT_PACK_ID = CREDIT_PACKS[0].id;
// Retired packs remain valid only for settling previously created orders.
export const LEGACY_CREDIT_PACKS = Object.freeze([
  Object.freeze({ amount: 499, credits: 500 }),
  Object.freeze({ amount: 999, credits: 1100 }),
]);
export function creditPack(id = DEFAULT_CREDIT_PACK_ID) {
  return CREDIT_PACKS.find(pack => pack.id === id) ?? null;
}

export function creditPackValue(pack) {
  const base = pack.credits - pack.bonus;
  const starter = CREDIT_PACKS[0];
  return { base, bonusPercent: Math.round(pack.bonus / base * 100),
    price: (pack.amount / 100).toFixed(2), unitPrice: (pack.amount / 100 / pack.credits).toFixed(4),
    savingsPercent: Math.max(0, (1 - (pack.amount / pack.credits) / (starter.amount / starter.credits)) * 100).toFixed(1),
    videoSeconds: pack.credits, minutes: Math.floor(pack.credits / 60), seconds: pack.credits % 60, clips: Math.floor(pack.credits / 5) };
}
