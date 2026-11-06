// A return URL is a request to verify payment, never proof that credits were added.
export function initializeCheckoutReturnStatus({ userId = '', eventTarget = window, fetchImpl = fetch,
  setTimeoutImpl = globalThis.setTimeout, clearTimeoutImpl = globalThis.clearTimeout } = {}) {
  const query = new URLSearchParams(eventTarget.location?.search || '');
  const sessionId = query.get('session_id') || '';
  if (typeof userId !== 'string' || !userId || /^guest[:-]/.test(userId)
    || query.get('checkout') !== 'success' || !/^cs_[A-Za-z0-9_]{1,240}$/.test(sessionId)) return () => {};

  let active = true, completed = false, suspended = false, attempts = 0, epoch = 0, timer, request;
  const clearTimer = () => { clearTimeoutImpl(timer); timer = undefined; };
  const suspend = () => {
    suspended = true; epoch++; clearTimer(); request?.abort(); request = undefined;
  };
  async function poll() {
    if (!active || completed || suspended || request) return;
    const current = epoch;
    const controller = new AbortController(); request = controller; attempts++;
    try {
      const response = await fetchImpl('/api/billing/history', {
        credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      });
      if (!response.ok) throw Error('history');
      const payload = await response.json();
      if (!active || current !== epoch) return;
      const order = Array.isArray(payload?.orders) ? payload.orders.find(order => order?.sessionId === sessionId) : null;
      if (order?.status === 'paid' || order?.status === 'reversed') {
        completed = true;
        if (order.status === 'paid') eventTarget.dispatchEvent(new Event('seedance:payment-verified'));
      }
    } catch { /* A failed read cannot confirm payment. A later read may succeed. */ }
    finally {
      if (request === controller) request = undefined;
      if (active && current === epoch && !completed && !suspended && attempts < 12) timer = setTimeoutImpl(poll, 5000);
    }
  }
  function refresh() {
    if (!active || completed || request) return;
    suspended = false; attempts = 0; clearTimer(); void poll();
  }
  const restored = event => { if (event.persisted) refresh(); };
  eventTarget.addEventListener('focus', refresh);
  eventTarget.addEventListener('pageshow', restored);
  eventTarget.addEventListener('pagehide', suspend);
  refresh();
  return () => {
    active = false; suspend();
    eventTarget.removeEventListener('focus', refresh);
    eventTarget.removeEventListener('pageshow', restored);
    eventTarget.removeEventListener('pagehide', suspend);
  };
}
