import { createAuthClient } from 'better-auth/client';
import { EMAIL_PASSWORD_AUTH_ENABLED } from './auth-methods.mjs';
import '../src/styles/auth.css';

let currentDialog = null;

function ensureStyles(doc) {
  if (doc.querySelector('[data-home-auth-style]')) return;
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/assets/home-auth.css?v=20261024-blue-brand';
  link.dataset.homeAuthStyle = '';
  doc.head.append(link);
}

/** Resolves true for successful email authentication, or false when dismissed. */
export async function openHomeAuth({ mode = 'login', callbackURL = location.href, errorCallbackURL, beforeRedirect = async () => {} } = {}) {
  if (currentDialog) return currentDialog.promise;
  const doc = document, win = window;
  if (errorCallbackURL === undefined) {
    const cancellationURL = new URL(win.location.href);
    cancellationURL.searchParams.delete('auth_return');
    cancellationURL.searchParams.delete('auth_nonce');
    cancellationURL.searchParams.set('auth_cancelled', '1');
    errorCallbackURL = cancellationURL.href;
  }
  const zh = /^zh(?:-|$)/i.test(doc.documentElement.lang);
  const text = (en, cn) => zh ? cn : en;
  const authClient = createAuthClient({
    baseURL: win.location.origin,
    basePath: '/api/auth',
    fetchOptions: { credentials: 'same-origin' },
    // Email callbacks must return control to the homepage purchase controller.
    // Handle Google redirects below so dismissal also cancels a late response.
    disableDefaultFetchPlugins: true,
  });
  ensureStyles(doc);
  const previousFocus = doc.activeElement;
  const previousOverflow = doc.body.style.overflow;
  const siblings = [...doc.body.children].map(node => [node, node.inert]);
  let active = true, pending = false, controller;
  let resolveResult;
  const promise = new Promise(resolve => { resolveResult = resolve; });
  currentDialog = { promise };
  mode = mode === 'register' ? 'register' : 'login';
  const element = (tag, className = '', value) => {
    const node = doc.createElement(tag); node.className = className;
    if (value !== undefined) node.textContent = value;
    node.style.boxSizing = 'border-box';
    return node;
  };
  const button = (className, label) => {
    const node = element('button', className, label); node.type = 'button'; return node;
  };
  const backdrop = element('div', 'auth-dialog-backdrop');
  backdrop.dataset.homeAuth = '';
  backdrop.style.setProperty('--lime', '#78ded4');
  backdrop.style.setProperty('--line', 'rgba(255,255,255,.1)');
  backdrop.style.setProperty('--text', '#f5f3ed');
  backdrop.style.color = '#f5f3ed';
  backdrop.style.fontFamily = 'Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif';
  backdrop.style.zIndex = '1000';
  const dialog = element('section', 'auth-dialog');
  dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'home-auth-title');
  dialog.setAttribute('aria-describedby', 'home-auth-description');
  const closeButton = button('auth-dialog-close', '×');
  closeButton.setAttribute('aria-label', text('Close login dialog', '关闭登录窗口'));
  const title = element('h2'); title.id = 'home-auth-title';
  const description = element('p', '', EMAIL_PASSWORD_AUTH_ENABLED
    ? text('Sign in to keep creating and manage your credits.', '登录后继续创作，并管理你的积分。')
    : text('Continue with Google to sign in or create your account.', '使用 Google 登录或创建账户。'));
  description.id = 'home-auth-description';
  const tabs = element('div', 'auth-mode-tabs');
  tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', text('Authentication mode', '登录或注册'));
  const loginTab = button('', text('Log in', '登录'));
  const registerTab = button('', text('Register', '注册'));
  for (const [tab, value] of [[loginTab, 'login'], [registerTab, 'register']]) {
    tab.id = `home-auth-${value}`; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', 'home-auth-form');
    tab.addEventListener('click', () => setMode(value));
    tab.addEventListener('keydown', event => {
      if (pending || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      setMode(event.key === 'Home' ? 'login' : event.key === 'End' ? 'register' : mode === 'login' ? 'register' : 'login');
      (mode === 'login' ? loginTab : registerTab).focus();
    });
  }
  tabs.append(loginTab, registerTab);
  const googleButton = button('google-auth-button');
  const googleIcon = element('span', '', 'G'); googleIcon.setAttribute('aria-hidden', 'true');
  googleButton.append(googleIcon, element('span', '', text('Continue with Google', '使用 Google 继续')));
  const divider = element('div', 'auth-divider'); divider.append(element('span', '', text('or use email', '或使用邮箱')));
  const form = element('form'); form.id = 'home-auth-form'; form.setAttribute('role', 'tabpanel');
  const field = (label, name, type, autocomplete) => {
    const wrapper = element('label', '', label), input = element('input');
    input.name = name; input.type = type; input.autocomplete = autocomplete; input.required = true;
    if (type === 'password') input.minLength = 8;
    wrapper.append(input); return [wrapper, input];
  };
  const [emailLabel, email] = field(text('Email', '邮箱'), 'email', 'email', 'email');
  email.inputMode = 'email'; email.spellcheck = false; email.autocapitalize = 'none';
  const [passwordLabel, password] = field(text('Password', '密码'), 'password', 'password', 'current-password');
  const [confirmLabel, confirmPassword] = field(text('Confirm password', '确认密码'), 'confirmPassword', 'password', 'new-password');
  const error = element('div', 'auth-error'); error.setAttribute('role', 'alert'); error.hidden = true;
  const submit = button('auth-submit'); submit.type = 'submit';
  form.append(emailLabel, passwordLabel, confirmLabel, error, submit);
  dialog.append(closeButton, element('span', 'auth-eyebrow', text('SEEDANCE ACCOUNT', 'SEEDANCE 账户')), title, description);
  if (EMAIL_PASSWORD_AUTH_ENABLED) dialog.append(tabs, googleButton, divider, form);
  else dialog.append(googleButton, error);
  backdrop.append(dialog);

  function clearError() { error.textContent = ''; error.hidden = true; }
  function showError(message) { if (active) { error.textContent = message; error.hidden = false; } }
  function failureMessage(authError, google = false) {
    const messages = {
      INVALID_EMAIL_OR_PASSWORD: text('Invalid email or password.', '邮箱或密码不正确。'),
      USER_ALREADY_EXISTS: text('This email is already registered. Please log in.', '该邮箱已注册，请登录。'),
      USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: text('This email is already registered. Please log in.', '该邮箱已注册，请登录。'),
      EMAIL_NOT_VERIFIED: text('Please verify your email before signing in.', '请先验证邮箱，再登录。'),
      TOO_MANY_REQUESTS: text('Too many attempts. Please wait and try again.', '操作过于频繁，请稍后重试。'),
    };
    return messages[authError?.code] || (google ? text('Google sign-in failed. Please try again.', 'Google 登录失败，请重试。')
      : text('Authentication failed. Please try again.', '验证失败，请重试。'));
  }
  function setPending(value) {
    pending = value;
    dialog.setAttribute('aria-busy', String(value));
    for (const node of [googleButton, submit, loginTab, registerTab, email, password, confirmPassword]) node.disabled = value;
    submit.textContent = value ? text('Please wait…', '请稍候…') : mode === 'login' ? text('Log in', '登录') : text('Create account', '创建账户');
  }
  function setMode(value) {
    if (pending) return;
    mode = value; confirmPassword.value = ''; clearError();
    title.textContent = mode === 'login' ? text('Welcome back', '欢迎回来') : text('Create your account', '创建你的账户');
    confirmLabel.hidden = mode !== 'register'; confirmLabel.style.display = mode === 'register' ? 'grid' : 'none';
    confirmPassword.required = mode === 'register';
    password.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    for (const [tab, value] of [[loginTab, 'login'], [registerTab, 'register']]) {
      tab.classList.toggle('is-active', mode === value); tab.setAttribute('aria-selected', String(mode === value));
      tab.setAttribute('tabindex', mode === value ? '0' : '-1');
    }
    form.setAttribute('aria-labelledby', mode === 'login' ? loginTab.id : registerTab.id);
    setPending(false);
  }
  function finish(authenticated = false) {
    if (!active) return;
    active = false; currentDialog = null; controller?.abort();
    doc.removeEventListener('keydown', onKeydown, true); doc.removeEventListener('focusin', keepFocusInside, true);
    backdrop.remove(); doc.body.style.overflow = previousOverflow;
    for (const [node, previousInert] of siblings) node.inert = previousInert;
    if (previousFocus?.isConnected && !previousFocus.inert) previousFocus.focus({ preventScroll: true });
    resolveResult(authenticated);
  }
  function focusable() {
    return [...dialog.querySelectorAll('button, input, a[href], select, textarea, [tabindex]')]
      .filter(node => !node.disabled && node.tabIndex >= 0 && !node.closest('[hidden]'));
  }
  function onKeydown(event) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finish(); return; }
    if (event.key !== 'Tab') return;
    const controls = focusable(), first = controls[0], last = controls.at(-1);
    if (!dialog.contains(doc.activeElement) || event.shiftKey && doc.activeElement === first || !event.shiftKey && doc.activeElement === last) {
      event.preventDefault(); (event.shiftKey ? last : first)?.focus();
    }
  }
  function keepFocusInside(event) { if (active && !dialog.contains(event.target)) closeButton.focus(); }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!EMAIL_PASSWORD_AUTH_ENABLED) return;
    if (!active || pending) return;
    clearError();
    if (mode === 'register' && password.value !== confirmPassword.value) {
      showError(text('Passwords do not match.', '两次输入的密码不一致。')); confirmPassword.focus(); return;
    }
    setPending(true); controller = new AbortController();
    const credentials = { email: email.value.trim(), password: password.value, callbackURL };
    try {
      const options = { signal: controller.signal };
      const result = mode === 'login' ? await authClient.signIn.email(credentials, options)
        : await authClient.signUp.email({ ...credentials, name: credentials.email.split('@')[0] }, options);
      if (!active) return;
      if (result.error) { showError(failureMessage(result.error)); return; }
      if (!result.data?.token || !result.data?.user?.id) {
        showError(text('Please verify your email, then sign in to continue.', '请验证邮箱，然后登录以继续。')); return;
      }
      finish(true);
      win.dispatchEvent(new CustomEvent('seedance:auth-changed'));
    } catch {
      showError(failureMessage());
    } finally {
      if (active) setPending(false);
    }
  });
  googleButton.addEventListener('click', async () => {
    if (!active || pending) return;
    clearError(); setPending(true);
    let navigating = false;
    try {
      await beforeRedirect();
      if (!active) return;
      controller = new AbortController();
      const result = await authClient.signIn.social({ provider: 'google', callbackURL, errorCallbackURL }, { signal: controller.signal });
      if (!active) return;
      if (result.error) { showError(failureMessage(result.error, true)); return; }
      const destination = new URL(result.data?.url);
      if (!result.data?.redirect || destination.protocol !== 'https:' || destination.username || destination.password) throw new Error('Invalid provider redirect');
      win.location.assign(destination.href);
      navigating = true;
    } catch {
      showError(failureMessage(undefined, true));
    } finally {
      if (active && !navigating) setPending(false);
    }
  });
  closeButton.addEventListener('click', () => finish());
  backdrop.addEventListener('mousedown', event => { if (event.target === backdrop) finish(); });
  setMode(mode);
  for (const [node] of siblings) node.inert = true;
  doc.body.style.overflow = 'hidden'; doc.body.append(backdrop);
  doc.addEventListener('keydown', onKeydown, true); doc.addEventListener('focusin', keepFocusInside, true);
  (EMAIL_PASSWORD_AUTH_ENABLED ? email : googleButton).focus({ preventScroll: true });
  return promise;
}
