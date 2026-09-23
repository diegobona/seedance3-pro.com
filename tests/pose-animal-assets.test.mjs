import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createAnimal } from '../app/pose-animals.mjs';
import { buildPreferredBoneIndex, captureBoneTransforms, applyBoneTransforms } from '../app/pose-rig-index.mjs';
import { createModelCache } from '../app/pose-model-cache.mjs';

const KINDS = ['cat', 'dog', 'horse'];
// Shared scenes omit names and restore by index. This order is the published v1 rig.
const LEGACY_BONE_ORDER = [
  'AnimalRoot', 'AnimalNeck', 'AnimalHead',
  'FrontLeftUpper', 'FrontLeftLower', 'FrontLeftPaw',
  'FrontRightUpper', 'FrontRightLower', 'FrontRightPaw',
  'HindLeftUpper', 'HindLeftLower', 'HindLeftPaw',
  'HindRightUpper', 'HindRightLower', 'HindRightPaw',
  'TailBase', 'TailMid', 'TailTip',
];

async function loadAnimal(kind) {
  const bytes = await readFile(new URL(`../app/pose-assets/animals/${kind}.glb`, import.meta.url));
  const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  scene.updateMatrixWorld(true);
  return scene;
}

function skinFor(model) {
  const skins = [];
  model.traverse(part => { if (part.isSkinnedMesh) skins.push(part); });
  const body = skins.find(mesh => mesh.name.includes('anatomical'));
  assert.ok(body, 'the continuous body uses one articulated skin');
  return body;
}

function weightedVertex(mesh, boneName, preferStrongest = false) {
  const boneIndex = mesh.skeleton.bones.findIndex(bone => bone.name === boneName);
  const { skinIndex, skinWeight, position } = mesh.geometry.attributes;
  let selected = -1;
  let chosenDistance = preferStrongest ? Infinity : -1;
  let chosenWeight = -1;
  const joint = mesh.skeleton.bones[boneIndex].getWorldPosition(new Vector3());
  const point = new Vector3();
  for (let index = 0; index < position.count; index += 1) {
    let weight = 0;
    for (let slot = 0; slot < 4; slot += 1) {
      if (skinIndex.getComponent(index, slot) === boneIndex) weight += skinWeight.getComponent(index, slot);
    }
    if (weight < .9) continue;
    mesh.getVertexPosition(index, point).applyMatrix4(mesh.matrixWorld);
    const distance = point.distanceToSquared(joint);
    const better = preferStrongest
      ? weight > chosenWeight || (weight === chosenWeight && distance < chosenDistance)
      : distance > chosenDistance;
    if (better) { chosenDistance = distance; chosenWeight = weight; selected = index; }
  }
  assert.notEqual(selected, -1, `skin has vertices following ${boneName}`);
  if (preferStrongest) assert.ok(chosenWeight > .99999, 'central torso is anchored to the body bone');
  return selected;
}

test('published animal assets preserve legacy bone indices and hierarchy with valid rest transforms', async () => {
  for (const kind of KINDS) {
    const model = await loadAnimal(kind);
    const actual = buildPreferredBoneIndex(model).bones;
    const legacy = buildPreferredBoneIndex(createAnimal(kind)).bones;
    assert.deepEqual(actual.map(bone => bone.name), LEGACY_BONE_ORDER, kind);
    assert.deepEqual(actual.map(bone => bone.parent.isBone ? bone.parent.name : null), legacy.map(bone => bone.parent.isBone ? bone.parent.name : null), `${kind} preserves joint hierarchy`);
    for (const bone of actual) {
      assert.ok(bone.position.toArray().every(Number.isFinite), `${kind}: finite rest position`);
      assert.deepEqual(bone.quaternion.toArray(), [0, 0, 0, 1], `${kind}: rest rotations remain compatible`);
      assert.deepEqual(bone.scale.toArray(), [1, 1, 1], `${kind}: rest scales remain compatible`);
    }
  }
});

