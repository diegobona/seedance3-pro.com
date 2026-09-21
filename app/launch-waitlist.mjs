const DEFAULT_BONUS_CREDITS = 5;

function readWaitlist(payload) {
  const joined = payload?.waitlist?.joined === true;
  const value = payload?.waitlist?.bonusCredits;
  const bonusCredits = Number.isSafeInteger(value) && value > 0 ? value : DEFAULT_BONUS_CREDITS;
  return { joined, bonusCredits };
}

export function createLaunchWaitlistController({
  container,
  button,
  statusElement,
  eventTarget = globalThis,
  fetchImpl = globalThis.fetch
}) {
  let visible = false;
  let joined = false;
  let bonusCredits = DEFAULT_BONUS_CREDITS;
  let loaded = false;
  let pending = false;
  let destroyed = false;
  let abortController = null;

  function render() {
    container.hidden = !visible;
    container.dataset.joined = String(joined);
    button.textContent = joined
      ? "You're on the launch list"
      : `Notify me & claim ${bonusCredits} credits`;
    button.disabled = pending || joined;
  }

  function showStatus(message, tone = "") {
    statusElement.textContent = message;
    statusElement.className = `launch-waitlist-status${tone ? ` is-${tone}` : ""}`;
  }

  async function request(method) {
    abortController?.abort();
    abortController = new AbortController();
    const response = await fetchImpl("/api/launch-waitlist", {
      method,
      credentials: "same-origin",
      headers: { accept: "application/json" },
      signal: abortController.signal
    });
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      // The bounded fallback below handles invalid JSON responses.
    }
    if (response.status === 401 || payload?.code === "AUTH_REQUIRED") {
      eventTarget.dispatchEvent(new CustomEvent("seedance:auth-required"));
      throw new Error("Log in to join the launch list.");
    }
    if (!response.ok || payload?.success !== true) {
      throw new Error(String(payload?.message || "Launch notifications are temporarily unavailable."));
    }
    return readWaitlist(payload);
  }

  async function loadStatus() {
    if (destroyed || !visible || loaded || pending) return;
    pending = true;
    render();
    try {
      const status = await request("GET");
      if (destroyed) return;
      joined = status.joined;
      bonusCredits = status.bonusCredits;
      loaded = true;
      if (joined) showStatus("We'll email you when paid plans open.", "success");
    } catch (error) {
      if (destroyed || error?.name === "AbortError") return;
      showStatus(String(error?.message || "Launch notifications are temporarily unavailable."), "error");
    } finally {
      pending = false;
      if (!destroyed) render();
    }
  }

  async function join() {
    if (destroyed || joined || pending) return;
    pending = true;
    showStatus("Joining the launch list…");
    render();
    try {
      const status = await request("POST");
      if (destroyed) return;
      joined = status.joined;
      bonusCredits = status.bonusCredits;
      loaded = true;
      showStatus("You're in. We'll email you when paid plans open.", "success");
    } catch (error) {
      if (destroyed || error?.name === "AbortError") return;
      showStatus(String(error?.message || "Launch notifications are temporarily unavailable."), "error");
    } finally {
      pending = false;
      if (!destroyed) render();
    }
  }

  function handleClick() {
    void join();
  }

  function handleAuthChanged() {
    loaded = false;
    if (visible) void loadStatus();
  }

  button.addEventListener("click", handleClick);
  eventTarget.addEventListener("seedance:auth-changed", handleAuthChanged);
  render();

  return {
    join,
    async setVisible(value) {
      visible = Boolean(value);
      render();
      if (visible) await loadStatus();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      abortController?.abort();
      button.removeEventListener("click", handleClick);
      eventTarget.removeEventListener("seedance:auth-changed", handleAuthChanged);
    }
  };
}
