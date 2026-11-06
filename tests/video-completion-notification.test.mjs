import test from 'node:test';
import assert from 'node:assert/strict';
import { TestDocument } from './helpers/preview-dom.mjs';
import { createVideoCompletionNotification } from '../app/video-completion-notification.mjs';

function fixture({ permission = 'default', supported = true, zh = true } = {}) {
  const document = new TestDocument(), events = new EventTarget(), sent = [];
  let requests = 0, focuses = 0;
  class Notification {
    static permission = permission;
    static async requestPermission() { requests++; this.permission = 'granted'; return 'granted'; }
    constructor(title, options) { this.title = title; this.options = options; sent.push(this); }
    close() { this.closed = true; }
  }
  document.visibilityState = 'visible'; document.hasFocus = () => true;
  Object.assign(document.defaultView, { isSecureContext: true, focus() { focuses++; },
    addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) });
  const host = document.createElement('div');
  const controller = createVideoCompletionNotification({ host, zh, NotificationImpl: supported ? Notification : null });
  return { controller, document, events, host, sent, Notification, get requests() { return requests; }, get focuses() { return focuses; },
    button: host.querySelector('button'), row: host.firstChild };
}

test('Generate prepares notification permission without a separate reminder button', async () => {
  const f = fixture(); f.controller.setActive(true);
  assert.equal(f.requests, 0); assert.equal(f.button, null);
  void f.controller.requestPermission(); void f.controller.requestPermission();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.requests, 1); assert.equal(f.button, null);
  assert.match(f.row.textContent, /桌面提醒已开启/); f.controller.destroy();
});

test('background completion creates one desktop notification and clicking returns to the result', () => {
  const f = fixture({ permission: 'granted' }); let revealed = 0;
  f.controller.setActive(true); f.document.visibilityState = 'hidden';
  f.controller.complete('task-one', () => revealed++); f.controller.complete('task-one');
  assert.equal(f.sent.length, 1); assert.equal(f.requests, 0);
  assert.equal(f.sent[0].options.tag, 'seedance-video-ready-task-one');
  f.sent[0].onclick(); assert.equal(f.focuses, 1); assert.equal(revealed, 1); assert.equal(f.sent[0].closed, true);
  f.controller.destroy();
});

test('foreground completion stays quiet, but switching to another application sends a reminder', () => {
  const f = fixture({ permission: 'granted', zh: false });
  f.controller.complete('foreground'); assert.equal(f.sent.length, 0);
  f.controller.reset(); f.document.hasFocus = () => false;
  f.controller.complete('background'); assert.equal(f.sent.length, 1);
  assert.match(f.sent[0].title, /Your video is ready/);
  f.controller.destroy(); assert.equal(f.sent[0].closed, true);
});

test('blocked, unsupported and throwing notification APIs cannot break video completion', async () => {
  for (const options of [{ permission: 'denied' }, { supported: false }, {}]) {
    const f = fixture(options); f.controller.setActive(true); f.document.visibilityState = 'hidden';
    f.controller.complete('task'); assert.equal(f.sent.length, 0); assert.equal(f.requests, 0);
    f.controller.destroy();
  }
  const f = fixture(); f.controller.setActive(true);
  f.Notification.requestPermission = async () => { throw Error('Blocked'); };
  await f.controller.requestPermission();
  assert.match(f.row.textContent, /未能开启/); assert.equal(f.button, null);
  f.controller.destroy();
  const document = new TestDocument(); document.visibilityState = 'hidden';
  class BrokenNotification { static permission = 'granted'; constructor() { throw Error('Unavailable'); } }
  const c = createVideoCompletionNotification({ host: document.createElement('div'), NotificationImpl: BrokenNotification });
  assert.doesNotThrow(() => c.complete('task')); c.destroy();
});

test('a late permission response cannot resurrect a finished or unmounted prompt', async () => {
  const f = fixture(); let resolve;
  f.Notification.requestPermission = () => new Promise(r => { resolve = r; });
  f.controller.setActive(true); void f.controller.requestPermission(); f.controller.setActive(false); f.controller.destroy();
  resolve('granted'); await new Promise(r => setImmediate(r));
  assert.equal(f.host.children.length, 0); assert.equal(f.sent.length, 0);
});
