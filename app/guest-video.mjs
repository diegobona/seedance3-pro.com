export const GUEST_VIDEO_DURATION_SECONDS = 5;

export function syncVideoDurationOptions(select, guest, label) {
  const seconds = guest ? [5] : [5, 10, 15];
  if ([...select.options].map(option => Number(option.value)).join() === seconds.join()) return;
  const value = select.value;
  select.replaceChildren(...seconds.map(duration => {
    const option = select.ownerDocument.createElement('option');
    option.value = String(duration); option.textContent = label(duration);
    return option;
  }));
  select.value = seconds.includes(Number(value)) ? value : '5';
}

export function guestVideoDurationState({ guest, remaining = null, value = '5' }) {
  const maximum = guest ? GUEST_VIDEO_DURATION_SECONDS : 15;
  const disabled = [5, 10, 15].filter(seconds => seconds > maximum || (remaining !== null && seconds > remaining));
  return { value: [5, 10, 15].includes(Number(value)) && !disabled.includes(Number(value)) ? value : '5', disabled };
}
