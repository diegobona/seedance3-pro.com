import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { BRAND_VERSION } from '../app/site-brand.mjs';
import { EMAIL_PASSWORD_AUTH_ENABLED } from '../app/auth-methods.mjs';

const auth = await import('../assets/home-auth.js').catch(() => ({}));

class Element extends EventTarget {
  constructor(tag, doc) {
    super(); this.tagName = tag.toUpperCase(); this.ownerDocument = doc;
    this.children = []; this.attributes = new Map(); this.dataset = {};
    this.style = { setProperty(name, value) { this[name] = value; } };
    this.hidden = this.disabled = this.inert = false; this.value = ''; this.className = '';
    this.tabIndex = ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(this.tagName) ? 0 : -1;
    this.classList = { toggle: (name, force) => {
      const values = new Set(this.className.split(' ').filter(Boolean));
      (force ?? !values.has(name)) ? values.add(name) : values.delete(name);
      this.className = [...values].join(' ');
    } };
  }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return (this._text || '') + this.children.map(child => child.textContent).join(''); }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'tabindex') this.tabIndex = Number(value);
  }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  append(...nodes) { for (const node of nodes) { node.remove(); node.parentNode = this; this.children.push(node); } }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); this.parentNode = null; }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  get isConnected() { return this.ownerDocument.head.contains(this) || this.ownerDocument.body.contains(this); }
  focus() { this.ownerDocument.activeElement = this; }
  closest(selector) { return this.matches(selector) ? this : this.parentNode?.closest(selector); }
  matches(selector) {
    if (selector === '[hidden]') return this.hidden;
    if (selector.startsWith('.')) return this.className.split(' ').includes(selector.slice(1));
    const match = selector.match(/^(\w+)?(?:\[([\w-]+)(?:="([^"]*)")?\])?$/);
    if (!match) return false;
    const [, tag, attribute, value] = match;
    const actual = attribute?.startsWith('data-') ? this.dataset[attribute.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())]
      : this.getAttribute(attribute) ?? this[attribute];
    return (!tag || this.tagName === tag.toUpperCase()) && (!attribute || (value === undefined ? actual !== undefined && actual !== null : String(actual) === value));
  }
  querySelectorAll(selector) {
    const results = [], selectors = selector.split(',').map(value => value.trim());
    const visit = element => { for (const child of element.children) { if (selectors.some(value => child.matches(value))) results.push(child); visit(child); } };
    visit(this); return results;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
}

function fixture(t, { lang = 'en', respond = () => Response.json({ token: 'session-cookie-token', user: { id: 'user-1' } }) } = {}) {
  assert.equal(typeof auth.openHomeAuth, 'function', 'the standalone bundle exports the homepage popup');
  const previous = Object.fromEntries(['document', 'window', 'location', 'fetch'].map(key => [key, globalThis[key]]));
  const doc = new EventTarget(); doc.documentElement = { lang };
  doc.createElement = tag => new Element(tag, doc);
  doc.head = doc.createElement('head'); doc.body = doc.createElement('body');
  doc.querySelector = selector => doc.head.querySelector(selector) || doc.body.querySelector(selector);
  const win = new EventTarget(); win.location = { href: 'https://seedance.test/zh/?draft=1#generator', origin: 'https://seedance.test', assign(url) { this.href = url; } };
  win.CustomEvent = globalThis.CustomEvent; doc.defaultView = win;
  const opener = doc.createElement('button'); doc.body.append(opener); opener.focus();
  const calls = [], changes = []; win.addEventListener('seedance:auth-changed', event => changes.push(event));
  Object.assign(globalThis, { document: doc, window: win, location: win.location,
    fetch: async (url, options) => { calls.push({ url: String(url), options, body: options.body ? JSON.parse(options.body) : null }); return respond(url, options); } });
  t.after(async () => {
    doc.body.querySelector('.auth-dialog-close')?.dispatchEvent(new Event('click'));
    await settle();
    for (const [key, value] of Object.entries(previous)) if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
  });
  return { doc, win, opener, calls, changes, query: selector => doc.body.querySelector(selector),
    open: options => auth.openHomeAuth(options),
    submit() { this.query('[name="email"]').value = 'creator@example.test'; this.query('[name="password"]').value = 'correct horse'; this.query('form').dispatchEvent(new Event('submit', { cancelable: true })); },
    close() { this.query('.auth-dialog-close').dispatchEvent(new Event('click')); } };
}
const settle = async () => { for (let index = 0; index < 5; index++) await new Promise(resolve => setTimeout(resolve, 0)); };

test('the standalone browser bundle opens Google sign-in without Node process or other Node globals', async t => {
  const f = fixture(t, { respond: () => Response.json({ url: 'https://accounts.google.com/o/oauth2/auth', redirect: true }) });
  const source = await readFile(new URL('../assets/home-auth.js', import.meta.url), 'utf8');
  // Only expose the ESM export as a global; execute the exact bundled browser code.
  const script = source.replace(/export\s*\{\s*(\w+)\s+as\s+openHomeAuth\s*\};?\s*$/, 'globalThis.openHomeAuth = $1;');
  assert.notEqual(script, source, 'the bundle remains a single standalone ES module');
  const browser = {
    document: f.doc, window: f.win, location: f.win.location, fetch: globalThis.fetch,
    Request, Response, Headers, URL, URLSearchParams, AbortController, CustomEvent,
    setTimeout, clearTimeout, setInterval, clearInterval, TextEncoder, TextDecoder,
  };
  runInNewContext(script, browser, { filename: 'home-auth.browser.js' });
  assert.equal('process' in browser, false); assert.equal('Buffer' in browser, false); assert.equal('require' in browser, false);
  const result = browser.openHomeAuth();
  const state = await Promise.race([
    result.then(value => ({ value }), error => ({ error })),
    new Promise(resolve => setTimeout(() => resolve({ pending: true }), 0)),
  ]);
  assert.equal(state.error, undefined, state.error?.stack);
  assert.ok(f.query('.auth-dialog'), 'the popup mounted in the browser environment');
  f.query('.google-auth-button').dispatchEvent(new Event('click')); await settle();
  assert.equal(f.calls[0].body.provider, 'google');
  assert.match(f.win.location.href, /^https:\/\/accounts\.google\.com\//);
  f.close(); assert.equal(await result, false);
});

test('email login shares the same-origin cookie API, stays on the page and notifies header consumers', { skip: !EMAIL_PASSWORD_AUTH_ENABLED }, async t => {
  const f = fixture(t); const callbackURL = 'https://seedance.test/?auth_return=1&draft=1#generator';
  const result = f.open({ callbackURL });
  assert.equal(f.doc.head.querySelector('link').href, `/assets/home-auth.css?v=${BRAND_VERSION}`);
  assert.equal(f.doc.activeElement, f.query('[name="email"]'));
  assert.equal(f.opener.inert, true);
  f.submit(); assert.equal(await result, true);
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].url, 'https://seedance.test/api/auth/sign-in/email');
  assert.equal(f.calls[0].options.credentials, 'same-origin'); assert.equal(f.calls[0].body.callbackURL, callbackURL);
  assert.equal(f.win.location.href, 'https://seedance.test/zh/?draft=1#generator');
  assert.equal(f.changes.length, 1); assert.equal(f.doc.activeElement, f.opener); assert.equal(f.opener.inert, false);
  assert.equal(f.query('.auth-dialog'), null);
});

