import test from 'node:test';
import assert from 'node:assert/strict';
import { Bone, Group } from 'three';
import { createAnimal } from '../app/pose-animals.mjs';
import { legacyAnimalRestPositions } from '../app/pose-animal-rig.mjs';
import { buildPreferredBoneIndex, captureBoneTransforms } from '../app/pose-rig-index.mjs';
import { captureSceneState, restoreSceneState } from '../app/pose-scene-state.mjs';
import { encodeSharedScene, decodeSharedScene, validateSharedScene } from '../app/pose-share.mjs';

function makeActor(kind, rigVersion) {
  const model = new Group();
  const root = new Group();
  model.add(root);
  const bones = legacyAnimalRestPositions(kind).map(position => {
    const bone = new Bone();
    bone.position.fromArray(position);
    return bone;
  });
  const parentIndices = [-1, 0, 1, 0, 3, 4, 0, 6, 7, 0, 9, 10, 0, 12, 13, 0, 15, 16];
  bones.forEach((bone, index) => (parentIndices[index] < 0 ? root : bones[parentIndices[index]]).add(bone));
  if (rigVersion === 2) {
    // The authored anatomy has different joint locations but the same axes/order.
    bones[0].position.y += .6;
    bones[1].position.z += .12;
    bones[3].position.y -= .18;
    bones[4].position.z += .26;
  }
  return { id: '1', kind: 'animal', modelKey: kind, rigVersion, model, bones, color: '#aabbcc', neutral: { bones: captureBoneTransforms(bones) } };
}

function snapshot(actor) {
  return { ...captureSceneState([actor], actor.id), version: 1, aspect: 'auto', background: '0b0d0d', camera: { position: [0, 4, 15], target: [0, 3, 0] } };
}

function closeVector(actual, expected, label) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < .00002, label));
}

test('compact legacy rig metadata matches the published procedural skeleton', () => {
  for (const kind of ['cat', 'dog', 'horse']) {
    const { bones } = buildPreferredBoneIndex(createAnimal(kind));
    assert.deepEqual(legacyAnimalRestPositions(kind), bones.map(bone => bone.position.toArray()), kind);
  }
});

test('v1 animal links keep anatomical rest positions while preserving pose and placement edits', async () => {
  for (const kind of ['cat', 'dog', 'horse']) for (const version of [undefined, 1]) {
    const legacy = makeActor(kind, version);
    legacy.bones[0].position.add({ x: .25, y: -.17, z: .4 });
    legacy.bones[3].rotation.x = .6;
    legacy.bones[2].rotation.y = -.3;
    legacy.bones[4].scale.y = 1.15;
    legacy.model.position.set(4, .2, -2);
    legacy.model.scale.setScalar(1.2);
    const link = await decodeSharedScene(await encodeSharedScene(snapshot(legacy)));
    const current = makeActor(kind, 2);
    const neutral = current.neutral.bones;
    const oldRest = legacyAnimalRestPositions(kind);
    const records = new Map([[current.id, current]]);
    for (let restore = 0; restore < 2; restore += 1) {
      restoreSceneState(records, link);
      link.actors[0].bones.forEach(saved => {
        const actual = current.bones[saved.index];
        closeVector(actual.position.toArray(), neutral[saved.index].position.map((value, axis) => value + saved.position[axis] - oldRest[saved.index][axis]), `${kind}: translated rest position`);
        closeVector(actual.quaternion.toArray(), saved.quaternion, `${kind}: preserved rotation`);
        closeVector(actual.scale.toArray(), saved.scale, `${kind}: preserved scale`);
      });
      closeVector(current.model.position.toArray(), [4, .2, -2], `${kind}: preserved scene placement`);
      closeVector(current.model.scale.toArray(), [1.2, 1.2, 1.2], `${kind}: preserved scene scale`);
      current.bones[1].position.z += 3;
    }
    assert.equal(captureSceneState([current], current.id).actors[0].rigVersion, 2, 'subsequent history and links use the current rig version');
  }
});

test('v2 snapshots restore exact local transforms without repeating migration', async () => {
  const actor = makeActor('cat', 2);
  actor.bones[0].position.x = .35;
  actor.bones[1].position.z += .21;
  actor.bones[3].rotation.x = .7;
  const saved = snapshot(actor);
  assert.equal(saved.actors[0].rigVersion, 2);
  const link = await decodeSharedScene(await encodeSharedScene(saved));
  actor.bones[0].position.x = 8;
  actor.bones[1].position.z = 6;
  actor.bones[3].rotation.x = -.5;
  restoreSceneState(new Map([[actor.id, actor]]), link);
  const result = captureSceneState([actor], actor.id).actors[0];
  result.bones.forEach((bone, index) => {
    closeVector(bone.position, saved.actors[0].bones[index].position, 'v2 position');
    closeVector(bone.quaternion, saved.actors[0].bones[index].quaternion, 'v2 quaternion');
  });
  for (const invalid of [0, 3, '2', null]) {
    link.actors[0].rigVersion = invalid;
    assert.throws(() => validateSharedScene(link), /Invalid animal rig/);
  }
});
