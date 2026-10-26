// Public pages read the same cookie-backed session as the model workspace.
import { guestDeviceHeaders } from './guest-device.mjs';
import { bindCreditPurchaseLink, requestCreditCheckout } from './credit-checkout.mjs';
export async function loadSiteAccount({ fetchImpl = fetch, signal, onSession = () => {} } = {}) {
  const options = { credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' }, signal };
  const response = await fetchImpl('/api/auth/get-session', options);
  if (!response.ok && response.status !== 401) throw new Error('Account unavailable');
  const payload = response.ok ? await response.json() : null;
  const user = typeof payload?.user?.id === 'string' && payload.user.id ? payload.user : null;
  onSession(user);
  if (!user) return { user: null, credits: null };
  let credits = null;
  try {
    const balanceResponse = await fetchImpl('/api/credits/balance', {
      ...options, headers: { ...options.headers, ...(await guestDeviceHeaders()) },
    });
    if (balanceResponse.ok) {
      const balance = (await balanceResponse.json()).credits;
      if (!balance?.guest && Number.isSafeInteger(balance?.remaining) && balance.remaining >= 0) credits = balance.remaining;
    }
  } catch { /* The account remains visible if its balance is temporarily unavailable. */ }
  return { user, credits };
}

export function initializeSiteAccount(root, { fetchImpl = fetch, eventTarget = window } = {}) {
  const doc = root.ownerDocument;
  const zh = doc.documentElement.lang.startsWith('zh');
  const text = (en, cn) => zh ? cn : en;
  const path = value => (zh ? '/zh' : '') + value;
  let active = true, version = 0, controller, userKey = '', toggle, panel, creditValue;
  const element = (tag, className, value) => {
    const node = doc.createElement(tag); node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  };
  function closeMenu() {
    if (panel) panel.hidden = true;
    toggle?.setAttribute('aria-expanded', 'false');
  }
  function render(user) {
    const key = user ? JSON.stringify([user.id, user.name, user.email, user.image]) : 'guest';
    if (key === userKey) return;
    userKey = key; toggle = panel = creditValue = null;
    const primary=doc.querySelector('[data-home-primary]');
    if(primary){
      primary.textContent=user?text('Buy credits','购买积分'):text('Try for free','免费试用');
      if(user){primary.dataset.homeBuy='';primary.target='_blank';primary.rel='noopener noreferrer';}
      else{delete primary.dataset.homeBuy;primary.removeAttribute('target');primary.removeAttribute('rel');}
      primary.href=user?path('/billing')+'?checkout=start':'#create';
    }
    eventTarget.dispatchEvent(new CustomEvent('seedance:account-changed'));
    root.replaceChildren();
    if (!user) {
      const link = element('a', 'site-account-login', text('Log in', '登录'));
      link.dataset.accountLogin = ''; link.href = path('/app') + '?auth=login'; root.append(link);
      return;
    }
    const name = String(user.name || user.email || text('Account', '账户'));
    const pill = element('a', 'site-account-credits'); pill.href = path('/billing');
    pill.target = '_blank'; pill.rel = 'noopener noreferrer';
    pill.setAttribute('aria-label', text('Credits & billing', '积分与账单'));
    creditValue = element('b', 'site-account-credit-value', '—');
    pill.append(creditValue, doc.createTextNode(text(' credits', ' 积分')));
    toggle = element('button', 'site-account-toggle'); toggle.type = 'button';
    toggle.setAttribute('aria-label', text('Open account menu', '打开账户菜单'));
    toggle.setAttribute('aria-expanded', 'false');
    const avatar = element('span', 'site-account-avatar', name.slice(0, 1).toUpperCase());
    try {
      const imageUrl = new URL(user.image, eventTarget.location.origin);
      if (user.image && ['http:', 'https:'].includes(imageUrl.protocol)) {
        const image = element('img', ''); image.src = imageUrl.href; image.alt = ''; image.referrerPolicy = 'no-referrer';
        image.addEventListener('error', () => { avatar.textContent = name.slice(0, 1).toUpperCase(); }, { once: true });
        avatar.replaceChildren(image);
      }
    } catch { /* Use the initial for an invalid or missing avatar. */ }
    toggle.append(avatar, element('span', 'site-account-name', name));
    panel = element('div', 'site-account-panel'); panel.hidden = true;
    panel.append(element('strong', '', name));
    if (user.email) panel.append(element('small', '', String(user.email)));
    const billing = element('a', 'site-account-billing', text('Buy credits & billing', '购买积分与账单')); billing.href = path('/billing') + '?checkout=start';
    billing.target = '_blank'; billing.rel = 'noopener noreferrer';
    bindCreditPurchaseLink(billing, { locale: zh ? 'zh' : 'en', eventTarget, requestCheckout: options => requestCreditCheckout({ ...options, fetchImpl }) });
    const workspace = element('a', '', text('Open workspace', '打开工作台')); workspace.href = path('/app');
    const details=element('a','site-account-details',text('Credits','积分包'));details.href=path('/pricing');
    const logout = element('button', 'site-account-logout', text('Log out', '退出登录')); logout.type = 'button';
    const error = element('small', 'site-account-error'); error.hidden = true;
    logout.addEventListener('click', async () => {
      logout.disabled = true; error.hidden = true;
      try {
        const response = await fetchImpl('/api/auth/sign-out', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: '{}' });
        if (!response.ok) throw new Error('Sign out failed');
        version += 1; controller?.abort(); render(null); eventTarget.location.reload();
      } catch {
        logout.disabled = false; error.textContent = text('Unable to log out. Please try again.', '退出失败，请重试。'); error.hidden = false;
      }
    });
    panel.append(billing, details, workspace, logout, error);
    toggle.addEventListener('click', () => { panel.hidden = !panel.hidden; toggle.setAttribute('aria-expanded', String(!panel.hidden)); });
    root.append(pill, toggle, panel);
  }
  async function refresh() {
    const current = ++version; controller?.abort(); controller = new AbortController();
    try {
      const account = await loadSiteAccount({ fetchImpl, signal: controller.signal, onSession: user => { if (active && current === version) render(user); } });
      if (active && current === version && creditValue) creditValue.textContent = account.credits ?? '—';
    } catch { /* Keep the last known account and the working login link on transient failures. */ }
  }
  const outside = event => { if (!root.contains(event.target)) closeMenu(); };
  const escape = event => { if (event.key === 'Escape' && panel && !panel.hidden) { closeMenu(); toggle.focus(); } };
  const visible = () => { if (doc.visibilityState === 'visible') void refresh(); };
  const creditsUpdated = event => { if (!event.detail?.context?.startsWith('guest')) void refresh(); };
  doc.addEventListener('mousedown', outside); doc.addEventListener('keydown', escape); doc.addEventListener('visibilitychange', visible);
  eventTarget.addEventListener('focus', refresh); eventTarget.addEventListener('pageshow', refresh); eventTarget.addEventListener('seedance:credits-updated', creditsUpdated);
  eventTarget.addEventListener('seedance:auth-changed',refresh);eventTarget.addEventListener('seedance:payment-verified',refresh);
  void refresh();
  return () => {
    active = false; version += 1; controller?.abort();
    doc.removeEventListener('mousedown', outside); doc.removeEventListener('keydown', escape); doc.removeEventListener('visibilitychange', visible);
    eventTarget.removeEventListener('focus', refresh); eventTarget.removeEventListener('pageshow', refresh); eventTarget.removeEventListener('seedance:credits-updated', creditsUpdated);
    eventTarget.removeEventListener('seedance:auth-changed',refresh);eventTarget.removeEventListener('seedance:payment-verified',refresh);
  };
}

if (typeof document !== 'undefined') document.querySelectorAll('[data-site-account]').forEach(root => initializeSiteAccount(root));