test('signup checks confirmation, sends the email prefix as name and renders Chinese labels', { skip: !EMAIL_PASSWORD_AUTH_ENABLED }, async t => {
  const f = fixture(t, { lang: 'zh-CN' }); const result = f.open({ mode: 'register' });
  assert.equal(f.query('h2').textContent, '创建你的账户');
  f.query('[name="confirmPassword"]').value = 'does not match'; f.submit(); await settle();
  assert.equal(f.calls.length, 0); assert.match(f.query('.auth-error').textContent, /两次输入的密码不一致/);
  f.query('[name="confirmPassword"]').value = 'correct horse'; f.submit(); assert.equal(await result, true);
  assert.equal(f.calls[0].url, 'https://seedance.test/api/auth/sign-up/email');
  assert.equal(f.calls[0].body.name, 'creator');
  assert.equal(f.calls[0].body.callbackURL, f.win.location.href);
  assert.equal('confirmPassword' in f.calls[0].body, false);
});

test('closing during email authentication ignores a later success and restores focus immediately', { skip: !EMAIL_PASSWORD_AUTH_ENABLED }, async t => {
  let complete; const response = new Promise(resolve => { complete = resolve; });
  const f = fixture(t, { respond: () => response }); const result = f.open(); f.submit(); await settle();
  assert.equal(f.query('.auth-submit').disabled, true);
  f.close(); assert.equal(await result, false); assert.equal(f.doc.activeElement, f.opener);
  complete(Response.json({ token: 'late-session', user: { id: 'user-1' } })); await settle();
  assert.equal(f.changes.length, 0); assert.equal(f.query('.auth-dialog'), null);
});

