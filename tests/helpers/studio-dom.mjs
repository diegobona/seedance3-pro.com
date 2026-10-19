import { readFileSync } from 'node:fs';
import { TestDocument, TestElement } from './preview-dom.mjs';

function tokenMatches(element, selector) {
  if (element.nodeType === 3) return false;
  const exclusions = [...selector.matchAll(/:not\(([^)]+)\)/g)];
  if (exclusions.some(([, excluded]) => tokenMatches(element, excluded))) return false;
  selector = selector.replace(/:not\([^)]+\)/g, '');
  const tag = /^[a-z][\w-]*/i.exec(selector)?.[0];
  if (tag && element.tagName.toLowerCase() !== tag.toLowerCase()) return false;
  for (const [, id] of selector.matchAll(/#([\w-]+)/g)) if (element.id !== id) return false;
  for (const [, name] of selector.matchAll(/\.([\w-]+)/g)) if (!element.classList.contains(name)) return false;
  for (const [, name, value] of selector.matchAll(/\[([^=\]]+)(?:=['"]?([^'"\]]+)['"]?)?\]/g)) {
    if (!element.hasAttribute(name) || value !== undefined && element.getAttribute(name) !== value) return false;
  }
  return true;
}

class StudioElement extends TestElement {
  constructor(tag, document) {
    super(tag, document);
    this.nodeType = 1;
    this.disabled = false;
    this.naturalWidth = 1024;
    this.naturalHeight = 1024;
    this.classList = {
      contains: name => this.className.split(/\s+/).includes(name),
      toggle: (name, force) => {
        const values = new Set(this.className.split(/\s+/).filter(Boolean));
        const included = force ?? !values.has(name);
        if (included) values.add(name); else values.delete(name);
        this.className = [...values].join(' ');
        return included;
      },
      add: (...names) => names.forEach(name => this.classList.toggle(name, true)),
      remove: (...names) => names.forEach(name => this.classList.toggle(name, false)),
    };
  }
  get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
  get options() { return this.children.filter(child => child.tagName === 'OPTION'); }
  get value() {
    if (this._value !== undefined) return this._value;
    if (this.tagName === 'SELECT') return (this.options.find(option => option.selected) || this.options[0])?.value || '';
    if (this.tagName === 'TEXTAREA' || this.tagName === 'OPTION') return this.textContent;
    return '';
  }
  set value(value) { this._value = String(value); }
  hasAttribute(name) { return this.getAttribute(name) !== null; }
  setAttribute(name, value) {
    super.setAttribute(name, value);
    if (['hidden', 'disabled', 'selected', 'multiple'].includes(name)) this[name] = true;
    if (['value', 'src', 'href', 'type'].includes(name)) this[name] = value;
  }
  removeAttribute(name) {
    super.removeAttribute(name);
    if (['hidden', 'disabled', 'selected', 'multiple'].includes(name)) this[name] = false;
  }
  append(...nodes) { super.append(...nodes.map(node => typeof node === 'string' ? this.ownerDocument.createTextNode(node) : node)); }
  matches(selector) {
    return selector.split(',').some(part => {
      const tokens = part.trim().split(/\s+/);
      if (!tokenMatches(this, tokens.pop())) return false;
      let ancestor = this.parentElement;
      while (tokens.length) {
        const token = tokens.pop();
        while (ancestor && !tokenMatches(ancestor, token)) ancestor = ancestor.parentElement;
        if (!ancestor) return false;
        ancestor = ancestor.parentElement;
      }
      return true;
    });
  }
  closest(selector) {
    for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node;
    return null;
  }
  click() {
    if (this.disabled) return;
    const event = new Event('click', { cancelable: true });
    this.dispatchEvent(event);
    this.onclick?.call(this, event);
  }
  async decode() {}
}

class StudioDocument extends TestDocument {
  constructor() { super(); this.events = new EventTarget(); }
  createElement(tag) { return new StudioElement(tag, this); }
  createTextNode(value) {
    const text = new StudioElement('#text', this);
    text.nodeType = 3;
    text.textContent = value;
    return text;
  }
  getElementById(id) { return this.querySelector(`#${id}`); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    return [...(this.documentElement?.matches(selector) ? [this.documentElement] : []), ...(this.documentElement?.querySelectorAll(selector) || [])];
  }
  addEventListener(...args) { this.events.addEventListener(...args); }
  removeEventListener(...args) { this.events.removeEventListener(...args); }
  dispatchEvent(...args) { return this.events.dispatchEvent(...args); }
}

