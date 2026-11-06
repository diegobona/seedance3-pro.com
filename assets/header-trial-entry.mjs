import { bindCreditPurchaseLink, requestCreditCheckout } from './credit-checkout.mjs';
import { guestDeviceHeaders } from './guest-device.mjs';

/** The header links to the video trial; never advertise it before confirming a usable balance. */
export function initializeHeaderTrialEntry(element, { fetchImpl = fetch, eventTarget = window } = {}) {
  const doc = element.ownerDocument;
  const zh = doc.documentElement.lang.startsWith('zh');
  const originalHref = element.getAttribute('href') || (zh ? '/zh/#create' : '/#create');
  let active = true, version = 0, controller, knownGuest = null, cleanupPurchase;
  element.hidden = true;

  function render(credits) {
    if (!active || !Number.isSafeInteger(credits?.remaining) || credits.remaining < 0) return;
    const guest = credits.guest === true;
    knownGuest = guest;
    const cost = Number.isSafeInteger(credits.generationCost) && credits.generationCost > 0 ? credits.generationCost : 5;
    element.textContent = guest ? zh ? '免费试用' : 'Try for free' : zh ? '购买积分' : 'Buy credits';
    if (guest) {
      cleanupPurchase?.();
      cleanupPurchase = null;
      element.href = originalHref;
      delete element.dataset.homeBuy;
      element.removeAttribute('target');
      element.removeAttribute('rel');
    } else {
      delete element.dataset.homeBuy;
      if (!cleanupPurchase) cleanupPurchase = bindCreditPurchaseLink(element, { locale: zh ? 'zh' : 'en', eventTarget, requestCheckout: options => requestCreditCheckout({ ...options, fetchImpl }) });
    }
    element.setAttribute('data-trial-ready', 'true');
    element.hidden = guest && credits.remaining < cost;
  }

  async function refresh() {
    const current = ++version;
    controller?.abort();
    controller = new AbortController();
    knownGuest = null;
    element.hidden = true;
    try {
      const response = await fetchImpl('/api/credits/balance?guest_video=1', {
        headers: { accept: 'application/json', ...(await guestDeviceHeaders()) },
        credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      });
      const payload = response.ok ? await response.json() : null;
      if (active && current === version) render(payload?.credits);
    } catch { /* Keep free access hidden when availability cannot be confirmed. */ }
  }
  function creditsUpdated(event) {
    const detail = event.detail;
    if (!['guest-video', 'account'].includes(detail?.context) || !Number.isSafeInteger(detail.remaining) || detail.remaining < 0) return;
    // A finished guest task may arrive after login; verify the current session instead.
    if (knownGuest === null || knownGuest !== (detail.context === 'guest-video')) { void refresh(); return; }
    version += 1;
    controller?.abort();
    render({ ...detail, guest: detail.context === 'guest-video' });
  }
  const visible = () => { if (doc.visibilityState === 'visible') void refresh(); };
  const events = ['focus', 'pageshow', 'seedance:auth-changed', 'seedance:account-changed', 'seedance:payment-verified'];
  for (const event of events) eventTarget.addEventListener(event, refresh);
  eventTarget.addEventListener('seedance:credits-updated', creditsUpdated);
  doc.addEventListener('visibilitychange', visible);
  void refresh();
  return () => {
    active = false; version += 1; controller?.abort(); cleanupPurchase?.();
    for (const event of events) eventTarget.removeEventListener(event, refresh);
    eventTarget.removeEventListener('seedance:credits-updated', creditsUpdated);
    doc.removeEventListener('visibilitychange', visible);
  };
}
