import test from "node:test";
import assert from "node:assert/strict";
import { RAGDOLL_HANDLE_SPECS } from "../app/pose-ragdoll-config.mjs";
import {
  applyBoneTransforms,
  buildPreferredBoneIndex,
  captureBoneTransforms,
} from "../app/pose-rig-index.mjs";
import { ANYPOSES_PRESETS, ANYPOSES_REFERENCE_DIRECTIONS } from "../app/pose-presets.mjs";

test("ragdoll mode follows Anyposes' complete 13-handle control surface", () => {
  assert.deepEqual(
    RAGDOLL_HANDLE_SPECS.map((handle) => handle.key),
    [
      "head",
      "torso",
      "pelvis",
      "leftShoulder",
      "rightShoulder",
      "leftElbow",
      "rightElbow",
      "leftHand",
      "rightHand",
      "leftKnee",
      "rightKnee",
      "leftFoot",
      "rightFoot",
    ]
  );
});

test("each draggable point declares an FBX effector and a joint chain", () => {
  for (const handle of RAGDOLL_HANDLE_SPECS) {
    assert.match(handle.effector, /^mixamorig:/);
    assert.ok(Array.isArray(handle.chain));
    if (handle.key !== "pelvis") assert.ok(handle.chain.length > 0);
  }

  const leftHand = RAGDOLL_HANDLE_SPECS.find((handle) => handle.key === "leftHand");
  assert.deepEqual(leftHand.chain, [
    "mixamorig:LeftForeArm",
    "mixamorig:LeftArm",
  ]);
});

test("the real control bone wins over later zero-length skin helper bones", () => {
  const controlBone = {
    isBone: true,
    name: "mixamorigLeftForeArm",
    position: { lengthSq: () => 124 },
  };
  const skinHelperBone = {
    isBone: true,
    name: "mixamorigLeftForeArm",
    position: { lengthSq: () => 0 },
  };
  const root = {
    traverse(visitor) {
      visitor(controlBone);
      visitor(skinHelperBone);
    },
  };

  const { byName, bones } = buildPreferredBoneIndex(root);

  assert.equal(byName.get("mixamorigLeftForeArm"), controlBone);
  assert.equal(byName.get("mixamorigleftforearm"), controlBone);
  assert.deepEqual(bones, [controlBone, skinHelperBone]);
});

test("pose snapshots restore duplicate-name bones by index instead of overwriting the control bone", () => {
  const transform = (value) => ({
    value,
    toArray() { return [this.value]; },
    fromArray([next]) { this.value = next; },
  });
  const controlBone = { name: "mixamorigLeftLeg", position: transform(257), quaternion: transform(1), scale: transform(1) };
  const skinHelperBone = { name: "mixamorigLeftLeg", position: transform(0), quaternion: transform(2), scale: transform(1) };
  const bones = [controlBone, skinHelperBone];
  const snapshot = captureBoneTransforms(bones);

  controlBone.position.value = 999;
  skinHelperBone.position.value = 999;
  applyBoneTransforms(bones, snapshot);

  assert.equal(controlBone.position.value, 257);
  assert.equal(skinHelperBone.position.value, 0);
});

test("quick presets use recognizable poses from the Anyposes preset catalog", () => {
  assert.deepEqual(
    ANYPOSES_PRESETS.map(({ key, label, sourceCode }) => ({ key, label, sourceCode })),
    [
      { key: "crossed-arms", label: "Crossed arms", sourceCode: 5 },
      { key: "kneeling", label: "Kneeling", sourceCode: 6 },
      { key: "jogging", label: "Jogging", sourceCode: 10 },
    ]
  );

  for (const preset of ANYPOSES_PRESETS) {
    for (const boneKey of Object.keys(ANYPOSES_REFERENCE_DIRECTIONS)) {
      const direction = preset.directions[boneKey];
      assert.equal(direction.length, 3);
      const length = Math.hypot(...direction);
      assert.ok(Math.abs(length - 1) < 0.00001, `${preset.key}.${boneKey} must be normalized`);
    }
  }
});
