// Keep displayed image numbers aligned with attachment order.
const tokens = () => /(?<![a-zA-Z0-9_])@(?:Image\s*|图片\s*|图\s*)(\d+)(?!\d)|<Picture\s*(\d+)>/giu;
export function normalizeReferenceMentions(prompt, count) {
  return String(prompt || '').replace(tokens(), (_, a, b) => {
    const number = Number(a || b);
    if (number < 1 || number > count) throw Error('A referenced image is missing. Check the image numbers in your prompt.');
    return `<Picture ${number}>`;
  });
}
export function removeReferenceFromPrompt(prompt, index) {
  const number = index + 1;
  if ([...prompt.matchAll(tokens())].some(match => Number(match[1] || match[2]) === number)) return null;
  return prompt.replace(tokens(), (token, a, b) => Number(a || b) > number ? token.replace(/\d+/, String(Number(a || b) - 1)) : token);
}
export function mentionQuery(prompt, caret) {
  const match = prompt.slice(0, caret).match(/(?<![a-zA-Z0-9_])@((?:I(?:m(?:a(?:g(?:e)?)?)?)?|图(?:片)?)?\s*\d*)$/iu);
  return match ? { start: caret - match[0].length, query: match[1].trim() } : null;
}

export function createReferenceMentions(prompt, { zh = false, onError = () => {} } = {}) {
  const text = (en, cn) => zh ? cn : en;
  const hint = document.createElement('small'); hint.className = 'reference-mention-hint';
  hint.textContent = text('Type @ to reference an image.', '输入 @ 选择参考图。');
  const menu = document.createElement('div'); menu.className = 'reference-mention-menu'; menu.hidden = true;
  menu.id = `reference-mentions-${Math.random().toString(36).slice(2)}`; menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-label', text('Reference images', '参考图'));
  prompt.after(menu, hint);
  if (!document.getElementById('reference-mention-style')) {
    const style = document.createElement('style'); style.id = 'reference-mention-style';
    style.textContent = `.reference-mention-menu[hidden],.reference-mention-hint[hidden]{display:none!important}.reference-mention-hint{display:block;color:#94aab9;font:12px/1.5 sans-serif;margin:7px 0}.reference-mention-menu{position:relative;z-index:5;max-height:240px;overflow:auto;margin-top:6px;padding:6px;background:#13212c;border:1px solid #375d6c;border-radius:12px;box-shadow:0 12px 28px #0006}.reference-mention-menu button{display:flex;align-items:center;gap:12px;width:100%;padding:8px;border:0;border-radius:7px;background:transparent;color:#f1f6fb;text-align:left;font:500 14px/1.4 sans-serif;cursor:pointer}.reference-mention-menu button[aria-selected=true]{background:#284858}.reference-mention-menu img{width:48px;height:40px;object-fit:contain;border-radius:5px;background:#080d12}`;
    document.head.append(style);
  }
  let references = [], enabled = false, active = 0, query = null, choices = [], blurTimer;
  const saved = new Map(['role', 'aria-autocomplete', 'aria-controls', 'aria-expanded', 'aria-activedescendant'].map(name => [name, prompt.getAttribute(name)]));
  function close() { menu.hidden = true; prompt.setAttribute('aria-expanded', 'false'); prompt.removeAttribute('aria-activedescendant'); }
  function select(index) {
    if (!query || !choices[index]) return;
    const number = choices[index].number;
    prompt.setRangeText(`@Image ${number} `, query.start, prompt.selectionStart, 'end');
    close(); prompt.focus({ preventScroll: true }); prompt.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function highlight() {
    [...menu.children].forEach((button, index) => button.setAttribute('aria-selected', String(index === active)));
    const button = menu.children[active];
    if (button) prompt.setAttribute('aria-activedescendant', button.id);
  }
  function refresh() {
    if (!enabled || prompt.disabled || document.activeElement !== prompt || prompt.selectionStart !== prompt.selectionEnd) return close();
    clearTimeout(blurTimer);
    query = mentionQuery(prompt.value, prompt.selectionStart);
    if (!query) return close();
    const number = query.query.match(/\d+/)?.[0];
    choices = references.map((ref, index) => ({ ...ref, number: index + 1 })).filter(ref => !number || String(ref.number).startsWith(number));
    if (!choices.length) return close();
    active = 0; menu.replaceChildren();
    choices.forEach((ref, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.id = `${menu.id}-${index}`; button.setAttribute('role', 'option');
      const image = document.createElement('img'); image.src = ref.url; image.alt = '';
      button.append(image, document.createTextNode(text(`Image ${ref.number}`, `参考图 ${ref.number}`)));
      button.onpointerdown = event => event.preventDefault(); button.onclick = () => select(index); menu.append(button);
    });
    menu.hidden = false; prompt.setAttribute('aria-expanded', 'true'); highlight();
  }
  function keydown(event) {
    if (event.isComposing || menu.hidden) return;
    if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault(); active = (active + (event.key === 'ArrowDown' ? 1 : choices.length - 1)) % choices.length; highlight(); menu.children[active]?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter') { event.preventDefault(); select(active); }
    else if (event.key === 'Escape') { event.preventDefault(); close(); }
  }
  const blur = () => { blurTimer = setTimeout(close, 120); };
  for (const event of ['input', 'click', 'focus']) prompt.addEventListener(event, refresh);
  prompt.addEventListener('keydown', keydown); prompt.addEventListener('blur', blur);
  return {
    update(options) {
      references = options.references; enabled = options.enabled; hint.hidden = !enabled;
      if (enabled) { prompt.setAttribute('role', 'combobox'); prompt.setAttribute('aria-autocomplete', 'list'); prompt.setAttribute('aria-controls', menu.id); }
      else { close(); for (const [name, value] of saved) value === null ? prompt.removeAttribute(name) : prompt.setAttribute(name, value); }
      refresh();
    },
    beforeRemove(index) {
      if (!enabled) return true;
      const next = removeReferenceFromPrompt(prompt.value, index);
      if (next === null) { onError(text(`Remove the reference to Image ${index + 1} from your prompt first.`, `请先删除提示词中对参考图 ${index + 1} 的引用，再移除图片。`)); return false; }
      prompt.value = next; prompt.dispatchEvent(new Event('input', { bubbles: true })); return true;
    },
    destroy() { clearTimeout(blurTimer); menu.remove(); hint.remove(); for (const event of ['input', 'click', 'focus']) prompt.removeEventListener(event, refresh); prompt.removeEventListener('keydown', keydown); prompt.removeEventListener('blur', blur); for (const [name, value] of saved) value === null ? prompt.removeAttribute(name) : prompt.setAttribute(name, value); },
  };
}
