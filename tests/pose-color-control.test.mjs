import test from 'node:test';
import assert from 'node:assert/strict';
import { bindLiveColorControl } from '../app/pose-color-control.mjs';

test('color drag previews before commit and produces one undo snapshot', () => {
  const input = new EventTarget();
  let color = '#ffffff';
  const history = [];
  const dispose = bindLiveColorControl(input, {
    canEdit: () => true, capture: () => ({ color }),
    apply: value => { color = value; }, commit: value => history.push(value),
  });
  for (const value of ['#ff0000', '#00ff00']) {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    assert.equal(color, value);
    assert.equal(history.length, 0);
  }
  input.dispatchEvent(new Event('change'));
  input.dispatchEvent(new Event('blur'));
  assert.deepEqual(history, [{ color: '#ffffff' }]);
  input.value = '#0000ff';
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new Event('blur'));
  assert.deepEqual(history[1], { color: '#00ff00' });
  dispose();
  input.value = '#000000';
  input.dispatchEvent(new Event('input'));
  assert.equal(color, '#0000ff');
});

test('blocked color edits do not preview or create history', () => {
  const input = new EventTarget();
  const unexpected = () => assert.fail('blocked edit');
  bindLiveColorControl(input, { canEdit: () => false, capture: unexpected, apply: unexpected, commit: unexpected });
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new Event('change'));
  input.dispatchEvent(new Event('blur'));
});
