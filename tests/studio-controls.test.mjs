import assert from "node:assert/strict";
import test from "node:test";
import * as studioControls from "../app/studio-controls.mjs";

const {
  applyPromptStructure,
  createExampleCarouselController,
  createCreditSummaryController,
  creditCostForDuration,
  creditSummaryFor,
  creditCostForQuantity,
  examplePromptAt,
  projectedCreditBalance,
  sizeForAspectRatio
} = studioControls;

function fakeCarouselElement() {
  const element = new EventTarget();
  element.hidden = false;
  element.classList = fakeClassList();
  element.dataset = {};
  element.attributes = new Map();
  element.setAttribute = (name, value) => element.attributes.set(name, String(value));
  element.getAttribute = (name) => element.attributes.get(name) ?? null;
  return element;
}

test("example carousel advances automatically and supports direct navigation", () => {
  assert.equal(typeof createExampleCarouselController, "function");
  const slides = [0, 1, 2].map((index) => {
    const slide = fakeCarouselElement();
    slide.dataset.title = `Example ${index + 1}`;
    slide.dataset.description = `Description ${index + 1}`;
    return slide;
  });
  const dots = [0, 1, 2].map(fakeCarouselElement);
  const previousButton = fakeCarouselElement();
  const nextButton = fakeCarouselElement();
  const titleElement = { textContent: "" };
  const descriptionElement = { textContent: "" };
  let scheduledTick;
  const clearedIntervals = [];

  const controller = createExampleCarouselController({
    slides,
    dots,
    previousButton,
    nextButton,
    titleElement,
    descriptionElement,
    setIntervalImpl: (callback) => {
      scheduledTick = callback;
      return 77;
    },
    clearIntervalImpl: (timer) => clearedIntervals.push(timer)
  });

  assert.equal(slides[0].hidden, false);
  assert.equal(slides[1].hidden, true);
  assert.equal(titleElement.textContent, "Example 1");
  assert.equal(dots[0].getAttribute("aria-current"), "true");

  nextButton.dispatchEvent(new Event("click"));
  assert.equal(slides[1].hidden, false);
  assert.equal(titleElement.textContent, "Example 2");

  dots[2].dispatchEvent(new Event("click"));
  assert.equal(slides[2].hidden, false);
  assert.equal(descriptionElement.textContent, "Description 3");

  scheduledTick();
  assert.equal(slides[0].hidden, false, "autoplay should wrap back to the first slide");

  controller.destroy();
  assert.ok(clearedIntervals.includes(77));
  nextButton.dispatchEvent(new Event("click"));
  assert.equal(slides[0].hidden, false, "destroy should remove navigation listeners");
});

test("prompt structure preserves an existing idea and adds useful image fields", () => {
  const structured = applyPromptStructure("A red fox reading beside a window");

  assert.match(structured, /^Subject: A red fox reading beside a window/m);
  assert.match(structured, /^Action:/m);
  assert.match(structured, /^Environment:/m);
  assert.match(structured, /^Composition:/m);
  assert.match(structured, /^Lighting:/m);
  assert.match(structured, /^Style:/m);
  assert.ok(structured.length <= 2500);
});

test("example prompts cycle deterministically", () => {
  const first = examplePromptAt(0);
  const second = examplePromptAt(1);
  const wrapped = examplePromptAt(3);

  assert.equal(typeof first, "string");
  assert.notEqual(first, second);
  assert.equal(wrapped, first);
});

test("image settings map to safe provider parameters and per-image credits", () => {
  assert.equal(creditCostForQuantity("1"), 5);
  assert.equal(creditCostForQuantity("3"), 15);
  assert.equal(creditCostForQuantity("99"), 5);
  assert.equal(sizeForAspectRatio("1:1"), "1024x1024");
  assert.equal(sizeForAspectRatio("3:2"), "1536x1024");
  assert.equal(sizeForAspectRatio("2:3"), "1024x1536");
  assert.equal(sizeForAspectRatio("unsafe"), "1024x1024");
});

test("H3 charges one credit per normalized video second", () => {
  assert.equal(typeof creditCostForDuration, "function");
  assert.equal(creditCostForDuration("5"), 5);
  assert.equal(creditCostForDuration("10"), 10);
  assert.equal(creditCostForDuration("15"), 15);
  assert.equal(creditCostForDuration("30"), 5);
});

