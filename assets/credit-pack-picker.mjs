import { CREDIT_PACKS } from './credit-packs.mjs';
import { renderPricingPack, creditPackFootnote, creditPackTerms } from './credit-pack-cards.mjs';
import { startPromotionClock, promoSnapshot, PROMO_ENDS_AT } from './credit-pack-offer.mjs';

const activePickers = new WeakMap();
const styleLoads = new WeakMap();

function loadPickerStyles(doc) {
  if (styleLoads.has(doc)) return styleLoads.get(doc);
  const ready = Promise.all(['credit-pack-cards', 'credit-pack-picker', 'credit-pricing'].map(name => {
    const existing = doc.querySelector(`link[data-credit-style="${name}"]`);
    if (existing?.sheet) return Promise.resolve();
    const css = existing || doc.createElement('link');
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout);
        css.removeEventListener('load', loaded);
        css.removeEventListener('error', failed);
      };
      const loaded = () => { cleanup(); resolve(); };
      const failed = () => {
        cleanup(); css.remove();
        reject(Object.assign(new Error('Credit pack styles did not load.'), { code: 'PACKS_UNAVAILABLE' }));
      };
      const timeout = setTimeout(failed, 15000);
      css.addEventListener('load', loaded);
      css.addEventListener('error', failed);
      if (!existing) {
        css.rel = 'stylesheet'; css.href = `/assets/${name}.css?v=20261107-unified-purchase`;
        css.dataset.creditStyle = name; doc.head.append(css);
      }
    });
  }));
  styleLoads.set(doc, ready);
  ready.catch(() => { if (styleLoads.get(doc) === ready) styleLoads.delete(doc); });
  return ready;
}

// Fetch the shared styles before a purchase click; never display an unstyled picker.
if (typeof document !== 'undefined') loadPickerStyles(document).catch(() => {});

/** @param {{locale?: string, eventTarget?: Window, onPurchase: (packId: string) => Promise<unknown>, errorMessage: (error: unknown, locale: string) => string}} options */
export function showCreditPackPicker({ locale = 'en', eventTarget = window, onPurchase, errorMessage }) {
  const doc = eventTarget.document;
  if (activePickers.has(doc)) return activePickers.get(doc);
  const text = (en, zh) => locale === 'zh' ? zh : en;
  const stylesReady = loadPickerStyles(doc);
  const previous = doc.activeElement;
  const dialog = doc.createElement('dialog');
  dialog.className = 'credit-picker'; dialog.setAttribute('aria-labelledby', 'credit-picker-title');
  dialog.innerHTML = `<button type="button" class="credit-picker-close" aria-label="${text('Close', '关闭')}">×</button>
    <header><h2 id="credit-picker-title">${text('Credit packs', '积分包')}</h2>
      <p class="credit-pack-terms-summary">${creditPackTerms(locale)}</p></header>
    <div class="credit-picker-options" role="group" aria-label="${text('Credit packs', '积分包')}">
      ${CREDIT_PACKS.map(pack => renderPricingPack(pack, locale, { purchaseButton: true })).join('')}</div>
    <p class="credit-picker-note">${creditPackFootnote(locale)}</p>
    <p class="credit-picker-error" role="alert" hidden></p>`;
  doc.body.append(dialog);
  const stopPromo = startPromotionClock(dialog, PROMO_ENDS_AT, promoSnapshot);
  const buttons = [...dialog.querySelectorAll('button[data-credit-pack-buy]')];
  const error = dialog.querySelector('.credit-picker-error');
  let busy = false, settled = false;
  let resolve, reject, oldOverflow;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  activePickers.set(doc, promise);
  const finish = (value, failure = null) => {
    if (settled) return; settled = true;
    stopPromo(); if (dialog.open) dialog.close(); dialog.remove(); activePickers.delete(doc);
    if (oldOverflow !== undefined) doc.documentElement.style.overflow = oldOverflow;
    previous?.focus?.(); if (failure) reject(failure); else resolve(value);
  };
  dialog.querySelector('.credit-picker-close').addEventListener('click', () => finish(false));
  dialog.addEventListener('cancel', event => { event.preventDefault(); finish(false); });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) finish(false); } });
  buttons.forEach(button => button.addEventListener('click', async () => {
    if (busy) return;
    busy = true; error.hidden = true;
    const label = button.textContent;
    buttons.forEach(item => { item.disabled = true; });
    button.textContent = text('Opening checkout…', '正在打开付款…');
    try { await onPurchase(button.dataset.packId); finish(true); }
    catch (caught) {
      if (settled) return;
      error.textContent = errorMessage(caught, locale); error.hidden = false;
      busy = false; buttons.forEach(item => { item.disabled = false; }); button.textContent = label;
    }
  }));
  stylesReady.then(() => {
    if (settled) return;
    oldOverflow = doc.documentElement.style.overflow;
    doc.documentElement.style.overflow = 'hidden';
    dialog.showModal(); buttons[0]?.focus();
  }).catch(caught => finish(false, caught));
  return promise;
}
