import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Quaternion, Vector3 } from 'three';
import { getAnimalPresets, applyAnimalPreset, animalPresetPreview } from '../app/pose-animals.mjs';
import { buildPreferredBoneIndex, captureBoneTransforms, applyBoneTransforms } from '../app/pose-rig-index.mjs';

for (const kind of ['cat', 'dog', 'horse']) test(`${kind}: species presets and thumbnails use the real posed rig`, async () => {
  const bytes = await readFile(new URL(`../app/pose-assets/animals/${kind}.glb`, import.meta.url));
  const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const { bones, byName } = buildPreferredBoneIndex(scene);
  const rest = captureBoneTransforms(bones);
  scene.updateMatrixWorld(true);
  const standingHeight = new Box3().setFromObject(scene).getSize(new Vector3()).y;
  const presets = getAnimalPresets(kind);
  assert.ok(presets.length >= (kind === 'horse' ? 10 : 12));
  assert.equal(new Set(presets.map(p => p.key)).size, presets.length);
  assert.equal(presets.some(p => p.key === 'animal-sit'), kind !== 'horse');
  const previews = [];
  for (const preset of presets) {
    applyBoneTransforms(bones, rest);
    applyAnimalPreset(byName, preset.key, kind);
    scene.updateMatrixWorld(true);
    for (const bone of bones) assert.ok(bone.getWorldPosition(new Vector3()).toArray().every(Number.isFinite));
    const point = name => byName.get(name).getWorldPosition(new Vector3());
    if (preset.key === 'animal-lie') {
      scene.traverse(part => { if (part.isSkinnedMesh) part.computeBoundingBox(); });
      const height = new Box3().setFromObject(scene).getSize(new Vector3()).y;
      assert.ok(height < standingHeight * .85, 'lying down must lower the actual mesh, not leave it standing');
    }
    if (preset.key === 'animal-paw') assert.ok(point('FrontLeftPaw').y > point('FrontRightPaw').y + .1);
    if (preset.key === 'animal-sit') assert.ok(point('HindLeftUpper').y < point('FrontLeftUpper').y, 'sitting lowers the haunches');
    if (preset.key === 'animal-graze') {
      assert.ok(point('AnimalHead').y < point('FrontLeftUpper').y);
      const muzzle = new Vector3(0,-.6,.8).applyQuaternion(byName.get('AnimalHead').getWorldQuaternion(new Quaternion()));
      assert.ok(muzzle.y < -.8 && muzzle.z > -.2, 'grazing muzzle points down, not back into the chest');
    }
    const before = captureBoneTransforms(bones);
    const svg = animalPresetPreview(preset, kind, { bones, neutral: { bones: rest } });
    assert.deepEqual(captureBoneTransforms(bones), before, 'rendering thumbnails must not change the scene');
    assert.match(svg, /<svg/);
    assert.doesNotMatch(svg, /NaN|Infinity|undefined/);
    previews.push(svg);
  }
  assert.equal(new Set(previews).size, presets.length, 'every action needs its own thumbnail');
});
