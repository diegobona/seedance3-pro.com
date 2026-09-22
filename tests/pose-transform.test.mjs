import test from "node:test";
import assert from "node:assert/strict";
import { Group, Object3D, Vector3 } from "three";
import { captureTransformBasis, applyPivotTransform } from "../app/pose-transform.mjs";
import { captureSceneState, restoreSceneState } from "../app/pose-scene-state.mjs";

function setup() {
  const scene = new Group();
  const model = new Group();
  const other = new Group();
  const pivot = new Object3D();
  pivot.position.set(0, 3, 0);
  scene.add(model, other, pivot);
  return { model, other, pivot, basis: captureTransformBasis(model, pivot) };
}

test("moving a gizmo moves only its selected mannequin", () => {
  const { model, other, pivot, basis } = setup();
  pivot.position.add(new Vector3(2, 1, -3));
  applyPivotTransform(model, pivot, basis, "translate");
  assert.deepEqual(model.position.toArray(), [2, 1, -3]);
  assert.deepEqual(other.position.toArray(), [0, 0, 0]);
});

test("rotation uses the body pivot and leaves bones in their original pose", () => {
  const { model, pivot, basis } = setup();
  pivot.rotation.z = Math.PI / 2;
  applyPivotTransform(model, pivot, basis, "rotate");
  assert.ok(model.position.distanceTo(new Vector3(3, 3, 0)) < 1e-10);
  assert.ok(new Vector3(0, 3, 0).applyMatrix4(model.matrixWorld).distanceTo(new Vector3(0, 3, 0)) < 1e-10);
});

test("axis scaling keeps body proportions and the pivot stationary", () => {
  const { model, pivot, basis } = setup();
  pivot.scale.y = 2;
  applyPivotTransform(model, pivot, basis, "scale", "Y");
  assert.deepEqual(model.scale.toArray(), [2, 2, 2]);
  assert.deepEqual(model.position.toArray(), [0, -3, 0]);
  assert.ok(new Vector3(0, 3, 0).applyMatrix4(model.matrixWorld).distanceTo(new Vector3(0, 3, 0)) < 1e-10);
});

test("scaling cannot invert or collapse a mannequin and undo restores size", () => {
  const { model, pivot, basis } = setup();
  const actor = { id: "1", model, bones: [] };
  const before = captureSceneState([actor], actor.id);
  pivot.scale.x = -2;
  applyPivotTransform(model, pivot, basis, "scale", "X");
  model.scale.toArray().forEach((value) => assert.ok(Math.abs(value - 0.2) < 1e-10));
  restoreSceneState(new Map([[actor.id, actor]]), before);
  assert.deepEqual(model.scale.toArray(), [1, 1, 1]);
  assert.deepEqual(model.position.toArray(), [0, 0, 0]);
});
