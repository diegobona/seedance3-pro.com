import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { ANIMAL_CATALOG, ANIMAL_HANDLE_SPECS, ANIMAL_PRESETS, createAnimal, applyAnimalPreset } from '../app/pose-animals.mjs';
import { normalizeMannequin, captureSceneState, restoreSceneState } from '../app/pose-scene-state.mjs';
import { buildPreferredBoneIndex, captureBoneTransforms, applyBoneTransforms } from '../app/pose-rig-index.mjs';
import { setActorMirrored } from '../app/pose-library.mjs';
import { encodeSharedScene, decodeSharedScene } from '../app/pose-share.mjs';

test('each animal has independent articulated limbs, head and tail and finite presets', () => {
  for (const [kind,spec] of Object.entries(ANIMAL_CATALOG)) {
    const model = normalizeMannequin(createAnimal(kind),spec.height);
    const {bones,byName} = buildPreferredBoneIndex(model);
    const neutral = captureBoneTransforms(bones);
    assert.ok(Math.abs(new Box3().setFromObject(model).min.y) < .0001);
    for(const handle of ANIMAL_HANDLE_SPECS) {
      assert.ok(byName.has(handle.effector));
      for(const joint of handle.chain) assert.ok(byName.has(joint));
    }
    const first = byName.get('FrontLeftPaw').getWorldPosition(new Vector3());
    byName.get('FrontLeftUpper').rotation.x = .6;
    model.updateMatrixWorld(true);
    assert.ok(first.distanceTo(byName.get('FrontLeftPaw').getWorldPosition(new Vector3())) > .2);
    for(const preset of ANIMAL_PRESETS) {
      applyBoneTransforms(bones,neutral);
      applyAnimalPreset(byName,preset.key);
      model.updateMatrixWorld(true);
      const size = new Box3().setFromObject(model).getSize(new Vector3());
      assert.ok(size.toArray().every(n => Number.isFinite(n) && n > 0 && n < 20));
    }
  }
});

test('an edited mirrored animal survives scene sharing and restore', async () => {
  const model = normalizeMannequin(createAnimal('dog'),ANIMAL_CATALOG.dog.height);
  const {bones,byName} = buildPreferredBoneIndex(model);
  const actor = {id:'1',kind:'animal',modelKey:'dog',model,bones,color:'#aabbcc'};
  applyAnimalPreset(byName,'animal-walk');
  setActorMirrored(actor,true);
  const saved = {...captureSceneState([actor],'1'),version:1,aspect:'auto',background:'0b0d0d',camera:{position:[0,4,15],target:[0,3,0]}};
  const decoded = await decodeSharedScene(await encodeSharedScene(saved));
  byName.get('FrontLeftUpper').rotation.x=1.2;
  setActorMirrored(actor,false);
  restoreSceneState(new Map([['1',actor]]),decoded);
  assert.ok(Math.abs(byName.get('FrontLeftUpper').rotation.x-.35)<.0001);
  assert.equal(actor.mirrored,true);
});
