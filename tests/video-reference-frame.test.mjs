import test from 'node:test';
import assert from 'node:assert/strict';
import { videoReferenceFrameSize, videoReferenceLayout, prepareVideoReferenceFrame } from '../app/video-reference-frame.mjs';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const original = () => new File(['source'], 'original.jpg', { type: 'image/jpeg' });

test('the reported 1080x938 image fits native landscape and portrait frames without changing its proportions', () => {
  for (const [ratio, size, edges] of [
    ['16:9', [864, 480], ['horizontal', 480]],
    ['9:16', [480, 864], ['vertical', 480]],
    ['1:1', [480, 480], ['vertical', 480]],
  ]) {
    assert.deepEqual(videoReferenceFrameSize(ratio), { width: size[0], height: size[1] });
    const fit = videoReferenceLayout(1080, 938, ratio);
    assert.equal(fit.width, size[0]);
    assert.equal(fit.height, size[1]);
    near(fit.drawWidth / 1080, fit.drawHeight / 938);
    near(fit.drawX * 2 + fit.drawWidth, fit.width);
    near(fit.drawY * 2 + fit.drawHeight, fit.height);
    if (edges[0] === 'horizontal') { assert.ok(fit.drawX > 150); near(fit.drawHeight, edges[1]); }
    else { assert.ok(fit.drawY > 0); near(fit.drawWidth, edges[1]); }
  }
});

test('tall, wide, square and matching images retain the entire source inside every supported frame', () => {
  for (const ratio of ['16:9', '9:16', '1:1']) {
    const size = videoReferenceFrameSize(ratio);
    for (const [width, height] of [[60, 4000], [4000, 60], [1000, 1000], [size.width, size.height]]) {
      const fit = videoReferenceLayout(width, height, ratio);
      near(fit.drawWidth / fit.drawHeight, width / height);
      assert.ok(fit.drawX >= 0 && fit.drawY >= 0);
      assert.ok(fit.drawX + fit.drawWidth <= fit.width + 1e-8);
      assert.ok(fit.drawY + fit.drawHeight <= fit.height + 1e-8);
      if (width === size.width && height === size.height) {
        assert.equal(fit.drawX, 0); assert.equal(fit.drawY, 0);
      }
    }
  }
  for (const ratio of ['', 'adaptive', '10000000:1', '__proto__']) assert.throws(() => videoReferenceFrameSize(ratio));
  for (const width of [0, -1, NaN, Infinity]) assert.throws(() => videoReferenceLayout(width, 100, '16:9'));
});

function graphics({ failEncoding = false, abort, dimensions = [1080, 938] } = {}) {
  const draws = []; const fills = []; let closed = 0;
  const context = { fillRect: (...args) => fills.push([context.fillStyle, ...args]), drawImage: (...args) => draws.push(args) };
  const encoded = new Blob(['opaque fitted PNG'], { type: 'image/png' });
  const canvas = { getContext: () => context, toBlob(callback, type) {
    assert.equal(type, 'image/png'); abort?.(); callback(failEncoding ? null : encoded);
  } };
  const image = {};
  return { canvas, encoded, fills, draws, closed: () => closed,
    options: { decodeImage: async () => ({ image, width: dimensions[0], height: dimensions[1], close: () => closed++ }), createCanvas: () => canvas }, image };
}

test('preparation fills an opaque black frame, draws the whole image equally scaled, and returns the encoded PNG', async () => {
  const g = graphics(); const file = original();
  const prepared = await prepareVideoReferenceFrame(file, { aspectRatio: '16:9', ...g.options });
  assert.equal(prepared, g.encoded);
  assert.deepEqual(g.fills, [['#000000', 0, 0, 864, 480]]);
  assert.equal(g.draws.length, 1);
  const [image, x, y, width, height] = g.draws[0];
  assert.equal(image, g.image);
  near(width / 1080, height / 938); near(x * 2 + width, 864); near(y * 2 + height, 480);
  assert.equal(g.closed(), 1);
  assert.equal(g.canvas.width, 0); assert.equal(g.canvas.height, 0);
  assert.equal(file.name, 'original.jpg'); assert.equal(await file.text(), 'source');
});

test('encode failures and aborts release graphics and never fall back to the original', async () => {
  const failed = graphics({ failEncoding: true });
  await assert.rejects(prepareVideoReferenceFrame(original(), { aspectRatio: '9:16', ...failed.options }), /prepare.*reference image/i);
  assert.equal(failed.closed(), 1); assert.equal(failed.canvas.width, 0);
  const controller = new AbortController();
  const aborted = graphics({ abort: () => controller.abort() });
  await assert.rejects(prepareVideoReferenceFrame(original(), { aspectRatio: '16:9', signal: controller.signal, ...aborted.options }), error => error.name === 'AbortError');
  assert.equal(aborted.closed(), 1); assert.equal(aborted.canvas.width, 0);
  await assert.rejects(prepareVideoReferenceFrame(original(), { aspectRatio: '16:9', signal: controller.signal,
    decodeImage: () => assert.fail('already aborted must not decode') }), error => error.name === 'AbortError');
});

test('an abort during decoding closes the returned bitmap before creating or encoding a canvas', async () => {
  const controller = new AbortController(); let closed = 0;
  await assert.rejects(prepareVideoReferenceFrame(original(), { aspectRatio: '9:16', signal: controller.signal,
    decodeImage: async () => { controller.abort(); return { width: 938, height: 1080, image: {}, close: () => closed++ }; },
    createCanvas: () => assert.fail('an aborted decoder must not allocate the canvas'),
  }), error => error.name === 'AbortError');
  assert.equal(closed, 1);
});

test('the default bitmap decoder requests EXIF orientation and disposes the bitmap', async context => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap');
  context.after(() => previous ? Object.defineProperty(globalThis, 'createImageBitmap', previous) : delete globalThis.createImageBitmap);
  let closed = 0;
  Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, value: async (file, options) => {
    assert.equal(file.type, 'image/jpeg'); assert.deepEqual(options, { imageOrientation: 'from-image' });
    return { width: 938, height: 1080, close: () => closed++ };
  } });
  const g = graphics();
  await prepareVideoReferenceFrame(original(), { aspectRatio: '9:16', createCanvas: g.options.createCanvas });
  assert.equal(closed, 1);
  near(g.draws[0][3] / g.draws[0][4], 938 / 1080);
});

test('the Image decoder fallback revokes its object URL after success and decode failure', async context => {
  const descriptors = ['createImageBitmap', 'Image'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  const create = URL.createObjectURL; const revoke = URL.revokeObjectURL;
  context.after(() => {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
    }
    URL.createObjectURL = create; URL.revokeObjectURL = revoke;
  });
  let fail = false; const revoked = [];
  Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, value: undefined });
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: class {
    naturalWidth = 1080; naturalHeight = 938;
    set src(url) { assert.equal(url, 'blob:reference'); queueMicrotask(() => fail ? this.onerror(new Error('decode failed')) : this.onload()); }
  } });
  URL.createObjectURL = () => 'blob:reference'; URL.revokeObjectURL = url => revoked.push(url);
  const g = graphics();
  await prepareVideoReferenceFrame(original(), { createCanvas: g.options.createCanvas });
  assert.deepEqual(revoked, ['blob:reference']);
  fail = true;
  await assert.rejects(prepareVideoReferenceFrame(original(), { createCanvas: () => assert.fail('decode failed') }), /prepare.*reference image/i);
  assert.deepEqual(revoked, ['blob:reference', 'blob:reference']);
});
