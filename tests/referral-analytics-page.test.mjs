import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../admin/referrals.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function page(response) {
  function element() {
    return {
      value: '', textContent: '', dataset: {}, children: [], disabled: false, listeners: {},
      addEventListener(name, listener) { this.listeners[name] = listener; },
      append(child) { this.children.push(child); },
      replaceChildren() { this.children = []; },
      focus() {},
    };
  }
  const nodes = Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => [match[1], element()]));
  const calls = [];
  vm.runInNewContext(script, {
    document: { getElementById: id => nodes[id], createElement: element },
    fetch: async (...args) => { calls.push(args); return typeof response === 'function' ? response() : response; },
    Intl, Date, Error,
    get localStorage() { throw new Error('Do not persist the analytics token'); },
    get sessionStorage() { throw new Error('Do not persist the analytics token'); },
  });
  return {
    nodes, calls,
    submit: () => nodes['analytics-form'].listeners.submit({ preventDefault() {} }),
  };
}

test('statistics are never fetched automatically or without a viewing token', async () => {
  const view = page({ status: 200, ok: true });
  assert.equal(view.calls.length, 0);
  await view.submit();
  assert.equal(view.calls.length, 0);
  assert.match(view.nodes['analytics-status'].textContent, /请输入统计查看令牌/);
});

test('a submitted token reads private statistics and renders zero values and daily results', async () => {
  const view = page({
    status: 200, ok: true,
    json: async () => ({ success: true, source: 'anyposes', totals: { visitors: 2, visits: 4 }, today: { visitors: 0, visits: 0 }, days: [{ date: '2026-10-02', visitors: 2, visits: 4 }, { date: '<img src=x>', visitors: 999, visits: 999 }], trackedSince: null }),
  });
  view.nodes['analytics-token'].value = 'private-token';
  await view.submit();
  assert.equal(view.calls[0][0], '/api/admin/referrals/anyposes');
  assert.equal(view.calls[0][1].headers['x-analytics-token'], 'private-token');
  assert.equal(view.calls[0][1].cache, 'no-store');
  assert.equal(view.nodes['total-visitors'].textContent, '2');
  assert.equal(view.nodes['total-visits'].textContent, '4');
  assert.equal(view.nodes['today-visitors'].textContent, '0');
  assert.equal(view.nodes['month-visits'].textContent, '0');
  assert.equal(view.nodes['daily-stats'].children.length, 1);
  assert.equal(view.nodes['daily-stats'].children[0].children[0].textContent, '2026-10-02');
  assert.equal(view.nodes['load-stats'].disabled, false);
});

test('invalid tokens explain the authorization failure and do not show successful results', async () => {
  const view = page({ status: 401, ok: false });
  view.nodes['analytics-token'].value = 'wrong-token';
  await view.submit();
  assert.match(view.nodes['analytics-status'].textContent, /令牌无效/);
  assert.equal(view.nodes['analytics-status'].dataset.state, 'error');
  assert.equal(view.nodes['refresh-stats'].disabled, false);
});

test('network errors explain that statistics could not be read', async () => {
  const view = page(() => { throw new Error('Network failure'); });
  view.nodes['analytics-token'].value = 'private-token';
  await view.submit();
  assert.match(view.nodes['analytics-status'].textContent, /无法读取统计/);
  assert.equal(view.nodes['load-stats'].disabled, false);
});
