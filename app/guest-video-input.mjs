// Explicit modes are guest-only. Legacy clients retain their single first-frame contract.
export function validGuestVideoInput(mode, count) {
  if (!Number.isInteger(count) || count < 0) return false;
  if (mode === undefined) return count <= 1;
  if (mode === 'text') return count === 0;
  if (mode === 'reference') return count >= 1 && count <= 5;
  if (mode === 'frames') return count >= 1 && count <= 2;
  return false;
}
