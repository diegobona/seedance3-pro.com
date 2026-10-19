// Internal credits remain five per image; guest-facing controls use image counts.
export function guestImageQuantityState({ guest, remaining = null, value = '1' }) {
  if (!guest) return { value, disabled: [] };
  const available = remaining === null ? 2 : Math.floor(remaining / 5);
  const disabled = [1, 2, 3].filter(count => count > Math.min(2, available));
  return { value: [1, 2].includes(Number(value)) && !disabled.includes(Number(value)) ? value : '1', disabled };
}
