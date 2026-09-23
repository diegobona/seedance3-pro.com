import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
const module = await import('../app/pose-model-cache.mjs').catch(() => ({}));

test('repeated additions parse once and have independent bones and materials', async () => {
  assert.equal(typeof module.createModelCache, 'function', 'parsed rig cache is available');
  let loads = 0;
  const cache = module.createModelCache(async () => {
    loads++;
    const bytes = readFileSync(new URL('../app/pose-assets/anyposes-studio-02.fbx',import.meta.url));
    return new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  });
  const [first,second] = await Promise.all([cache.get('male'),cache.get('male')]);
  assert.equal(loads,1);
  const meshes = [];
  for (const root of [first,second]) { const list=[]; root.traverse(p => {if(p.isSkinnedMesh)list.push(p);}); meshes.push(list); }
  assert.ok(meshes[0].length);
  const [a,b] = [meshes[0][0],meshes[1][0]];
  assert.notEqual(a.skeleton.bones[0],b.skeleton.bones[0]);
  assert.notEqual(a.material,b.material);
  assert.notEqual(a.geometry,b.geometry);
  a.skeleton.bones[0].position.x += 3;
  assert.notEqual(a.skeleton.bones[0].position.x,b.skeleton.bones[0].position.x);
  await cache.get('male');
  assert.equal(loads,1);
  cache.dispose();
});

test('a failed model load can be retried', async () => {
  assert.equal(typeof module.createModelCache,'function');
  let calls=0;
  const cache=module.createModelCache(async () => { calls++; throw new Error('network'); });
  await assert.rejects(cache.get('male'));
  await assert.rejects(cache.get('male'));
  assert.equal(calls,2);
  cache.dispose();
});
