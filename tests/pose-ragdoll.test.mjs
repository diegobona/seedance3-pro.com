import test from "node:test";
import assert from "node:assert/strict";
import { RAGDOLL_HANDLE_SPECS } from "../app/pose-ragdoll-config.mjs";
import { buildPreferredBoneIndex } from "../app/pose-rig-index.mjs";

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
