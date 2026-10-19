import { t } from './i18n.mjs';
import { DEFAULT_IMAGE_MODEL, getImageModel, imageSizeForAspectRatio } from './image-models.mjs';
import { millisecondsUntilCreditReset } from './daily-credits.mjs';
export const IMAGE_EXAMPLE_PROMPTS = [
  "A cinematic portrait of a fashion designer in a sunlit studio, natural pose, editorial composition, warm rim light, premium magazine photography.",
  "A premium product photograph of a translucent citrus perfume bottle on pale stone, soft morning shadows, clean luxury campaign styling, 3:2 landscape composition.",
  "A whimsical editorial illustration of a tiny astronaut tending a rooftop garden at dusk, expressive pose, layered city depth, soft gouache texture and vivid accent colors."
];

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
    if (titleElement) titleElement.textContent = t(activeSlide.dataset?.title || "");
    if (descriptionElement) descriptionElement.textContent = t(activeSlide.dataset?.description || "");
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

export function creditCostForQuantity(value, modelId = DEFAULT_IMAGE_MODEL) {
  return normalizeImageQuantity(value) * (getImageModel(modelId)?.creditCost ?? 5);
}

export function creditCostForDuration(value) {
  const duration = Number(value);
  return [5, 10, 15].includes(duration) ? duration : 5;
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
  return creditSummaryForCost(currentBalance, cost);
}

function creditSummaryForCost(balance, cost) {
  const currentBalance = normalizeCreditBalance(balance);
  return {
    cost,
    currentBalance,
    projectedBalance: currentBalance === null ? null : Math.max(0, currentBalance - cost),
    insufficient: currentBalance !== null && currentBalance < cost
  };
}

export function createCreditSummaryController({
  container,
  costElement,
  currentBalanceElement,
  balanceLabelElement,
  quantityControl,
  additionalCostControls = [],
  getCost,
  getBalanceUrl = () => '/api/credits/balance',
  getContext = () => 'account',
  eventTarget = globalThis,
  fetchImpl = globalThis.fetch,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
  nowImpl = Date.now,
  prepareControls = () => {},
  onBalanceLoaded = () => {},
  onChange = () => {}
}) {
  let balance = null;
  let destroyed = false;
  let loadVersion = 0;
  let loadAbortController = null;
  let dailyResetTimer = null;
  let preview = true;

  function scheduleDailyReset() {
    if (dailyResetTimer !== null) clearTimeoutImpl(dailyResetTimer);
    dailyResetTimer = setTimeoutImpl(() => { void loadBalance(); }, millisecondsUntilCreditReset(nowImpl()));
    dailyResetTimer?.unref?.();
  }

  function invalidateLoad() {
    loadVersion += 1;
    loadAbortController?.abort();
    loadAbortController = null;
  }

  function render() {
    // Guest controls may fall back to an affordable quantity/duration. Compute
    // the cost only after that adjustment, using the real balance for limits.
    prepareControls(balance);
    const base = typeof getCost === "function"
      ? creditSummaryForCost(balance, getCost())
      : creditSummaryFor(balance, quantityControl?.value);
    const summary = { ...base, displayBalance: preview ? base.projectedBalance : base.currentBalance, isPreview: preview };
    const context = getContext();
    if (balanceLabelElement) balanceLabelElement.textContent = t(preview ? 'AFTER GENERATION' : 'REMAINING');
    if (context === 'guest-image') {
      const count = summary.cost / 5;
      costElement.textContent = count === 1 ? t('1 free image') : t('{count} free images', { count });
      const remaining = summary.displayBalance === null ? null : Math.floor(summary.displayBalance / 5);
      currentBalanceElement.textContent = remaining === null ? t('— images remaining')
        : remaining === 1 ? t('1 image remaining') : t('{count} images remaining', { count: remaining });
    } else if (context === 'guest-video') {
      costElement.textContent = t('{seconds} free seconds', { seconds: summary.cost });
      currentBalanceElement.textContent = summary.displayBalance === null ? t('— seconds remaining')
        : t('{seconds} seconds remaining', { seconds: summary.displayBalance });
    } else {
      costElement.textContent = t('{cost} credits', { cost: summary.cost });
      currentBalanceElement.textContent = summary.displayBalance === null ? t('— credits') : t('{cost} credits', { cost: summary.displayBalance });
    }
    container.classList.toggle("is-insufficient", summary.insufficient);
    container.classList.toggle("is-exhausted", summary.currentBalance === 0);
    onChange(summary);
  }

  function handleCreditsUpdated(event) {
    if ((event?.detail?.context ?? 'account') !== getContext()) return;
    invalidateLoad();
    balance = normalizeCreditBalance(event?.detail?.remaining);
    // Provider headers already include reservations, settlement or refunds.
    preview = false;
    render();
  }

  function handleCostChanged(event) {
    if (event.currentTarget.disabled) return;
    preview = true;
    render();
  }

  function handleAuthChanged() {
    preview = true;
    onBalanceLoaded(null, null);
    balance = null;
    render();
    void loadBalance();
  }

  async function loadBalance() {
    invalidateLoad();
    const requestVersion = loadVersion;
    const abortController = new AbortController();
    loadAbortController = abortController;
    let loadedBalance = null;
    let loadedCredits = null;
    try {
      const response = await fetchImpl(getBalanceUrl(), {
        credentials: "same-origin",
        signal: abortController.signal
      });
      if (response.ok) {
        const payload = await response.json();
        loadedCredits = payload?.credits ?? null;
        loadedBalance = normalizeCreditBalance(payload?.credits?.remaining);
      }
    } catch {
      loadedBalance = null;
    }
    if (destroyed || requestVersion !== loadVersion) return;
    loadAbortController = null;
    balance = loadedBalance;
    onBalanceLoaded(loadedBalance, loadedCredits);
    render();
    if (loadedBalance !== null) {
      if (dailyResetTimer !== null) clearTimeoutImpl(dailyResetTimer);
      dailyResetTimer = null;
      if (loadedCredits?.expiresDaily !== false) scheduleDailyReset();
    }
  }

  function handleFocus() { void loadBalance(); }

  quantityControl.addEventListener("change", handleCostChanged);
  additionalCostControls.forEach((control) => control.addEventListener("change", handleCostChanged));
  eventTarget.addEventListener("seedance:credits-updated", handleCreditsUpdated);
  eventTarget.addEventListener("seedance:auth-changed", handleAuthChanged);
  eventTarget.addEventListener("focus", handleFocus);
  render();

  return {
    refresh: render,
    beginGeneration({ reserved = false } = {}) {
      preview = !reserved;
      render();
    },
    reset() {
      invalidateLoad();
      preview = true;
      balance = null;
      render();
      return loadBalance();
    },
    loadBalance,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      invalidateLoad();
      if (dailyResetTimer !== null) clearTimeoutImpl(dailyResetTimer);
      quantityControl.removeEventListener("change", handleCostChanged);
      additionalCostControls.forEach((control) => control.removeEventListener("change", handleCostChanged));
      eventTarget.removeEventListener("seedance:credits-updated", handleCreditsUpdated);
      eventTarget.removeEventListener("seedance:auth-changed", handleAuthChanged);
      eventTarget.removeEventListener("focus", handleFocus);
    }
  };
}

export function sizeForAspectRatio(value, modelId = DEFAULT_IMAGE_MODEL) {
  return imageSizeForAspectRatio(value, modelId);
}
