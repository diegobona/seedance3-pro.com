import assert from "node:assert/strict";
import test from "node:test";
import { createLaunchWaitlistController } from "../app/launch-waitlist.mjs";

function waitlistElements() {
  const button = new EventTarget();
  button.textContent = "";
  button.disabled = false;
  return {
    container: { hidden: true, dataset: {} },
    button,
    statusElement: { textContent: "", className: "launch-waitlist-status" }
  };
}

test("the exhausted-trial waitlist loads status and joins with one click", async () => {
  const elements = waitlistElements();
  const calls = [];
  const controller = createLaunchWaitlistController({
    ...elements,
    eventTarget: new EventTarget(),
    fetchImpl: async (url, init = {}) => {
      calls.push({ url, init });
      if ((init.method || "GET") === "POST") {
        return Response.json({ success: true, waitlist: { joined: true, bonusCredits: 5 } });
      }
      return Response.json({ success: true, waitlist: { joined: false, bonusCredits: 5 } });
    }
  });

  await controller.setVisible(true);
  assert.equal(elements.container.hidden, false);
  assert.equal(calls[0].url, "/api/launch-waitlist");
  assert.equal(calls[0].init.credentials, "same-origin");
  assert.equal(elements.button.textContent, "Notify me & claim 5 credits");
  assert.equal(elements.button.disabled, false);

  await controller.join();
  assert.equal(calls[1].init.method, "POST");
  assert.equal(elements.button.textContent, "You're on the launch list");
  assert.equal(elements.button.disabled, true);
  assert.match(elements.statusElement.textContent, /email you when paid plans open/i);

  await controller.setVisible(false);
  assert.equal(elements.container.hidden, true);
  controller.destroy();
});

test("an expired session reopens authentication instead of losing enrollment intent", async () => {
  const elements = waitlistElements();
  const eventTarget = new EventTarget();
  let authRequests = 0;
  eventTarget.addEventListener("seedance:auth-required", () => {
    authRequests += 1;
  });
  const controller = createLaunchWaitlistController({
    ...elements,
    eventTarget,
    fetchImpl: async (_url, init = {}) => (init.method === "POST"
      ? Response.json({ success: false, code: "AUTH_REQUIRED" }, { status: 401 })
      : Response.json({ success: true, waitlist: { joined: false, bonusCredits: 5 } }))
  });

  await controller.setVisible(true);
  await controller.join();

  assert.equal(authRequests, 1);
  assert.match(elements.statusElement.textContent, /log in/i);
  assert.equal(elements.button.disabled, false);
  controller.destroy();
});
