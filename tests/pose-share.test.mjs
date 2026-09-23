import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { PROP_CATALOG, createProp } from '../app/pose-props.mjs';
import { captureSceneState, restoreSceneState } from '../app/pose-scene-state.mjs';
import { encodeSharedScene, decodeSharedScene } from '../app/pose-share.mjs';
import { readFileSync } from 'node:fs';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { normalizeMannequin } from '../app/pose-scene-state.mjs';
import { buildPreferredBoneIndex } from '../app/pose-rig-index.mjs';
import { setActorMirrored } from '../app/pose-library.mjs';

function scene() {
  const model = createProp('chair');
  model.position.set(3,0,-2);
  model.rotateY(.7);
  const actor = { id:'1',kind:'prop',modelKey:'chair',model,bones:[],color:'#8997a8' };
  return { actor, saved: { ...captureSceneState([actor],'1'),version:1,background:'0b0d0d',aspect:'1 / 1',camera:{position:[0,4,18],target:[0,3,0]} } };
}

test('all props have finite dimensions and rest on the ground', () => {
  for (const kind of Object.keys(PROP_CATALOG)) {
    const box = new Box3().setFromObject(createProp(kind));
    assert.ok(Math.abs(box.min.y) < .00001,kind);
    assert.ok(box.getSize(new Vector3()).toArray().every(n => Number.isFinite(n) && n > 0),kind);
  }
});

test('editable link roundtrips objects, camera and frame and restores transforms', async () => {
  const {actor,saved} = scene();
  const restored = await decodeSharedScene(await encodeSharedScene(saved));
  assert.deepEqual(restored.camera,saved.camera);
  assert.equal(restored.aspect,'1 / 1');
  actor.model.position.set(0,0,0);
  restoreSceneState(new Map([['1',actor]]),restored);
  assert.deepEqual(actor.model.position.toArray(),[3,0,-2]);
  assert.ok(Math.abs(actor.model.rotation.y - .7) < .0001);
  assert.equal(restored.actors[0].modelKey,'chair');
});

test('shared links reject unsupported models, invalid transforms and damaged data', async () => {
  const {saved} = scene();
  saved.actors[0].modelKey = 'https://example.com/model';
  await assert.rejects(encodeSharedScene(saved));
  saved.actors[0].modelKey = 'chair';
  saved.actors[0].position[0] = Infinity;
  await assert.rejects(encodeSharedScene(saved));
  await assert.rejects(decodeSharedScene('broken'));
  await assert.rejects(decodeSharedScene('x'.repeat(80001)));
});

test('both actual mannequin rigs roundtrip with a mirrored edited joint and prop', async () => {
  for (const [modelKey,file] of [['studio-01','anyposes-female-rig.fbx'],['studio-02','anyposes-studio-02.fbx']]) {
    const bytes = readFileSync(new URL(`../app/pose-assets/${file}`, import.meta.url));
    const model = normalizeMannequin(new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''));
    const bones = buildPreferredBoneIndex(model).bones;
    const figure = {id:'2',modelKey,model,bones,color:'#ddccaa'};
    bones[3].rotation.x += .3;
    setActorMirrored(figure,true);
    const {actor,saved} = scene();
    Object.assign(saved,captureSceneState([figure,actor],'2'));
    const restored = await decodeSharedScene(await encodeSharedScene(saved));
    bones[3].rotation.x += 1;
    setActorMirrored(figure,false);
    restoreSceneState(new Map([['1',actor],['2',figure]]),restored);
    assert.equal(figure.mirrored,true);
    assert.ok(Math.abs(bones[3].quaternion.x - saved.actors[0].bones[3].quaternion[0]) < .00001);
  }
});