function parseLegacyHtml() {
  const source = readFileSync(new URL('../../app/legacy-preview.html', import.meta.url), 'utf8')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  const document = new StudioDocument();
  const stack = [];
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  for (const match of source.matchAll(/<!--[\s\S]*?-->|<![^>]*>|<\/?([a-z][\w-]*)([^>]*?)>|([^<]+)/gi)) {
    if (match[3]) {
      if (stack.length) stack.at(-1).append(document.createTextNode(match[3]));
      continue;
    }
    if (!match[1]) continue;
    const tag = match[1].toLowerCase();
    if (match[0].startsWith('</')) {
      const index = stack.findLastIndex(node => node.tagName.toLowerCase() === tag);
      if (index >= 0) stack.length = index;
      continue;
    }
    const node = document.createElement(tag);
    for (const [, name, doubleValue, singleValue, plainValue] of match[2].matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      node.setAttribute(name, doubleValue ?? singleValue ?? plainValue ?? '');
    }
    if (stack.length) stack.at(-1).append(node);
    if (tag === 'html') document.documentElement = node;
    if (tag === 'body') document.body = node;
    if (!voidTags.has(tag) && !match[0].endsWith('/>')) stack.push(node);
  }
  document.documentElement.removeAttribute('data-studio-auto-init');
  return document;
}

export function createStudioEnvironment({ fetchImpl, modelId = 'gpt-image-2' }) {
  const document = parseLegacyHtml();
  const shell = document.querySelector('.studio-shell');
  shell.dataset.authenticated = 'true';
  document.querySelector('.creation-grid').setAttribute('id', 'creation-grid');
  // The legacy page disables models that production SSR exposes and predates
  // the optional pose sidebar control. Supply those production capabilities.
  document.querySelector('[data-model="minimax-h3"]').disabled = false;
  if (!document.querySelector('[data-model="gpt-image-2-5-1k"]')) {
    const button = document.createElement('button');
    button.className = 'model-button';
    button.setAttribute('data-model', 'gpt-image-2-5-1k');
    document.querySelector('nav').append(button);
  }
  if (!document.querySelector('.pose-sidebar-toggle')) {
    const toggle = document.createElement('button');
    toggle.className = 'pose-sidebar-toggle';
    shell.append(toggle);
  }
  const segmented = document.getElementById('mode-group').querySelector('.segmented');
  segmented.replaceChildren(...['text', 'reference'].map(mode => {
    const button = document.createElement('button');
    button.setAttribute('data-video-mode', mode);
    return button;
  }));
  const referenceGroup = document.createElement('div');
  referenceGroup.setAttribute('id', 'video-reference-group');
  for (const [id, tag] of [['video-reference-input', 'input'], ['video-reference-add', 'button'], ['video-reference-grid', 'div'], ['video-reference-count', 'span']]) {
    const node = document.createElement(tag);
    node.setAttribute('id', id);
    referenceGroup.append(node);
  }
  document.getElementById('mode-group').append(referenceGroup);
  document.getElementById('video-resolution').disabled = false;
  document.getElementById('video-aspect-ratio').disabled = false;
  const window = new EventTarget();
  const navigations = [];
  let location = new URL(`https://seedance.test/app/?model=${modelId}`);
  Object.defineProperty(window, 'location', { get: () => ({
    href: location.href, pathname: location.pathname, search: location.search, origin: location.origin,
    assign(destination) { navigations.push(destination); },
  }) });
  window.innerWidth = 1280;
  window.innerHeight = 800;
  window.matchMedia = () => ({ matches: false });
  document.defaultView = window;
  const history = { pushState(_state, _title, destination) { location = new URL(destination, location); } };
  const stored = new Map();
  const sessionStorage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, String(value)), removeItem: key => stored.delete(key) };
  const originalNow = Date.now;
  let now = originalNow();
  let nextTimer = 0;
  const timers = new Map();
  const schedule = (callback, milliseconds, interval) => {
    const id = ++nextTimer;
    timers.set(id, { callback, milliseconds, interval, at: now + Number(milliseconds) });
    return id;
  };
  const globals = {
    document, window, history, sessionStorage, fetch: fetchImpl,
    CustomEvent: class extends Event { constructor(name, options = {}) { super(name); this.detail = options.detail; } },
    addEventListener: window.addEventListener.bind(window),
    removeEventListener: window.removeEventListener.bind(window),
    dispatchEvent: window.dispatchEvent.bind(window),
    setInterval: (callback, milliseconds) => schedule(callback, milliseconds, true),
    clearInterval: id => timers.delete(id),
    setTimeout: (callback, milliseconds) => schedule(callback, milliseconds, false),
    clearTimeout: id => timers.delete(id),
  };
  const previous = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  Date.now = () => now;
  return {
    document, window, sessionStorage, timers, navigations,
    element: id => document.getElementById(id),
    selectModel(id) { document.querySelector(`[data-model="${id}"]`).click(); },
    input(id, value) { const element = document.getElementById(id); element.value = value; element.dispatchEvent(new Event('input')); },
    change(id, value) { const element = document.getElementById(id); element.value = value; element.dispatchEvent(new Event('change')); },
    advance(milliseconds) {
      now += milliseconds;
      for (const [id, timer] of [...timers]) {
        if (timer.at > now || !timers.has(id)) continue;
        if (timer.interval) timer.at = now + timer.milliseconds; else timers.delete(id);
        timer.callback();
      }
    },
    restore() {
      Date.now = originalNow;
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
      }
    },
  };
}
