import test from 'node:test';
import assert from 'node:assert/strict';
import { createVideoWaitNotice, VIDEO_WAIT_START_KEY } from '../app/video-wait-notice.mjs';
import { TestDocument } from './helpers/preview-dom.mjs';

function fixture({ authenticated = true, zh = true, onElapsed, NotificationImpl } = {}) {
  const document = new TestDocument();
  document.defaultView.Notification = NotificationImpl;
  const events = new EventTarget();
  document.addEventListener = events.addEventListener.bind(events);
  document.removeEventListener = events.removeEventListener.bind(events);
  document.title = 'Video studio';
  const host = document.createElement('section'), saved = new Map(), timers = new Map();
  let time = 100_000, counter = 0;
  const storage = { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) };
  const options = { host, storage, zh, onElapsed, isAuthenticated: () => authenticated, now: () => time,
    setIntervalImpl: fn => { timers.set(++counter, fn); return counter; }, clearIntervalImpl: id => timers.delete(id) };
  const controller = createVideoWaitNotice(options);
  return { controller, options, document, host, events, saved, timers, notice: host.children[0],
    advance(ms) { time += ms; [...timers.values()].forEach(fn => fn()); }, auth(value) { authenticated = value; } };
}

test('homepage clock receives elapsed time immediately, survives resume and clears on stop', () => {
  const ticks = [];
  const f = fixture({ onElapsed: value => ticks.push(value) });
  f.controller.start(); assert.equal(ticks.at(-1), 0);
  f.controller.bindTask('clock'); f.advance(125_000); assert.equal(ticks.at(-1), 125_000);
  f.controller.stop(); assert.equal(ticks.at(-1), null);
  f.controller.start('clock'); assert.equal(ticks.at(-1), 125_000);
  f.auth(false); f.advance(1000); assert.equal(ticks.at(-1), null);
  f.controller.destroy();
});

test('Generate prepares permission, while guest and automatic resume do not prompt', async () => {
  let requests = 0;
  class Notification { static permission = 'default'; static requestPermission() { requests++; return Promise.resolve('default'); } }
  const f = fixture({ NotificationImpl: Notification });
  f.controller.start('resume'); assert.equal(requests, 0);
  f.auth(false); f.controller.prepareNotifications(); assert.equal(requests, 0);
  f.auth(true); f.controller.prepareNotifications(); assert.equal(requests, 1);
  await new Promise(resolve => setImmediate(resolve));
  f.controller.prepareNotifications(); assert.equal(requests, 1);
  f.controller.destroy();
});

test('account video notice appears at 60 seconds, clears on finish, and restarts for a new task', () => {
  const f = fixture(); f.controller.start(); f.controller.bindTask('first');
  f.advance(59_999); assert.equal(f.notice.hidden, true);
  f.advance(1); assert.equal(f.notice.hidden, false);
  assert.match(f.notice.textContent, /5秒视频约需1分钟多、10秒视频3分多、15秒视频5分多/);
  assert.match(f.notice.textContent, /允许浏览器通知后，完成时会自动提醒您/);
  f.controller.stop({ clearSaved: true });
  assert.equal(f.notice.hidden, true); assert.equal(f.timers.size, 0);
  assert.equal(f.saved.has(VIDEO_WAIT_START_KEY), false);
  f.controller.start(); f.advance(59_999); assert.equal(f.notice.hidden, true);
  f.controller.destroy(); assert.equal(f.timers.size, 0); assert.equal(f.host.children.length, 0);
});

test('guests never see the notice; hidden workspaces and paused tasks do not display stale notices', () => {
  const f = fixture({ authenticated: false }); f.controller.start(); f.advance(70_000);
  assert.equal(f.notice.hidden, true);
  f.auth(true); f.advance(1000); assert.equal(f.notice.hidden, false);
  f.controller.setVisible(false); assert.equal(f.notice.hidden, true);
  f.controller.setVisible(true); assert.equal(f.notice.hidden, false);
  f.controller.stop(); f.advance(100_000); assert.equal(f.notice.hidden, true);
});

test('resuming the same task preserves elapsed time; unrelated tasks start a new timer', () => {
  const f = fixture(); f.controller.start(); f.controller.bindTask('accepted'); f.advance(45_000);
  f.controller.destroy(); f.advance(20_000);
  const resumed = createVideoWaitNotice(f.options); resumed.start('accepted');
  assert.equal(f.host.children[0].hidden, false);
  resumed.start('different'); assert.equal(f.host.children[0].hidden, true);
  resumed.destroy();
});

test('background completion updates the tab title until the user returns, without requesting notification permission', () => {
  const f = fixture(); f.document.visibilityState = 'hidden'; f.controller.start();
  f.controller.stop({ completed: true }); assert.equal(f.document.title, '✓ 视频已生成 — Video studio');
  f.document.visibilityState = 'visible'; f.events.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.document.title, 'Video studio');
  f.controller.destroy();
});

test('shared completion path notifies only authenticated successful tasks and deduplicates completion', () => {
  const sent = [];
  class Notification { static permission = 'granted'; constructor(title) { sent.push(title); } close() {} }
  const f = fixture({ NotificationImpl: Notification });
  f.document.visibilityState = 'hidden';
  f.controller.start(); f.controller.bindTask('completed');
  f.controller.stop({ completed: true }); f.controller.stop({ completed: true });
  assert.equal(sent.length, 1);
  f.controller.start(); f.controller.stop(); assert.equal(sent.length, 1);
  f.auth(false); f.controller.start(); f.controller.stop({ completed: true });
  assert.equal(sent.length, 1);
  f.controller.destroy();
});

test('English timing copy is provided and malformed recovery data does not break generation', () => {
  const f = fixture({ zh: false }); f.saved.set(VIDEO_WAIT_START_KEY, '{');
  f.controller.start('accepted'); f.advance(60_000);
  assert.match(f.notice.textContent, /5-second video takes about 1\+ minute/);
  assert.match(f.notice.textContent, /Keep this page open/); f.controller.destroy();
});
