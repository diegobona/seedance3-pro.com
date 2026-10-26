export function guestVideoDurationState({ guest, remaining = null, value = '5' }) {
  const maximum = guest ? 10 : 15;
  const disabled = [5, 10, 15].filter(seconds => seconds > maximum || (remaining !== null && seconds > remaining));
  return { value: [5, 10, 15].includes(Number(value)) && !disabled.includes(Number(value)) ? value : '5', disabled };
}
