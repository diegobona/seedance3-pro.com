import { t } from './i18n.mjs';
import { installVerificationStyles, VERIFICATION_ICONS } from './guest-video-verification-ui.mjs';

let scriptPromise;
let verifying = false;
function loadTurnstile() {
  if (globalThis.turnstile?.render) return Promise.resolve(globalThis.turnstile);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => finish(new Error(t('Verification could not load. Please try again.'))), 15000);
    function finish(error) {
      clearTimeout(timer);
      script.onload = script.onerror = null;
      if (error) { script.remove(); scriptPromise = undefined; reject(error); }
      else resolve(globalThis.turnstile);
    }
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => globalThis.turnstile?.render ? finish() : finish(new Error(t('Verification could not load. Please try again.')));
    script.onerror = () => finish(new Error(t('Verification could not load. Please try again.')));
    document.head.append(script);
  });
  return scriptPromise;
}

export async function requestGuestVideoVerification({ siteKey, action, signal }) {
  signal?.throwIfAborted();
  if (verifying) throw new Error(t('Please complete the security check to continue.'));
  if (!siteKey || !['guest_video_generate', 'guest_video_reference'].includes(action)) throw new Error(t('Verification failed. Please try again.'));
  verifying = true;
  installVerificationStyles();
  const previousFocus = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'sv-card';
  dialog.setAttribute('aria-label', t('Security check'));
  const heading = document.createElement('div');
  heading.className = 'sv-heading';
  const mark = document.createElement('span');
  mark.className = 'sv-mark'; mark.innerHTML = VERIFICATION_ICONS.shield;
  const headingText = document.createElement('div');
  const eyebrow = document.createElement('p');
  eyebrow.className = 'sv-eyebrow'; eyebrow.textContent = 'SEEDANCE';
  const title = document.createElement('h2');
  title.className = 'sv-title';
  title.textContent = t('Security check');
  headingText.append(eyebrow, title); heading.append(mark, headingText);
  const message = document.createElement('p');
  message.className = 'sv-description';
  message.id = 'sv-verification-description';
  message.textContent = t('Please complete the security check to continue.');
  dialog.setAttribute('aria-describedby', message.id);
  const close = document.createElement('button');
  close.type = 'button'; close.className = 'sv-close';
  close.setAttribute('aria-label', t('Cancel')); close.innerHTML = VERIFICATION_ICONS.close;
  const container = document.createElement('div');
  container.className = 'sv-widget';
  const loading = document.createElement('span');
  loading.className = 'sv-widget-loading'; loading.setAttribute('role', 'status');
  const spinner = document.createElement('span'); spinner.className = 'sv-spinner'; spinner.setAttribute('aria-hidden', 'true');
  loading.append(spinner, t('Loading security check…')); container.append(loading);
  const note = document.createElement('p');
  note.className = 'sv-foot'; note.innerHTML = VERIFICATION_ICONS.check;
  note.append(t('You will continue automatically after verification.'));
  const actions = document.createElement('div'); actions.className = 'sv-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button'; cancel.className = 'sv-cancel'; cancel.textContent = t('Back to creating');
  actions.append(cancel);
  dialog.append(close, heading, message, container, note, actions);
  document.body.append(dialog);
  dialog.showModal();
  let api, widgetId, timer;
  let abort;
  try {
    return await new Promise((resolve, reject) => {
      let finished = false;
      const finish = (error, token) => {
        if (finished) return;
        finished = true;
        error ? reject(error) : resolve(token);
      };
      const cancelled = () => finish(Object.assign(new Error(t('Verification cancelled. Please try again.')), { code:'GUEST_VERIFICATION_CANCELLED' }));
      abort = () => finish(signal.reason || new DOMException('Aborted', 'AbortError'));
      signal?.addEventListener('abort', abort, { once:true });
      if (signal?.aborted) { abort(); return; }
      cancel.onclick = cancelled;
      close.onclick = cancelled;
      dialog.addEventListener('cancel', event => { event.preventDefault(); cancelled(); });
      timer = setTimeout(() => finish(new Error(t('Verification timed out. Please try again.'))), 120000);
      loadTurnstile().then(loaded => {
        if (finished) return;
        api = loaded;
        loading.remove();
        widgetId = api.render(container, {
          sitekey:siteKey, action, theme:'dark', size:matchMedia('(max-width: 365px)').matches ? 'compact' : 'flexible',
          callback:token => finish(null, token),
          'error-callback':() => { finish(new Error(t('Verification failed. Please try again.'))); return true; },
          'expired-callback':() => finish(new Error(t('Verification timed out. Please try again.'))),
          'timeout-callback':() => finish(new Error(t('Verification timed out. Please try again.'))),
        });
      }).catch(error => finish(error));
    });
  } finally {
    clearTimeout(timer);
    if (abort) signal?.removeEventListener('abort', abort);
    if (widgetId !== undefined) { try { api.remove(widgetId); } catch { /* already removed */ } }
    dialog.close(); dialog.remove(); verifying = false;
    if (previousFocus?.isConnected) previousFocus.focus();
  }
}

/** Retry only the explicit pre-generation challenge, never a failed/ambiguous generation request. */
export async function fetchWithGuestVideoVerification(url, options, fetchImpl = fetch, verifyImpl = requestGuestVideoVerification) {
  const response = await fetchImpl(url, options);
  if (response.status !== 403) return response;
  const payload = await response.clone().json().catch(() => null);
  if (payload?.code !== 'GUEST_VERIFICATION_REQUIRED' || !payload.verification?.siteKey) return response;
  const token = await verifyImpl({ ...payload.verification, signal:options.signal });
  options.signal?.throwIfAborted();
  const headers = new Headers(options.headers);
  headers.set('x-seedance-verification', token);
  return fetchImpl(url, { ...options, headers });
}
