const INTENT_KEY = 'seedance_credit_checkout_v1';
const INTENT_TTL = 10 * 60 * 1000;

export function creditPurchaseUrl(locale = 'en') {
  return `${locale === 'zh' ? '/zh' : ''}/billing?checkout=start`;
}

// Reserve a tab during the click, before the asynchronous Stripe request, then
// navigate it straight to checkout. Never replace the creator's current page.
export async function openCreditPurchase({ locale = 'en', eventTarget = window, requestCheckout = requestCreditCheckout } = {}) {
  const tab = eventTarget.open('about:blank', '_blank');
  if (!tab) throw new CreditCheckoutError('POPUP_BLOCKED');
  tab.opener = null;
  try {
    const url = await requestCheckout({ locale });
    if (!tab.closed) tab.location.replace(url);
  } catch (error) {
    if (tab.closed) return;
    if (error?.code === 'AUTH_REQUIRED') {
      // Authentication is required to attach the purchase to an account. This
      // route resumes checkout automatically after Google login, without a buy click.
      tab.location.replace(creditPurchaseUrl(locale));
      return;
    }
    tab.close();
    throw error;
  }
}

export function bindCreditPurchaseLink(link, { locale = 'en', eventTarget = window,
  requestCheckout = requestCreditCheckout } = {}) {
  let busy = false;
  link.target = '_blank'; link.rel = 'noopener noreferrer';
  const click = async event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (busy) return;
    busy = true; link.setAttribute('aria-busy', 'true');
    link.parentElement.querySelector('[data-checkout-error]')?.remove();
    try { await openCreditPurchase({ locale, eventTarget, requestCheckout }); }
    catch {
      const message = link.ownerDocument.createElement('p');
      message.dataset.checkoutError = ''; message.setAttribute('role', 'alert');
      message.textContent = locale === 'zh' ? '无法打开付款页面，请重试。' : 'Could not open checkout. Please try again.';
      link.insertAdjacentElement('afterend', message);
    } finally { busy = false; link.removeAttribute('aria-busy'); }
  };
  link.addEventListener('click', click);
  return () => link.removeEventListener('click', click);
}

export class CreditCheckoutError extends Error {
  constructor(code = 'CHECKOUT_FAILED') {
    super('Could not open checkout.');
    this.code = code;
  }
}

export async function requestCreditCheckout({ locale = 'en', returnTo, fetchImpl = fetch } = {}) {
  const response = await fetchImpl('/api/billing/checkout', {
    method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ locale: locale === 'zh' ? 'zh' : 'en', ...(['/', '/zh/'].includes(returnTo) ? {returnTo} : {}) }), signal: AbortSignal.timeout(35000),
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
