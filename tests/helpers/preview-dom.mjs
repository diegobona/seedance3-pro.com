// Small DOM fixture for the browser controller's state and node-retention tests.
// It deliberately supports only the native APIs exercised by these tests.
export class TestElement extends EventTarget {
  constructor(tagName, ownerDocument) {
    super();
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.children = [];
    this.attributes = new Map();
    this.dataset = {};
    this.hidden = false;
    this.className = '';
    this._text = '';
    this.style = { values: new Map(), setProperty(name, value) { this.values.set(name, value); }, getPropertyValue(name) { return this.values.get(name) || ''; } };
    this.rect = { top: 100, bottom: 600, left: 100, right: 700 };
    this.scrolls = [];
    this.focuses = [];
  }
  get childNodes() { return this.children; }
  get firstChild() { return this.children[0] || null; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this.replaceChildren(); this._text = String(value); }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'id') this.id = String(value);
    if (name === 'class') this.className = String(value);
    if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
  }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  append(...nodes) {
    for (const node of nodes) {
      node.remove();
      node.parentNode = this;
      this.children.push(node);
    }
  }
  appendChild(node) { this.append(node); return node; }
  replaceChildren(...nodes) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    this._text = '';
    this.append(...nodes);
  }
  remove() {
    if (!this.parentNode) return;
    const siblings = this.parentNode.children;
    siblings.splice(siblings.indexOf(this), 1);
    this.parentNode = null;
  }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  matches(selector) {
    if (selector.startsWith('#')) return this.id === selector.slice(1);
    if (selector.startsWith('.')) return this.className.split(/\s+/).includes(selector.slice(1));
    const attribute = /^\[([^=\]]+)(?:=['"]?([^'"\]]+)['"]?)?\]$/.exec(selector);
    if (attribute) return this.getAttribute(attribute[1]) !== null && (attribute[2] === undefined || this.getAttribute(attribute[1]) === attribute[2]);
    return this.tagName.toLowerCase() === selector;
  }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  getBoundingClientRect() { return this.rect; }
  scrollIntoView(options) { this.scrolls.push(options); }
  focus(options) { this.focuses.push(options); this.ownerDocument.activeElement = this; }
  click() { this.dispatchEvent(new Event('click')); }
}

export class TestDocument {
  constructor({ width = 1280, reducedMotion = false } = {}) {
    this.activeElement = null;
    this.defaultView = {
      innerWidth: width,
      innerHeight: 800,
      matchMedia: query => ({ matches: query.includes('reduced-motion') ? reducedMotion : width <= 980 }),
    };
  }
  createElement(tag) { return new TestElement(tag, this); }
}

export function createPreviewFixture({ width = 1280, reducedMotion = false } = {}) {
  const timers = new Map();
  const clearedTimers = [];
  let timerStarts = 0;
  let now = 10_000;
  const document = new TestDocument({ width, reducedMotion });
  const root = document.createElement('aside');
  root.setAttribute('id', 'generation-output');
  const elements = { 'generation-output': root };
  function element(id, parent = root, tag = 'div') {
    const node = document.createElement(tag);
    node.setAttribute('id', id);
    parent.append(node);
    elements[id] = node;
    return node;
  }
  const stage = element('generation-preview');
  const idle = element('preview-idle', stage);
  element('preview-placeholder', idle);
  for (const model of ['image-a', 'image-b']) {
    const group = element(`idle-${model}`, idle);
    group.setAttribute('data-preview-model', model);
  }
  const pending = element('preview-pending', stage);
  element('preview-status', pending);
  element('preview-elapsed', pending);
  element('preview-placeholders', pending);
  element('preview-resume', pending, 'button');
  const result = element('result-card', stage);
  element('result-gallery', result);
  element('result-heading-label', result);
  element('result-model-label', result);
  element('result-note', result);
  const error = element('preview-error', stage);
  element('preview-error-message', error);
  element('preview-retry', error, 'button');
  const history = element('generation-history');
  element('generation-history-list', history);
  element('view-generation-result', root, 'button');
  return {
    root, elements, document, timers, clearedTimers,
    get timerStarts() { return timerStarts; },
    advance(milliseconds) { now += milliseconds; for (const callback of timers.values()) callback(); },
    options: {
      root,
      nowImpl: () => now,
      setIntervalImpl(callback) { const id = ++timerStarts; timers.set(id, callback); return id; },
      clearIntervalImpl(id) { clearedTimers.push(id); timers.delete(id); },
    },
    resultItem(onAction = () => {}) {
      const item = document.createElement('figure');
      const action = document.createElement('button');
      action.addEventListener('click', onAction);
      item.append(action);
      return { item, action };
    },
  };
}
