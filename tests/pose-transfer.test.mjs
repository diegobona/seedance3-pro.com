import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const modulePath = resolve("app", "pose-transfer.mjs");

test("pose capture creates a PNG reference file while capture artifacts are hidden", async () => {
  assert.ok(existsSync(modulePath), "expected app/pose-transfer.mjs");
  const { capturePoseReference } = await import("../app/pose-transfer.mjs");
  const steps = [];
  class FakeFile extends Blob {
    constructor(parts, name, options) {
      super(parts, options);
      this.name = name;
    }
  }
  const canvas = {
    toBlob(callback, type) {
      steps.push(`capture:${type}`);
      callback(new Blob(["pose"], { type }));
    },
  };

  const file = await capturePoseReference({
    canvas,
    FileCtor: FakeFile,
    beforeCapture() { steps.push("hide"); },
    afterCapture() { steps.push("restore"); },
  });

  assert.deepEqual(steps, ["hide", "capture:image/png", "restore"]);
  assert.equal(file.name, "seedance-pose-reference.png");
  assert.equal(file.type, "image/png");
  assert.equal(await file.text(), "pose");
});

test("pose capture restores the editor when the canvas cannot create an image", async () => {
  assert.ok(existsSync(modulePath), "expected app/pose-transfer.mjs");
  const { capturePoseReference } = await import("../app/pose-transfer.mjs");
  let restored = false;

  await assert.rejects(
    capturePoseReference({
      canvas: { toBlob(callback) { callback(null); } },
      FileCtor: class {},
      afterCapture() { restored = true; },
    }),
    /could not be captured/i
  );
  assert.equal(restored, true);
});

test("pose reference prompt preserves the user's description and adds pose-only guidance once", async () => {
  assert.ok(existsSync(modulePath), "expected app/pose-transfer.mjs");
  const { buildPoseReferencePrompt, POSE_REFERENCE_PROMPT_PREFIX } = await import("../app/pose-transfer.mjs");

  const prompt = buildPoseReferencePrompt("A red-haired astronaut in a lunar garden");
  assert.match(prompt, /only as a body-pose and camera-angle reference/i);
  assert.match(prompt, /red-haired astronaut in a lunar garden/i);
  assert.equal(prompt.split(POSE_REFERENCE_PROMPT_PREFIX).length - 1, 1);
  assert.equal(buildPoseReferencePrompt(prompt), prompt);
  assert.match(buildPoseReferencePrompt(""), /Describe the character, clothing, scene, lighting, and style/i);
});
