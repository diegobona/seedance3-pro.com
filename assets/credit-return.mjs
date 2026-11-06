const BASE = 'https://checkout-return.invalid';
const TRANSIENT = new Set([
  'checkout', 'session_id', 'return_to', 'returnto', 'auth', 'auth_return', 'auth_nonce', 'auth_cancelled',
  'code', 'state', 'error', 'error_description', 'access_token', 'id_token', 'refresh_token', 'token', 'token_type',
  'next', 'redirect', 'redirect_uri', 'redirectto', 'callbackurl',
]);

/** Only public, site-relative pages can be used as a payment destination. */
export function normalizeCreditReturn(value) {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/') || value.startsWith('//')
    || /[\\\u0000-\u0020\u007f]/.test(value)) return null;
  const path = value.split(/[?#]/, 1)[0];
  if (/%(?:2f|5c|2e|25|0[0-9a-f]|1[0-9a-f]|7f)/i.test(path)) return null;
  try {
    decodeURIComponent(value);
    const decodedPath = decodeURIComponent(path);
    const url = new URL(value, BASE);
    if (url.origin !== BASE || url.pathname !== path
      || /^\/(?:zh\/)?(?:api|admin|assets|app-assets|_serverFn|_build|\.well-known)(?:\/|$)/i.test(decodedPath)
      || /\.(?:m?js|css|json|xml|txt|png|jpe?g|webp|svg|ico|mp4|webm|woff2?)$/i.test(decodedPath)) return null;
    for (const key of [...url.searchParams.keys()]) {
      if (TRANSIENT.has(key.toLowerCase())) url.searchParams.delete(key);
    }
    // OAuth credentials in fragments must never be forwarded to a payment provider.
    if ([...new URLSearchParams(url.hash.slice(1)).keys()].some(key => TRANSIENT.has(key.toLowerCase()))) url.hash = '';
    return url.pathname + url.search + url.hash;
  } catch { return null; }
}

export function currentCreditReturn(location = globalThis.location) {
  if (!location || typeof location.pathname !== 'string') return null;
  return normalizeCreditReturn(location.pathname + (location.search || '') + (location.hash || ''));
}

export function creditReturnUrl(origin, path, status) {
  const url = new URL(normalizeCreditReturn(path) || '/', origin);
  url.searchParams.set('checkout', status);
  // Keep Stripe's substitution literal, including when a source query contains braces.
  return url.origin + url.pathname + url.search
    + (status === 'success' ? '&session_id={CHECKOUT_SESSION_ID}' : '') + url.hash;
}
