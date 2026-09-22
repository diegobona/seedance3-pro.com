import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const modulePath = resolve("app", "pose-result-actions.mjs");

function fakeButton() {
  const button = new EventTarget();
  button.disabled = false;
  button.textContent = "";
  button.click = () => button.dispatchEvent(new Event("click"));
  return button;
}

test("pose-guided result actions expose edit and repeat-generation callbacks", async () => {
  assert.ok(existsSync(modulePath), "expected app/pose-result-actions.mjs");
  const { createPoseResultActionsController } = await import("../app/pose-result-actions.mjs");
  const container = { hidden: true };
  const editButton = fakeButton();
  const generateAgainButton = fakeButton();
  let edits = 0;
  let repeats = 0;

  const controller = createPoseResultActionsController({
    container,
    editButton,
    generateAgainButton,
    onEditPose() { edits += 1; },
    onGenerateAgain() { repeats += 1; },
  });

  controller.setVisible(true);
  controller.setGenerateState({ disabled: false, cost: 10 });
  editButton.click();
  generateAgainButton.click();

  assert.equal(container.hidden, false);
  assert.equal(generateAgainButton.disabled, false);
  assert.equal(generateAgainButton.textContent, "Generate again · 10 credits");
  assert.equal(edits, 1);
  assert.equal(repeats, 1);

  controller.destroy();
  editButton.click();
  generateAgainButton.click();
  assert.equal(edits, 1);
  assert.equal(repeats, 1);
});