test('beforeRedirect failure stays retryable and Google receives the exact saved callback after retry', async t => {
  let attempts = 0;
  const f = fixture(t, { respond: () => Response.json({ url: 'https://accounts.google.com/o/oauth2/auth?state=opaque', redirect: true }) });
  const callbackURL = 'https://seedance.test/zh/?auth_return=1&draft=2#generator';
  const errorCallbackURL = 'https://seedance.test/zh/?auth_cancelled=1&lang=zh#generator';
  const result = f.open({ callbackURL, errorCallbackURL, beforeRedirect: async () => { if (++attempts === 1) throw Error('storage quota'); } });
  f.query('.google-auth-button').dispatchEvent(new Event('click')); await settle();
  assert.equal(f.calls.length, 0); assert.equal(f.query('.google-auth-button').disabled, false);
  assert.match(f.query('.auth-error').textContent, /try again/i);
  f.query('.google-auth-button').dispatchEvent(new Event('click')); await settle();
  assert.equal(attempts, 2); assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url, 'https://seedance.test/api/auth/sign-in/social');
  assert.equal(f.calls[0].body.provider, 'google'); assert.equal(f.calls[0].body.callbackURL, callbackURL);
  assert.equal(f.calls[0].body.errorCallbackURL, errorCallbackURL, 'OAuth cancellation uses the provided error callback unchanged');
  assert.match(f.win.location.href, /^https:\/\/accounts\.google\.com\//);
  assert.equal(f.query('.google-auth-button').disabled, true, 'keep provider sign-in pending until the browser leaves');
  f.close(); assert.equal(await result, false); assert.equal(f.changes.length, 0);
});

test('the default Google error callback returns to the homepage without a successful OAuth marker', async t => {
  const f = fixture(t, { respond: () => Response.json({ url: 'https://accounts.google.com/o/oauth2/auth', redirect: true }) });
  f.win.location.href = 'https://seedance.test/zh/?draft=1&auth_return=1&auth_nonce=old#generator';
  const result = f.open(); f.query('.google-auth-button').dispatchEvent(new Event('click')); await settle();
  assert.equal(f.calls[0].body.errorCallbackURL, 'https://seedance.test/zh/?draft=1&auth_cancelled=1#generator');
  assert.equal(f.changes.length, 0); f.close(); assert.equal(await result, false);
});

test('closing while a Google draft is saving prevents provider navigation', async t => {
  let saved; const saving = new Promise(resolve => { saved = resolve; }); const f = fixture(t);
  const result = f.open({ beforeRedirect: () => saving });
  f.query('.google-auth-button').dispatchEvent(new Event('click')); f.close();
  assert.equal(await result, false); saved(); await settle(); assert.equal(f.calls.length, 0);
});

test('Escape, backdrop, focus wrapping and repeated opens remain accessible', async t => {
  const f = fixture(t); const result = f.open(); const repeated = f.open({ mode: 'register' });
  assert.equal(f.doc.body.querySelectorAll('.auth-dialog').length, 1);
  const first = f.query('.auth-dialog-close'), last = f.query(EMAIL_PASSWORD_AUTH_ENABLED ? '.auth-submit' : '.google-auth-button'); last.focus();
  const tab = new Event('keydown', { cancelable: true }); Object.assign(tab, { key: 'Tab', shiftKey: false }); f.doc.dispatchEvent(tab);
  assert.equal(f.doc.activeElement, first); assert.equal(tab.defaultPrevented, true);
  const reverse = new Event('keydown', { cancelable: true }); Object.assign(reverse, { key: 'Tab', shiftKey: true }); f.doc.dispatchEvent(reverse);
  assert.equal(f.doc.activeElement, last);
  const escape = new Event('keydown', { cancelable: true }); Object.assign(escape, { key: 'Escape' }); f.doc.dispatchEvent(escape);
  assert.equal(await result, false); assert.equal(await repeated, false);
  const again = f.open(); f.query('.auth-dialog-backdrop').dispatchEvent(new Event('mousedown'));
  assert.equal(await again, false); assert.equal(f.doc.head.querySelectorAll('link').length, 1);
});

