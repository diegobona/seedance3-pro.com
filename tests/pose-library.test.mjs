import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Mesh, BoxGeometry, MeshStandardMaterial, Vector3 } from 'three';
import { POSE_LIBRARY, setActorColor, setActorMirrored } from '../app/pose-library.mjs';
import { captureSceneState, restoreSceneState } from '../app/pose-scene-state.mjs';

test('every preset has a complete set of finite nonzero bone directions', () => {
  assert.equal(new Set(POSE_LIBRARY.map(p => p.key)).size, POSE_LIBRARY.length);
  for (const preset of POSE_LIBRARY) {
    assert.equal(Object.keys(preset.directions).length, 9);
    for (const vector of Object.values(preset.directions)) {
      assert.equal(vector.length, 3);
      assert.ok(vector.every(Number.isFinite));
      assert.ok(Math.hypot(...vector) > 0);
    }
  }
});

test('mirror reflects local geometry and undo restores independent figure colors and orientation', () => {
  const model = new Group();
  const root = new Group();
  root.position.x = 2;
  const mesh = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
  mesh.position.x = 3;
  root.add(mesh); model.add(root);
  const actor = { id:'1', model, bones:[] };
  setActorColor(actor, '#d9d9d9');
  const saved = captureSceneState([actor], '1');
  setActorMirrored(actor, true);
  setActorColor(actor, '#e0a442');
  assert.equal(mesh.getWorldPosition(new Vector3()).x, -5);
  restoreSceneState(new Map([['1',actor]]), saved);
  assert.equal(mesh.getWorldPosition(new Vector3()).x, 5);
  assert.equal(mesh.material.color.getHexString(), 'd9d9d9');
  setActorMirrored(actor, true); setActorMirrored(actor, false);
  assert.equal(mesh.getWorldPosition(new Vector3()).x, 5);
});
