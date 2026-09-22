import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { captureSceneState, restoreSceneState, nextActorPosition, normalizeMannequin } from "../app/pose-scene-state.mjs";
import { readFileSync } from "node:fs";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { buildPreferredBoneIndex } from "../app/pose-rig-index.mjs";
import { RAGDOLL_HANDLE_SPECS } from "../app/pose-ragdoll-config.mjs";

function actor(id) {
  const model = new THREE.Group();
  const bone = new THREE.Bone();
  model.add(bone);
  return { id, model, bones: [bone] };
}

test("scene history restores every independent pose, placement and selection", () => {
  const first = actor("1");
  const second = actor("2");
  second.model.position.set(4, 0, 2);
  second.bones[0].rotation.x = 0.6;
  const records = new Map([[first.id, first], [second.id, second]]);
  const saved = captureSceneState([first, second], second.id);
  first.bones[0].rotation.z = 1;
  second.bones[0].rotation.x = 2;
  second.model.position.x = 9;
  second.model.visible = false;

  const restored = restoreSceneState(records, saved);
  assert.deepEqual(restored.actors, [first, second]);
  assert.equal(restored.selectedId, "2");
  assert.ok(Math.abs(first.bones[0].rotation.z) < 1e-10);
  assert.ok(Math.abs(second.bones[0].rotation.x - 0.6) < 1e-10);
  assert.deepEqual(second.model.position.toArray(), [4, 0, 2]);
  assert.equal(second.model.visible, true);
});

test("undoing an addition hides that actor and redo restores it without sharing bones", () => {
  const first = actor("1");
  const second = actor("2");
  const records = new Map([[first.id, first], [second.id, second]]);
  const before = captureSceneState([first], first.id);
  const after = captureSceneState([first, second], second.id);
  restoreSceneState(records, before);
  assert.equal(second.model.visible, false);
  restoreSceneState(records, after);
  first.bones[0].rotation.x = 0.7;
  assert.ok(Math.abs(second.bones[0].rotation.x) < 1e-10);
  assert.equal(second.model.visible, true);
});

test("new actors use vacant positions, including after another actor is moved", () => {
  const first = actor("1");
  const second = actor("2");
  assert.deepEqual(nextActorPosition([]), [0, 0, 0]);
  assert.deepEqual(nextActorPosition([first]), [4, 0, 0]);
  second.model.position.set(4, 0, 0);
  assert.deepEqual(nextActorPosition([first, second]), [-4, 0, 0]);
  first.model.position.x = -4;
  assert.deepEqual(nextActorPosition([first, second]), [0, 0, 0]);
});

test("both Anyposes assets have centered scene pivots and all 13 IK effectors", () => {
  for (const name of ["anyposes-female-rig.fbx", "anyposes-studio-02.fbx"]) {
    const bytes = readFileSync(new URL(`../app/pose-assets/${name}`, import.meta.url));
    const source = new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
    const model = normalizeMannequin(source);
    assert.deepEqual(model.position.toArray(), [0, 0, 0]);
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    assert.ok(Math.abs(center.x) < 1e-4);
    assert.ok(Math.abs(center.z) < 1e-4);
    assert.ok(Math.abs(bounds.min.y) < 1e-4);
    assert.ok(Math.abs(bounds.getSize(new THREE.Vector3()).y - 7.25) < 1e-4);
    const index = buildPreferredBoneIndex(model);
    for (const handle of RAGDOLL_HANDLE_SPECS) {
      assert.ok(index.byName.has(handle.effector.replace(/[^a-z0-9]/gi, "").toLowerCase()), `${name}: ${handle.key}`);
    }
    model.position.x = 4;
    model.rotateY(Math.PI);
    const turnedCenter = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
    assert.ok(Math.abs(turnedCenter.x - 4) < 1e-4, "turning must not orbit the asset's original origin");
  }
});