test('signup without a session cannot report authentication success', { skip: !EMAIL_PASSWORD_AUTH_ENABLED }, async t => {
  let verified = false;
  const f = fixture(t, { respond: () => verified ? Response.json({ token: 'session', user: { id: 'user-1' } }) : Response.json({ token: null, user: { id: 'user-1' } }) });
  const result = f.open({ mode: 'register' }); f.query('[name="confirmPassword"]').value = 'correct horse'; f.submit(); await settle();
  assert.equal(f.changes.length, 0); assert.equal(f.query('.auth-submit').disabled, false);
  assert.match(f.query('.auth-error').textContent, /verify|sign in/i);
  verified = true; f.submit(); assert.equal(await result, true);
});

test('authentication errors remain retryable and never display internal server details', { skip: !EMAIL_PASSWORD_AUTH_ENABLED }, async t => {
  let failed = true;
  const f = fixture(t, { respond: () => failed
    ? Response.json({ code: 'UNKNOWN_BACKEND_ERROR', message: 'private provider details' }, { status: 503 })
    : Response.json({ token: 'session', user: { id: 'user-1' } }) });
  const result = f.open(); f.submit(); await settle();
  assert.equal(f.query('.auth-submit').disabled, false); assert.equal(f.changes.length, 0);
  assert.match(f.query('.auth-error').textContent, /try again/i);
  assert.doesNotMatch(f.query('.auth-error').textContent, /private/);
  failed = false; f.submit(); assert.equal(await result, true);
});

test('closing during a Google response prevents a late provider redirect', async t => {
  let complete; const response = new Promise(resolve => { complete = resolve; });
  const f = fixture(t, { respond: () => response }); const result = f.open();
  f.query('.google-auth-button').dispatchEvent(new Event('click')); await settle(); f.close();
  assert.equal(await result, false);
  complete(Response.json({ url: 'https://accounts.google.com/o/oauth2/auth', redirect: true })); await settle();
  assert.equal(f.win.location.href, 'https://seedance.test/zh/?draft=1#generator');
});

test('an unsafe provider redirect is rejected without leaving the page', async t => {
  const f = fixture(t, { respond: () => Response.json({ url: 'javascript:alert(1)', redirect: true }) });
  const result = f.open(); f.query('.google-auth-button').dispatchEvent(new Event('click')); await settle();
  assert.equal(f.win.location.href, 'https://seedance.test/zh/?draft=1#generator');
  assert.equal(f.query('.google-auth-button').disabled, false);
  assert.match(f.query('.auth-error').textContent, /try again/i); f.close(); assert.equal(await result, false);
});

for (const lang of ['en', 'zh-CN']) {
  test(`disabled email flow stays unmounted in both login and register modes (${lang})`, { skip: EMAIL_PASSWORD_AUTH_ENABLED }, async t => {
    const f = fixture(t, { lang });
    for (const mode of ['login', 'register']) {
      const result = f.open({ mode });
      assert.equal(f.query('form'), null);
      assert.equal(f.query('input'), null);
      assert.equal(f.query('.auth-mode-tabs'), null);
      assert.equal(f.query('.auth-divider'), null);
      assert.equal(f.doc.activeElement, f.query('.google-auth-button'));
      assert.match(f.query('.auth-dialog').textContent, /Google/);
      f.close(); assert.equal(await result, false);
      assert.equal(f.doc.activeElement, f.opener);
    }
    assert.equal(f.calls.length, 0);
  });
}

test('Google errors stay visible and retryable while the email form is hidden', async t => {
  const f = fixture(t, { respond: () => Response.json({ code: 'UNKNOWN_BACKEND_ERROR', message: 'private provider details' }, { status: 503 }) });
  const result = f.open();
  f.query('.google-auth-button').dispatchEvent(new Event('click')); await settle();
  assert.equal(f.query('.google-auth-button').disabled, false);
  assert.equal(f.query('.auth-error').hidden, false);
  assert.match(f.query('.auth-error').textContent, /try again/i);
  assert.doesNotMatch(f.query('.auth-error').textContent, /private/);
  f.close(); assert.equal(await result, false);
});
