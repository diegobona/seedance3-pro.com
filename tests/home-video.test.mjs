import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { saveVideoHandoff, readVideoHandoff } from '../app/studio-handoff.mjs';

test('homepage handoff keeps the original reference, draft settings and accepted task without submitting anything', async () => {
  const values = new Map(), files = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const options = { storage, putFile: async (key, file) => files.set(key, file), getFile: async key => files.get(key), deleteFile: async key => files.delete(key) };
  const file = new File(['original reference'], 'near-square.jpg', { type: 'image/jpeg' });
  const taskId = '11111111-1111-4111-8111-111111111111';
  await saveVideoHandoff({ prompt: 'Keep this prompt', duration: 10, aspectRatio: '9:16', mode: 'reference', file, taskId }, options);
  const metadata = [...values.values()][0];
  assert.ok(!metadata.includes('original reference'), 'image bytes never go into URLs or session metadata');
  const restored = await readVideoHandoff(options);
  assert.equal(restored.prompt, 'Keep this prompt'); assert.equal(restored.duration, 10);
  assert.equal(restored.aspectRatio, '9:16'); assert.equal(restored.taskId, taskId);
  assert.equal(await restored.file.text(), 'original reference');
  assert.equal(values.size, 0); assert.equal(files.size, 0);
});

test('replacing a draft releases its old reference and malformed task identifiers are discarded', async () => {
  const values = new Map(), files = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const options = { storage, putFile: async (key, file) => files.set(key, file), getFile: async key => files.get(key), deleteFile: async key => files.delete(key) };
  await saveVideoHandoff({ file: new File(['one'], 'one.png', { type: 'image/png' }), taskId: 'provider-id' }, options);
  await saveVideoHandoff({ prompt: 'new', aspectRatio: '16:9' }, options);
  assert.equal(files.size, 0);
  assert.equal((await readVideoHandoff(options)).taskId, '');
});

test('both homepages retain one keyword H1 and structured SEO while showing the generator before examples and Pose', async () => {
  for (const file of ['index.html', 'zh/index.html']) {
    const html = await readFile(file, 'utf8');
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /<h1 class="display">SEEDANCE 3\.0/);
    assert.match(html, /<link rel="canonical"/); assert.match(html, /application\/ld\+json/);
    assert.match(html, />AI Video<\/a>/); assert.match(html, />AI Image<\/a>/);
    assert.match(html, /app\/image\/gpt-image-2-5-1k/);
    assert.ok(html.indexOf('id="create"') < html.indexOf('id="showcase"'));
    assert.ok(html.indexOf('id="showcase"') < html.indexOf('id="pose-control"'));
    assert.doesNotMatch(html, /christmas-feature|\$0\.01\/sec/);
    assert.match(html, /<h2[^>]*>Get Inspired|<h2[^>]*>创作灵感/);
  }
});
