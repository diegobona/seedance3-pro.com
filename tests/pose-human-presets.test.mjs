import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { Vector3 } from 'three';
import { normalizeMannequin } from '../app/pose-scene-state.mjs';
import { buildPreferredBoneIndex, captureBoneTransforms, applyBoneTransforms } from '../app/pose-rig-index.mjs';
import { prepareHumanPresetBindings, applyHumanPresetDirections } from '../app/pose-human-presets.mjs';
import { POSE_LIBRARY, presetPreview } from '../app/pose-library.mjs';

for (const file of ['anyposes-female-rig', 'anyposes-studio-02']) {
  test(`${file}: all presets match their authored limb directions on the real FBX rig`, () => {
    const bytes = readFileSync(new URL(`../app/pose-assets/${file}.fbx`, import.meta.url));
    const model = normalizeMannequin(new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), ''));
    const { byName, bones } = buildPreferredBoneIndex(model);
    const rest = captureBoneTransforms(bones);
    const bindings = prepareHumanPresetBindings(model, byName);
    for (const preset of POSE_LIBRARY) {
      applyBoneTransforms(bones, rest);
      model.updateMatrixWorld(true);
      applyHumanPresetDirections(model, bindings, preset);
      for (const { key, bone, child } of bindings) {
        const actual = child.getWorldPosition(new Vector3()).sub(bone.getWorldPosition(new Vector3())).normalize();
        const expected = new Vector3(...preset.directions[key]).normalize();
        assert.ok(actual.angleTo(expected) < 1e-5, `${preset.key}/${key}: direction error ${actual.angleTo(expected) * 180 / Math.PI} degrees`);
      }
      const position = name => byName.get('mixamorig' + name).getWorldPosition(new Vector3());
      for (const side of ['Left', 'Right']) {
        const key = side.toLowerCase();
        const handDirection = position(side + 'HandMiddle1').sub(position(side + 'Hand')).normalize();
        const expected = new Vector3(...(preset.hands?.[key]?.direction ?? preset.directions[key + 'ForeArm'])).normalize();
        assert.ok(handDirection.angleTo(expected) < 1e-5, `${preset.key}/${side}: wrist alignment`);
        if (preset.hands?.[key]?.grip === 'fist') {
          const first = position(side + 'HandMiddle2').sub(position(side + 'HandMiddle1')).normalize();
          const last = position(side + 'HandMiddle4').sub(position(side + 'HandMiddle3')).normalize();
          assert.ok(first.dot(last) < 0, `${preset.key}/${side}: fingers must curl back into palm`);
        }
        if (preset.key === 'boxing') {
          assert.ok(position(side + 'ForeArm').y < position(side + 'Arm').y - .6, 'guard elbows stay tucked below shoulders');
          assert.ok(Math.abs(position(side + 'Hand').x) < .7, 'guard wrists protect the face, not spread outward');
        }
      }
      assert.doesNotMatch(presetPreview(preset), /NaN|Infinity/);
    }
  });
}
