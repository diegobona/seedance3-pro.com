import test from 'node:test';
import assert from 'node:assert/strict';
import { clipboardReferenceImages, handleReferenceImagePaste } from '../app/studio.js';
import { validateImageReferences } from '../app/image-references.mjs';

const image = (name = 'clipboard.png', size = 1) => ({
  name, type: 'image/png', size, async arrayBuffer() { return new ArrayBuffer(size); },
});
const item = file => ({ kind: 'file', type: file.type, getAsFile: () => file });
const paste = clipboardData => ({
  clipboardData, defaultPrevented: false,
  preventDefault() { this.defaultPrevented = true; },
});

test('clipboard image items retain order and are not duplicated by the files fallback', () => {
  const first = image('first.png');
  const second = image('second.png');
  assert.deepEqual(clipboardReferenceImages({
    items: [{ kind: 'string', type: 'text/plain' }, item(first), item(second)],
    files: [first, second],
  }), [first, second]);
});

test('clipboard files-only fallback accepts images and ignores text files or unavailable items', () => {
  const reference = image();
  assert.deepEqual(clipboardReferenceImages({
    items: [{ kind: 'file', type: 'image/png', getAsFile: () => null }],
    files: [{ type: 'text/plain' }, reference],
  }), [reference]);
  assert.deepEqual(clipboardReferenceImages(null), []);
});

test('pasting images consumes the paste only after the reference handler accepts them', () => {
  const reference = image();
  const event = paste({ items: [item(reference)] });
  const added = [];
  assert.equal(handleReferenceImagePaste(event, files => {
    added.push(...files);
    return true;
  }), true);
  assert.deepEqual(added, [reference]);
  assert.equal(event.defaultPrevented, true);

  const blocked = paste({ files: [reference] });
  assert.equal(handleReferenceImagePaste(blocked, () => false), false);
  assert.equal(blocked.defaultPrevented, false, 'blocked or submitting reference panes must not consume the paste');
});

test('ordinary prompt text and already-handled paste events remain untouched', () => {
  const text = paste({ items: [{ kind: 'string', type: 'text/plain' }], files: [] });
  const handled = paste({ files: [image()] });
  handled.preventDefault();
  for (const event of [text, handled]) {
    assert.equal(handleReferenceImagePaste(event, () => assert.fail('must not add reference images')), false);
  }
  assert.equal(text.defaultPrevented, false);
});

test('pasted images use the same combined count and byte limits as file uploads', () => {
  for (const { retained, incoming, message } of [
    { retained: Array.from({ length: 16 }, () => image()), incoming: image(), message: /16 reference images/ },
    { retained: [], incoming: image('large.png', 11 * 1024 * 1024), message: /10 MB/ },
    { retained: [image('a.png', 10 * 1024 * 1024), image('b.png', 10 * 1024 * 1024)], incoming: image('c.png', 5 * 1024 * 1024), message: /24 MB/ },
  ]) {
    const event = paste({ files: [incoming] });
    let error;
    assert.equal(handleReferenceImagePaste(event, files => {
      error = validateImageReferences([...retained, ...files]);
      return !error;
    }), false);
    assert.match(error, message);
    assert.equal(event.defaultPrevented, false);
  }
});