test("credit summary controller can switch between image quantity and video duration costs", () => {
  const container = { classList: fakeClassList() };
  const quantityControl = new EventTarget();
  quantityControl.value = "3";
  const durationControl = new EventTarget();
  durationControl.value = "5";
  let mode = "image";
  const summaries = [];
  const controller = createCreditSummaryController({
    container,
    costElement: { textContent: "" },
    currentBalanceElement: { textContent: "" },
    quantityControl,
    additionalCostControls: [durationControl],
    getCost: () => mode === "video"
      ? creditCostForDuration(durationControl.value)
      : creditCostForQuantity(quantityControl.value),
    eventTarget: new EventTarget(),
    onChange: (summary) => summaries.push(summary)
  });

  assert.equal(summaries.at(-1).cost, 15, "three GPT images should retain their existing cost");
  mode = "video";
  controller.refresh();
  assert.equal(summaries.at(-1).cost, 5);
  durationControl.value = "10";
  durationControl.dispatchEvent(new Event("change"));
  assert.equal(summaries.at(-1).cost, 10);
  durationControl.value = "15";
  durationControl.dispatchEvent(new Event("change"));
  assert.equal(summaries.at(-1).cost, 15);
  controller.destroy();
});

test("projected balances subtract five credits per normalized image quantity", () => {
  assert.equal(typeof projectedCreditBalance, "function", "expected projectedCreditBalance to be exported");
  assert.equal(projectedCreditBalance(15, "1"), 10);
  assert.equal(projectedCreditBalance(15, "2"), 5);
  assert.equal(projectedCreditBalance(15, "3"), 0);
  assert.equal(projectedCreditBalance(15, "99"), 10);
});

test("projected balances clamp insufficient credits to zero", () => {
  assert.equal(typeof projectedCreditBalance, "function", "expected projectedCreditBalance to be exported");
  assert.equal(projectedCreditBalance(4, "1"), 0);
  assert.equal(projectedCreditBalance(9, "2"), 0);
  assert.equal(projectedCreditBalance(0, "3"), 0);
});

test("projected balances stay unknown for invalid balances", () => {
  assert.equal(typeof projectedCreditBalance, "function", "expected projectedCreditBalance to be exported");
  for (const balance of [null, undefined, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "15"]) {
    assert.equal(projectedCreditBalance(balance, "1"), null, `expected ${String(balance)} to remain unknown`);
  }
});

test("credit summaries expose cost, balances, and insufficiency from one state object", () => {
  assert.equal(typeof creditSummaryFor, "function", "expected creditSummaryFor to be exported");
  assert.deepEqual(creditSummaryFor(15, "2"), {
    cost: 10,
    currentBalance: 15,
    projectedBalance: 5,
    insufficient: false
  });
  assert.deepEqual(creditSummaryFor(4, "1"), {
    cost: 5,
    currentBalance: 4,
    projectedBalance: 0,
    insufficient: true
  });
  assert.deepEqual(creditSummaryFor(null, "3"), {
    cost: 15,
    currentBalance: null,
    projectedBalance: null,
    insufficient: false
  });
});

function fakeClassList() {
  const values = new Set();
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    toggle(name, force) {
      const enabled = force === undefined ? !values.has(name) : Boolean(force);
      if (enabled) values.add(name);
      else values.delete(name);
      return enabled;
    },
    contains: (name) => values.has(name)
  };
}

function creditsUpdatedEvent(remaining) {
  const event = new Event("seedance:credits-updated");
  Object.defineProperty(event, "detail", { value: { remaining } });
  return event;
}

test("credit summary controller renders live balances and removes its listeners", async () => {
  assert.equal(
    typeof createCreditSummaryController,
    "function",
    "expected createCreditSummaryController to be exported"
  );

  const container = { classList: fakeClassList() };
  const costElement = { textContent: "" };
  const currentBalanceElement = { textContent: "" };
  const quantityControl = new EventTarget();
  quantityControl.value = "1";
  const eventTarget = new EventTarget();
  const fetchCalls = [];

  const controller = createCreditSummaryController({
    container,
    costElement,
    currentBalanceElement,
    quantityControl,
    eventTarget,
    fetchImpl: async (url, init) => {
      fetchCalls.push({ url, init });
      return Response.json({ credits: { remaining: 15 } });
    }
  });

  assert.equal(typeof controller?.loadBalance, "function");
  assert.equal(typeof controller?.destroy, "function");
  await controller.loadBalance();

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, "/api/credits/balance");
  assert.equal(fetchCalls[0].init?.credentials, "same-origin");
  assert.equal(costElement.textContent, "5 credits");
  assert.equal(currentBalanceElement.textContent, "15 credits");
  assert.equal(container.classList.contains("is-insufficient"), false);

  quantityControl.value = "2";
  quantityControl.dispatchEvent(new Event("change"));
  assert.equal(costElement.textContent, "10 credits");
  assert.equal(currentBalanceElement.textContent, "15 credits");

  eventTarget.dispatchEvent(creditsUpdatedEvent(8));
  assert.equal(currentBalanceElement.textContent, "8 credits");
  assert.equal(container.classList.contains("is-insufficient"), true);

  controller.destroy();
  quantityControl.value = "3";
  quantityControl.dispatchEvent(new Event("change"));
  eventTarget.dispatchEvent(creditsUpdatedEvent(50));
  assert.equal(costElement.textContent, "10 credits");
  assert.equal(currentBalanceElement.textContent, "8 credits");
  assert.equal(container.classList.contains("is-insufficient"), true);
});

