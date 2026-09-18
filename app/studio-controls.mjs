export const IMAGE_EXAMPLE_PROMPTS = [
  "A cinematic portrait of a fashion designer in a sunlit studio, natural pose, editorial composition, warm rim light, premium magazine photography.",
  "A premium product photograph of a translucent citrus perfume bottle on pale stone, soft morning shadows, clean luxury campaign styling, 3:2 landscape composition.",
  "A whimsical editorial illustration of a tiny astronaut tending a rooftop garden at dusk, expressive pose, layered city depth, soft gouache texture and vivid accent colors."
];

const SIZE_BY_ASPECT_RATIO = {
  "1:1": "1024x1024",
  "3:2": "1536x1024",
  "2:3": "1024x1536"
};

export function applyPromptStructure(value = "") {
  const subject = String(value || "").trim();
  return [
    `Subject: ${subject}`,
    "Action: ",
    "Environment: ",
    "Composition: ",
    "Lighting: ",
    "Style: ",
    "Details to preserve: "
  ].join("\n").slice(0, 2500);
}

export function examplePromptAt(index = 0) {
  const parsed = Number(index);
  const safeIndex = Number.isSafeInteger(parsed) ? parsed : 0;
  const normalizedIndex = ((safeIndex % IMAGE_EXAMPLE_PROMPTS.length) + IMAGE_EXAMPLE_PROMPTS.length)
    % IMAGE_EXAMPLE_PROMPTS.length;
  return IMAGE_EXAMPLE_PROMPTS[normalizedIndex];
}

export function createExampleCarouselController({
  slides,
  dots,
  previousButton,
  nextButton,
  titleElement,
  descriptionElement,
  intervalMs = 5000,
  setIntervalImpl = globalThis.setInterval,
  clearIntervalImpl = globalThis.clearInterval
}) {
  const items = Array.from(slides || []);
  const indicators = Array.from(dots || []);
  const cleanups = [];
  let activeIndex = 0;
  let intervalId = null;
  let destroyed = false;

  function render(index) {
    if (!items.length || destroyed) return;
    activeIndex = ((index % items.length) + items.length) % items.length;
    items.forEach((slide, slideIndex) => {
      const active = slideIndex === activeIndex;
      slide.hidden = !active;
      slide.classList?.toggle("is-active", active);
    });
    indicators.forEach((dot, dotIndex) => {
      const active = dotIndex === activeIndex;
      dot.classList?.toggle("is-active", active);
      dot.setAttribute?.("aria-current", String(active));
    });
    const activeSlide = items[activeIndex];
    if (titleElement) titleElement.textContent = activeSlide.dataset?.title || "";
    if (descriptionElement) descriptionElement.textContent = activeSlide.dataset?.description || "";
  }

  function restartTimer() {
    if (intervalId !== null) clearIntervalImpl(intervalId);
    intervalId = items.length > 1
      ? setIntervalImpl(() => render(activeIndex + 1), intervalMs)
      : null;
  }

  function listen(target, listener) {
    if (!target?.addEventListener) return;
    target.addEventListener("click", listener);
    cleanups.push(() => target.removeEventListener("click", listener));
  }

  listen(previousButton, () => {
    render(activeIndex - 1);
    restartTimer();
  });
  listen(nextButton, () => {
    render(activeIndex + 1);
    restartTimer();
  });
  indicators.forEach((dot, index) => listen(dot, () => {
    render(index);
    restartTimer();
  }));

  render(0);
  restartTimer();

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (intervalId !== null) clearIntervalImpl(intervalId);
      while (cleanups.length) cleanups.pop()();
    }
  };
}

export function normalizeImageQuantity(value) {
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 3 ? quantity : 1;
}

export function creditCostForQuantity(value) {
  return normalizeImageQuantity(value) * 5;
}

function normalizeCreditBalance(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function projectedCreditBalance(balance, quantity) {
  const normalizedBalance = normalizeCreditBalance(balance);
  if (normalizedBalance === null) return null;
  return Math.max(0, normalizedBalance - creditCostForQuantity(quantity));
}

export function creditSummaryFor(balance, quantity) {
  const currentBalance = normalizeCreditBalance(balance);
  const cost = creditCostForQuantity(quantity);
  return {
    cost,
    currentBalance,
    projectedBalance: projectedCreditBalance(currentBalance, quantity),
    insufficient: currentBalance !== null && currentBalance < cost
  };
}

export function createCreditSummaryController({
  container,
  costElement,
  currentBalanceElement,
  quantityControl,
  eventTarget = globalThis,
  fetchImpl = globalThis.fetch,
  onChange = () => {}
}) {
  let balance = null;
  let destroyed = false;
  let loadVersion = 0;
  let loadAbortController = null;

  function invalidateLoad() {
    loadVersion += 1;
    loadAbortController?.abort();
    loadAbortController = null;
  }

  function render() {
    const summary = creditSummaryFor(balance, quantityControl?.value);
    costElement.textContent = `${summary.cost} credits`;
    currentBalanceElement.textContent = summary.currentBalance === null ? "— credits" : `${summary.currentBalance} credits`;
    container.classList.toggle("is-insufficient", summary.insufficient);
    container.classList.toggle("is-exhausted", summary.currentBalance === 0);
    onChange(summary);
  }

  function handleCreditsUpdated(event) {
    invalidateLoad();
    balance = normalizeCreditBalance(event?.detail?.remaining);
    render();
  }

  quantityControl.addEventListener("change", render);
  eventTarget.addEventListener("seedance:credits-updated", handleCreditsUpdated);
  render();

  return {
    async loadBalance() {
      invalidateLoad();
      const requestVersion = loadVersion;
      const abortController = new AbortController();
      loadAbortController = abortController;
      let loadedBalance = null;
      try {
        const response = await fetchImpl("/api/credits/balance", {
          credentials: "same-origin",
          signal: abortController.signal
        });
        if (response.ok) {
          const payload = await response.json();
          loadedBalance = normalizeCreditBalance(payload?.credits?.remaining);
        }
      } catch {
        loadedBalance = null;
      }
      if (destroyed || requestVersion !== loadVersion) return;
      loadAbortController = null;
      balance = loadedBalance;
      render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      invalidateLoad();
      quantityControl.removeEventListener("change", render);
      eventTarget.removeEventListener("seedance:credits-updated", handleCreditsUpdated);
    }
  };
}

export function sizeForAspectRatio(value) {
  return SIZE_BY_ASPECT_RATIO[value] || SIZE_BY_ASPECT_RATIO["1:1"];
}
