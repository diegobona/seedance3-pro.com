import { DEFAULT_CREDIT_PACK_ID } from './credit-packs.mjs';
import { showCreditPackPicker } from './credit-pack-picker.mjs';
import { normalizeCreditReturn, currentCreditReturn } from './credit-return.mjs';

const INTENT_KEY = 'seedance_credit_checkout_v1';
const INTENT_TTL = 10 * 60 * 1000;

export function creditCheckoutErrorMessage(error, locale = 'en') {
  const zh = locale === 'zh';
  if (error?.code === 'PACKS_UNAVAILABLE') return zh ? '套餐暂时无法加载，请重试。' : 'Could not load credit packs. Please try again.';
  if (error?.code === 'BILLING_HOLD') return zh ? '此账户的购买权限暂时受限，请联系支持。' : 'This account is temporarily restricted from purchasing. Please contact support.';
  if (error?.code === 'BILLING_UNAVAILABLE') return zh ? '付款服务暂时不可用，请稍后重试。' : 'The payment service is temporarily unavailable. Please try again later.';
  if (error?.code === 'POPUP_BLOCKED') return zh ? '浏览器拦截了付款窗口，请允许本站打开新窗口后重试。' : 'Your browser blocked the checkout window. Allow pop-ups for this site and try again.';
  return zh ? '无法打开付款页面，请重试。' : 'Could not open checkout. Please try again.';
}

export function creditPurchaseUrl(locale = 'en', returnTo = currentCreditReturn(), packId = null, purchase = false) {
  const target = normalizeCreditReturn(returnTo);
  const query = new URLSearchParams();
  if(target) query.set('return_to',target);
  if(packId) query.set('pack',packId);
  if(purchase) query.set('purchase','1');
  return `${locale === 'zh' ? '/zh' : ''}/checkout${query.size ? '?' + query : ''}`;
}

export function legacyCreditCheckoutUrl(search, locale = 'en') {
  const query = new URLSearchParams(search);
  return query.get('checkout') === 'start' ? creditPurchaseUrl(locale, query.get('return_to')) : null;
}

// Generic purchase entries show the packs; each card button purchases directly.
export function openCreditPurchase({ locale = 'en', eventTarget = window, requestCheckout = requestCreditCheckout, returnTo = currentCreditReturn(eventTarget.location) } = {}) {
  return showCreditPackPicker({locale, eventTarget, errorMessage: creditCheckoutErrorMessage,
    onPurchase: packId => openSelectedCreditPurchase({locale,eventTarget,requestCheckout,returnTo,packId})});
}

// Show feedback in the reserved tab while checkout starts in parallel.
export async function openSelectedCreditPurchase({ locale = 'en', eventTarget = window, requestCheckout = requestCreditCheckout, returnTo = currentCreditReturn(eventTarget.location), packId = DEFAULT_CREDIT_PACK_ID } = {}) {
  const tab = eventTarget.open(`/assets/checkout-loading?lang=${locale === 'zh' ? 'zh' : 'en'}`, '_blank');
  if (!tab) throw new CreditCheckoutError('POPUP_BLOCKED');
  tab.opener = null;
  try {
    const target = normalizeCreditReturn(returnTo);
    const url = await requestCheckout({ locale, packId, ...(target ? { returnTo: target } : {}) });
    if (!tab.closed) tab.location.replace(url);
  } catch (error) {
    if (tab.closed) return;
    if (error?.code === 'AUTH_REQUIRED') {
      // Authentication is required to attach the purchase to an account. This
      // route resumes checkout automatically after Google login, without a buy click.
      tab.location.replace(creditPurchaseUrl(locale, returnTo, packId, true));
      return;
    }
    tab.close();
    throw error;
  }
}

export function bindCreditPurchaseLink(link, { locale = 'en', eventTarget = window,
  requestCheckout = requestCreditCheckout, openPurchase = openCreditPurchase, purchaseMode = 'picker' } = {}) {
  let busy = false;
  // Promotional entries may describe a pack, but only an explicit pack-card
  // purchase should skip the picker and create a checkout session.
  const selectedPackId = () => purchaseMode === 'direct' ? link.dataset?.packId : null;
  const updateHref = () => { const packId = selectedPackId(); link.href = creditPurchaseUrl(locale, currentCreditReturn(eventTarget.location), packId, Boolean(packId)); };
  updateHref();
  link.target = '_blank'; link.rel = 'noopener noreferrer';
  const click = async event => {
    updateHref();
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (busy) return;
    busy = true; link.setAttribute('aria-busy', 'true');
    link.parentElement.querySelector('[data-checkout-error]')?.remove();
    try {
      if(selectedPackId()) await openSelectedCreditPurchase({locale,eventTarget,requestCheckout,packId:selectedPackId()});
      else await openPurchase({locale,eventTarget,requestCheckout});
    }
    catch (error) {
      const message = link.ownerDocument.createElement('p');
      message.dataset.checkoutError = ''; message.setAttribute('role', 'alert');
      message.textContent = creditCheckoutErrorMessage(error, locale);
      link.insertAdjacentElement('afterend', message);
    } finally { busy = false; link.removeAttribute('aria-busy'); }
  };
  const refreshEvents = ['pointerdown', 'keydown', 'contextmenu'];
  for (const event of refreshEvents) link.addEventListener(event, updateHref);
  link.addEventListener('click', click);
  return () => {
    link.removeEventListener('click', click);
    for (const event of refreshEvents) link.removeEventListener(event, updateHref);
  };
}

export class CreditCheckoutError extends Error {
  constructor(code = 'CHECKOUT_FAILED') {
    super('Could not open checkout.');
    this.code = code;
  }
}

export async function requestCreditCheckout({ locale = 'en', returnTo = currentCreditReturn(), fetchImpl = fetch, packId = DEFAULT_CREDIT_PACK_ID } = {}) {
  const target = normalizeCreditReturn(returnTo);
  const routing = new URLSearchParams({ locale: locale === 'zh' ? 'zh' : 'en', ...(target ? { returnTo: target } : {}) });
  const response = await fetchImpl(`/api/billing/checkout?${routing}`, {
    method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ packId }), signal: AbortSignal.timeout(35000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new CreditCheckoutError(['AUTH_REQUIRED', 'BILLING_HOLD', 'BILLING_UNAVAILABLE'].includes(result.code) ? result.code : 'CHECKOUT_FAILED');
  }
  let url;
  try { url = new URL(result.url); } catch { throw new CreditCheckoutError(); }
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com' || url.username || url.password) throw new CreditCheckoutError();
  return url.href;
}

function browserStorage(storage) {
  try { return storage ?? globalThis.sessionStorage; } catch { return null; }
}

export function rememberCheckoutIntent({ storage = null, path = '', now = Date.now() } = {}) {
  try { browserStorage(storage)?.setItem(INTENT_KEY, JSON.stringify({ path, at: now })); } catch {}
}

export function clearCheckoutIntent(storage = null) {
  try { browserStorage(storage)?.removeItem(INTENT_KEY); } catch {}
}

export function hasCheckoutIntent({ storage = null, path = '', now = Date.now() } = {}) {
  try {
    const intent = JSON.parse(browserStorage(storage)?.getItem(INTENT_KEY) || 'null');
    if (!intent || !Number.isSafeInteger(intent.at) || now < intent.at || now - intent.at > INTENT_TTL) {
      clearCheckoutIntent(storage); return false;
    }
    return intent.path === path;
  } catch { clearCheckoutIntent(storage); return false; }
}