test("credit summary controller reports each rendered state", () => {
  const container = { classList: fakeClassList() };
  const quantityControl = new EventTarget();
  quantityControl.value = "1";
  const eventTarget = new EventTarget();
  const summaries = [];
  const controller = createCreditSummaryController({
    container,
    costElement: { textContent: "" },
    currentBalanceElement: { textContent: "" },
    quantityControl,
    eventTarget,
    onChange: (summary) => summaries.push(summary)
  });

  assert.deepEqual(summaries.at(-1), creditSummaryFor(null, "1"));
  eventTarget.dispatchEvent(creditsUpdatedEvent(8));
  assert.deepEqual(summaries.at(-1), creditSummaryFor(8, "1"));
  quantityControl.value = "2";
  quantityControl.dispatchEvent(new Event("change"));
  assert.deepEqual(summaries.at(-1), creditSummaryFor(8, "2"));
  assert.equal(summaries.at(-1).insufficient, true);

  controller.destroy();
});

test("credit summary controller marks a zero balance as a completed trial", () => {
  const container = { classList: fakeClassList() };
  const quantityControl = new EventTarget();
  quantityControl.value = "1";
  const eventTarget = new EventTarget();
  const controller = createCreditSummaryController({
    container,
    costElement: { textContent: "" },
    currentBalanceElement: { textContent: "" },
    quantityControl,
    eventTarget
  });

  eventTarget.dispatchEvent(creditsUpdatedEvent(0));
  assert.equal(container.classList.contains("is-insufficient"), true);
  assert.equal(container.classList.contains("is-exhausted"), true);

  eventTarget.dispatchEvent(creditsUpdatedEvent(10));
  assert.equal(container.classList.contains("is-exhausted"), false);
  controller.destroy();
});

test("credit summary controller reloads the balance after authentication changes", async () => {
  const container = { classList: fakeClassList() };
  const currentBalanceElement = { textContent: "" };
  const quantityControl = new EventTarget();
  quantityControl.value = "1";
  const eventTarget = new EventTarget();
  let fetchCalls = 0;
  let resolveAuthenticatedBalance;
  const controller = createCreditSummaryController({
    container,
    costElement: { textContent: "" },
    currentBalanceElement,
    quantityControl,
    eventTarget,
    fetchImpl: async () => {
      fetchCalls += 1;
      if (fetchCalls === 1) {
        return Response.json({ success: false, code: "AUTH_REQUIRED" }, { status: 401 });
      }
      return new Promise((resolve) => {
        resolveAuthenticatedBalance = resolve;
      });
    }
  });

  await controller.loadBalance();
  assert.equal(currentBalanceElement.textContent, "— credits");

  eventTarget.dispatchEvent(new Event("seedance:auth-changed"));
  assert.equal(fetchCalls, 2, "authentication should trigger a fresh balance request");
  resolveAuthenticatedBalance(Response.json({ credits: { remaining: 15 } }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(currentBalanceElement.textContent, "15 credits");

  controller.destroy();
});

test("credit summary controller rejects stale loads and aborts loads on destroy", async () => {
  const container = { classList: fakeClassList() };
  const currentBalanceElement = { textContent: "" };
  const quantityControl = new EventTarget();
  quantityControl.value = "1";
  const eventTarget = new EventTarget();
  const requests = [];
  const controller = createCreditSummaryController({
    container,
    costElement: { textContent: "" },
    currentBalanceElement,
    quantityControl,
    eventTarget,
    fetchImpl: (url, init) => new Promise((resolve) => requests.push({ url, init, resolve }))
  });

  const staleLoad = controller.loadBalance();
  assert.equal(requests[0].init.signal.aborted, false);
  eventTarget.dispatchEvent(creditsUpdatedEvent(8));
  requests[0].resolve(Response.json({ credits: { remaining: 50 } }));
  await staleLoad;
  assert.equal(currentBalanceElement.textContent, "8 credits", "a stale load must not replace a newer event");

  const destroyedLoad = controller.loadBalance();
  const destroyedRequest = requests[1];
  controller.destroy();
  assert.equal(destroyedRequest.init.signal.aborted, true, "destroy should abort the active balance request");
  destroyedRequest.resolve(Response.json({ credits: { remaining: 99 } }));
  await destroyedLoad;
  assert.equal(currentBalanceElement.textContent, "8 credits", "a destroyed controller must ignore late responses");
});
