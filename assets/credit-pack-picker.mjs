import { CREDIT_PACKS, DEFAULT_CREDIT_PACK_ID, creditPack } from './credit-packs.mjs';
import { renderCreditPackCard, creditPackFootnote } from './credit-pack-cards.mjs';

const activePickers = new WeakMap();
/** @param {{locale?: string, eventTarget?: Window, selectedPack?: string, onPurchase: (packId: string) => Promise<unknown>, errorMessage: (error: unknown, locale: string) => string}} options */
export function showCreditPackPicker({ locale = 'en', eventTarget = window, selectedPack = DEFAULT_CREDIT_PACK_ID, onPurchase, errorMessage }) {
  const doc = eventTarget.document;
  if (activePickers.has(doc)) return activePickers.get(doc);
  const text = (en, zh) => locale === 'zh' ? zh : en;
  for (const name of ['credit-pack-cards', 'credit-pack-picker']) {
    if (!doc.querySelector(`link[data-credit-style="${name}"]`)) {
      const css = doc.createElement('link'); css.rel = 'stylesheet'; css.href = `/assets/${name}.css?v=20261105-tiers`;
      css.dataset.creditStyle = name; doc.head.append(css);
    }
  }
  const previous = doc.activeElement;
  const dialog = doc.createElement('dialog');
  dialog.className = 'credit-picker'; dialog.setAttribute('aria-labelledby', 'credit-picker-title');
  dialog.innerHTML = `<button type="button" class="credit-picker-close" aria-label="${text('Close', '关闭')}">×</button>
    <header><h2 id="credit-picker-title">${text('Choose your credit pack', '选择适合你的积分包')}</h2>
      <p>${text('Buy once. Create at your own pace.', '一次购买，按你的节奏创作。')}</p></header>
    <fieldset class="credit-picker-options"><legend class="credit-picker-sr">${text('Credit pack', '积分包')}</legend>
      ${CREDIT_PACKS.map(pack => renderCreditPackCard(pack, locale, { radio: true })).join('')}</fieldset>
    <p class="credit-picker-note">${creditPackFootnote(locale)}</p>
    <p class="credit-picker-error" role="alert" hidden></p>
    <button type="button" class="credit-picker-buy"></button>`;
  doc.body.append(dialog);
  const radios = [...dialog.querySelectorAll('input[type="radio"]')];
  const buy = dialog.querySelector('.credit-picker-buy'), error = dialog.querySelector('.credit-picker-error');
  let selected = creditPack(selectedPack) || CREDIT_PACKS[0], busy = false, settled = false;
  const render = () => {
    radios.forEach(radio => { radio.checked = radio.value === selected.id; radio.disabled = busy; });
    buy.disabled = busy;
    buy.textContent = busy ? text('Opening checkout…', '正在打开付款…') : text(`Buy ${selected.credits.toLocaleString('en-US')} credits · US$${(selected.amount / 100).toFixed(2)} →`, `购买 ${selected.credits.toLocaleString('en-US')} 积分 · US$${(selected.amount / 100).toFixed(2)} →`);
  };
  radios.forEach(radio => radio.addEventListener('change', () => { selected = creditPack(radio.value); error.hidden = true; render(); }));
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  activePickers.set(doc, promise);
  const finish = value => {
    if (settled) return; settled = true;
    dialog.close(); dialog.remove(); activePickers.delete(doc);
    doc.documentElement.style.overflow = oldOverflow;
    previous?.focus?.(); resolve(value);
  };
  dialog.querySelector('.credit-picker-close').addEventListener('click', () => finish(false));
  dialog.addEventListener('cancel', event => { event.preventDefault(); finish(false); });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) finish(false); } });
  buy.addEventListener('click', async () => {
    if (busy) return; busy = true; error.hidden = true; render();
    try {
      // Invoke during the click, so the checkout tab is not blocked by the browser.
      await onPurchase(selected.id); finish(true);
    } catch (caught) {
      if (settled) return;
      error.textContent = errorMessage(caught, locale); error.hidden = false; busy = false; render();
    }
  });
  const oldOverflow = doc.documentElement.style.overflow;
  doc.documentElement.style.overflow = 'hidden';
  render(); dialog.showModal(); radios.find(radio => radio.checked)?.focus();
  return promise;
}
