// Native color inputs emit `input` while adjusting and `change` when committed.
// Preview every value, but save only one undo entry for the whole adjustment.
export function bindLiveColorControl(input, { canEdit, capture, apply, commit }) {
  let before = null;
  const preview = () => {
    if (!canEdit()) return;
    before ??= capture();
    apply(input.value);
  };
  const finish = () => {
    if (before !== null) commit(before);
    before = null;
  };
  const change = () => { preview(); finish(); };
  input.addEventListener('input', preview);
  input.addEventListener('change', change);
  input.addEventListener('blur', finish);
  return () => {
    input.removeEventListener('input', preview);
    input.removeEventListener('change', change);
    input.removeEventListener('blur', finish);
  };
}
