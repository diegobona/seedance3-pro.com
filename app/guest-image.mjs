// One credit is one image for guests and signed-in accounts.
export function guestImageQuantityState({ guest, remaining = null, value = '1' }) {
  const maximum = guest ? 2 : 3;
  const available = remaining === null ? maximum : remaining;
  const disabled = [1, 2, 3].filter(count => count > Math.min(maximum, available));
  return { value: [1, 2, 3].includes(Number(value)) && !disabled.includes(Number(value)) ? value : '1', disabled };
}
