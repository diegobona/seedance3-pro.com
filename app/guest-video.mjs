export function guestVideoDurationState({ guest, remaining = null, value = '5' }) {
  if (!guest) return { value, disabled: [] };
  const disabled = [5, 10, 15].filter(seconds => seconds > 10 || (remaining !== null && seconds > remaining));
  return { value: [5, 10].includes(Number(value)) && !disabled.includes(Number(value)) ? value : '5', disabled };
}