test('real animal skin binds without distortion and follows head and limb edits', async () => {
  for (const kind of KINDS) {
    const model = await loadAnimal(kind);
    const mesh = skinFor(model);
    const { bones, byName } = buildPreferredBoneIndex(model);
    const neutral = captureBoneTransforms(bones);
    const { position, skinIndex, skinWeight } = mesh.geometry.attributes;
    const original = new Vector3();
    const bound = new Vector3();
    for (let index = 0; index < position.count; index += 1) {
      let sum = 0;
      for (let slot = 0; slot < 4; slot += 1) {
        const joint = skinIndex.getComponent(index, slot);
        const weight = skinWeight.getComponent(index, slot);
        assert.ok(Number.isInteger(joint) && joint >= 0 && joint < bones.length, `${kind}: valid joint index`);
        assert.ok(Number.isFinite(weight) && weight >= 0, `${kind}: finite skin weight`);
        sum += weight;
      }
      assert.ok(Math.abs(sum - 1) < .00001, `${kind}: normalized skin weights`);
      original.fromBufferAttribute(position, index);
      mesh.getVertexPosition(index, bound);
      assert.ok(original.distanceTo(bound) < .00001, `${kind}: bind pose preserves the sculpted surface`);
    }
    // A shoulder can legitimately mix torso and neck weights. Check the most
    // body-anchored central vertex, while distant limb vertices must still move.
    const bodyVertex = weightedVertex(mesh, 'AnimalRoot', true);
    const bodyBefore = mesh.getVertexPosition(bodyVertex, new Vector3());
    for (const [jointName, weightedBone, axis] of [
      ['AnimalNeck', 'AnimalHead', 'y'],
      ['FrontLeftUpper', 'FrontLeftLower', 'x'],
    ]) {
      const index = weightedVertex(mesh, weightedBone);
      const before = mesh.getVertexPosition(index, new Vector3());
      byName.get(jointName).rotation[axis] = .55;
      model.updateMatrixWorld(true);
      assert.ok(before.distanceTo(mesh.getVertexPosition(index, new Vector3())) > .08, `${kind}: ${jointName} moves the actual skin`);
      assert.ok(bodyBefore.distanceTo(mesh.getVertexPosition(bodyVertex, new Vector3())) < .00001, `${kind}: an isolated joint leaves the torso in place`);
      applyBoneTransforms(bones, neutral);
      model.updateMatrixWorld(true);
      assert.ok(before.distanceTo(mesh.getVertexPosition(index, new Vector3())) < .00001, `${kind}: pose restore returns the skin to its starting position`);
    }
  }
});

test('cached animal additions own independent skeletons, materials and geometry', async () => {
  const loads = new Map();
  const cache = createModelCache(async kind => {
    loads.set(kind, (loads.get(kind) ?? 0) + 1);
    return loadAnimal(kind);
  });
  try {
    for (const kind of KINDS) {
      const [first, second] = await Promise.all([cache.get(kind), cache.get(kind)]);
      const a = skinFor(first);
      const b = skinFor(second);
      assert.equal(loads.get(kind), 1);
      assert.notEqual(a.geometry, b.geometry);
      assert.notEqual(a.material, b.material);
      a.skeleton.bones.forEach((bone, index) => assert.notEqual(bone, b.skeleton.bones[index]));
      const { byName } = buildPreferredBoneIndex(first);
      const otherNeck = buildPreferredBoneIndex(second).byName.get('AnimalNeck');
      first.updateMatrixWorld(true);
      second.updateMatrixWorld(true);
      const vertex = weightedVertex(b, 'AnimalHead');
      const before = b.getVertexPosition(vertex, new Vector3());
      byName.get('AnimalNeck').rotation.y = .7;
      a.material.color.set('#ff0000');
      first.updateMatrixWorld(true);
      second.updateMatrixWorld(true);
      assert.equal(otherNeck.rotation.y, 0);
      assert.ok(before.distanceTo(b.getVertexPosition(vertex, new Vector3())) < .00001, `${kind}: posing one copy leaves the other skin unchanged`);
      assert.notEqual(a.material.color.getHex(), b.material.color.getHex());
    }
  } finally { cache.dispose(); }
});
