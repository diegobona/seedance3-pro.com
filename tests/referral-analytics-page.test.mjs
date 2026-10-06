import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../admin/referrals.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const successfulResponse = {
  status: 200, ok: true,
  json: async () => ({ success: true, source: 'anyposes', totals: { visitors: 2, visits: 4 }, today: { visitors: 0, visits: 0 }, days: [{ date: '2026-10-02', visitors: 2, visits: 4 }, { date: '<img src=x>', visitors: 999, visits: 999 }], trackedSince: null }),
};

function page(response) {
  function element() {
    return {
      textContent: '', dataset: {}, children: [], disabled: false, listeners: {},
      addEventListener(name, listener) { this.listeners[name] = listener; },
      append(child) { this.children.push(child); },
      replaceChildren() { this.children = []; },
      setAttribute(name, value) { this[name] = value; },
      focus() {},
    };
  }
  const nodes = Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => [match[1], element()]));
  const calls = [];
  vm.runInNewContext(script, {
    document: { getElementById: id => nodes[id], createElement: element },
    fetch: async (...args) => { calls.push(args); return typeof response === 'function' ? response(...args) : response; },
    Intl, Date, Error,
    get localStorage() { throw new Error('Statistics must use the current admin session'); },
    get sessionStorage() { throw new Error('Statistics must use the current admin session'); },
  });
  return {
    nodes, calls,
    settled: () => new Promise(resolve => setImmediate(resolve)),
    refresh: () => nodes['refresh-stats'].listeners.click(),
    select: source => nodes['tab-' + source].listeners.click(),
  };
}

test('statistics load automatically using the current admin session', async () => {
  const view = page(successfulResponse);
  assert.equal(view.calls.length, 1);
  assert.equal(view.calls[0][0], '/api/admin/referrals/anyposes');
  assert.equal(view.calls[0][1].credentials, 'same-origin');
  assert.equal(view.calls[0][1].cache, 'no-store');
  assert.equal(view.calls[0][1].headers?.['x-analytics-token'], undefined);
  assert.doesNotMatch(html, /analytics-token|analytics-form|load-stats|type="password"|查看令牌/);
  assert.equal([...html.matchAll(/<button\b/g)].length, 3);
  await view.settled();
});

test('source tabs default to AnyPoses and display Pixal3D counts separately', async () => {
  const view = page(url => ({ status: 200, ok: true, json: async () => ({
    success: true, source: url.endsWith('/pixal3d') ? 'pixal3d' : 'anyposes',
    totals: { visitors: url.endsWith('/pixal3d') ? 7 : 2 }, days: [],
  }) }));
  await view.settled();
  assert.equal(view.nodes['total-visitors'].textContent, '2');
  await view.select('pixal3d');
  await view.settled();
  assert.equal(view.calls.at(-1)[0], '/api/admin/referrals/pixal3d');
  assert.equal(view.nodes['total-visitors'].textContent, '7');
  assert.equal(view.nodes['tab-pixal3d']['aria-selected'], 'true');
  assert.match(view.nodes['source-description'].textContent, /pixal3d.net/);
});

test('switching sources ignores late requests and never shows the old source on failure', async () => {
  const pending = [];
  const view = page(url => new Promise(resolve => pending.push({ url, resolve })));
  view.select('pixal3d');
  assert.equal(pending.length, 2);
  pending[1].resolve({ status: 200, ok: true, json: async () => ({ success: true, source: 'pixal3d', totals: { visitors: 7 }, days: [] }) });
  await view.settled();
  pending[0].resolve(successfulResponse);
  await view.settled();
  assert.equal(view.nodes['total-visitors'].textContent, '7');
  view.select('anyposes');
  pending[2].resolve({ status: 503, ok: false });
  await view.settled();
  assert.equal(view.nodes['total-visitors'].textContent, '—');
  assert.equal(view.nodes['analytics-status'].dataset.state, 'error');
  assert.doesNotMatch(view.nodes['analytics-status'].textContent, /上次成功/);
});

test('automatic loading renders zero values and safe daily results', async () => {
  const view = page(successfulResponse);
  await view.settled();
  assert.equal(view.nodes['total-visitors'].textContent, '2');
  assert.equal(view.nodes['total-visits'].textContent, '4');
  assert.equal(view.nodes['today-visitors'].textContent, '0');
  assert.equal(view.nodes['month-visits'].textContent, '0');
  assert.equal(view.nodes['daily-stats'].children.length, 1);
  assert.equal(view.nodes['daily-stats'].children[0].children[0].textContent, '2026-10-02');
  assert.equal(view.nodes['analytics-status'].dataset.state, 'success');
  assert.equal(view.nodes['refresh-stats'].disabled, false);
});

test('refresh loads current statistics again', async () => {
  let visitors = 2;
  const view = page(() => ({ status: 200, ok: true, json: async () => ({ success: true, source: 'anyposes', totals: { visitors }, days: [] }) }));
  await view.settled();
  visitors = 3;
  await view.refresh();
  assert.equal(view.calls.length, 2);
  assert.equal(view.nodes['total-visitors'].textContent, '3');
  assert.equal(view.nodes['daily-stats'].children[0].children[0].textContent, '暂无来源访问记录');
  assert.equal(view.nodes['refresh-stats'].disabled, false);
});

test('refresh stays disabled and avoids concurrent requests while loading', async () => {
  let finishRequest;
  const view = page(() => new Promise(resolve => { finishRequest = resolve; }));
  assert.equal(view.nodes['refresh-stats'].disabled, true);
  await view.refresh();
  assert.equal(view.calls.length, 1);
  finishRequest(successfulResponse);
  await view.settled();
  assert.equal(view.nodes['refresh-stats'].disabled, false);
});

for (const [status, message] of [[401, '请先登录后台后再查看统计。'], [403, '当前账号没有后台统计权限。']]) {
  test(`HTTP ${status} explains the current admin session requirement`, async () => {
    const view = page({ status, ok: false });
    await view.settled();
    assert.equal(view.nodes['analytics-status'].textContent, message);
    assert.equal(view.nodes['analytics-status'].dataset.state, 'error');
    assert.equal(view.nodes['refresh-stats'].disabled, false);
  });
}

test('network errors explain that statistics could not be read', async () => {
  const view = page(() => { throw new Error('Network failure'); });
  await view.settled();
  assert.equal(view.nodes['analytics-status'].textContent, '无法读取统计，请检查网络连接后重试。');
  assert.equal(view.nodes['refresh-stats'].disabled, false);
});

test('a failed refresh explains that the previous results remain visible', async () => {
  let failing = false;
  const view = page(() => failing ? { status: 503, ok: false } : successfulResponse);
  await view.settled();
  failing = true;
  await view.refresh();
  assert.match(view.nodes['analytics-status'].textContent, /无法读取统计.*下方仍显示上次成功读取的结果/);
  assert.equal(view.nodes['total-visitors'].textContent, '2');
});
