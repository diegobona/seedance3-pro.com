const LOCAL_TASK_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TERMINAL_STATUSES = new Set(["succeeded", "failed", "expired", "submission_unknown"]);
const RETRIABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function videoError(message, details = {}) {
  return Object.assign(new Error(message), details);
}

function abortError() {
  return new DOMException("Video polling was aborted.", "AbortError");
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : abortError();
}

function parseCredits(response) {
  const cost = Number(response.headers.get("x-seedance-credit-cost"));
  const remaining = Number(response.headers.get("x-seedance-credit-remaining"));
  return Number.isSafeInteger(cost) && cost > 0
    && Number.isSafeInteger(remaining) && remaining >= 0
    ? { cost, remaining }
    : null;
}

async function responsePayload(response) {
  try {
    return await response.json();
  } catch {
    throw videoError("Video service returned an invalid response.", {
      status: response.status,
      code: "INVALID_VIDEO_RESPONSE",
      terminal: false
    });
  }
}

function validateLocalTaskId(value) {
  const taskId = String(value || "");
  if (!LOCAL_TASK_UUID_PATTERN.test(taskId)) {
    throw videoError("Video service returned an invalid task.", {
      code: "INVALID_VIDEO_TASK",
      terminal: false
    });
  }
  return taskId;
}

function validateTaskPayload(payload, expectedTaskId) {
  const taskId = validateLocalTaskId(payload?.task?.id);
  if (expectedTaskId && taskId !== expectedTaskId) {
    throw videoError("Video service returned an invalid task.", {
      code: "INVALID_VIDEO_TASK",
      terminal: false
    });
  }
  return taskId;
}

function validateVideoUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("unsafe");
    return url.href;
  } catch {
    throw videoError("Video service returned an invalid video URL.", {
      code: "INVALID_VIDEO_RESULT",
      terminal: true,
      taskStatus: "succeeded"
    });
  }
}

function retryAfterMs(response, { nowImpl, maxRetryAfterMs }) {
  const value = response.headers.get("retry-after")?.trim();
  if (!value) return null;
  let milliseconds;
  if (/^\d+$/.test(value)) {
    milliseconds = Number(value) * 1000;
  } else {
    const target = Date.parse(value);
    milliseconds = Number.isFinite(target) ? Math.max(0, target - nowImpl()) : Number.NaN;
  }
  return Number.isSafeInteger(milliseconds) && milliseconds >= 0 && milliseconds <= maxRetryAfterMs
    ? milliseconds
    : null;
}

function defaultWait(milliseconds, { signal } = {}) {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(done, milliseconds);
    function done() {
      signal?.removeEventListener("abort", canceled);
      resolve();
    }
    function canceled() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", canceled);
      reject(signal.reason instanceof Error ? signal.reason : abortError());
    }
    signal?.addEventListener("abort", canceled, { once: true });
  });
}

function errorFromResponse(response, payload, credits) {
  const taskStatus = typeof payload?.task?.status === "string" ? payload.task.status : undefined;
  return videoError(String(payload?.message || "Video generation failed."), {
    status: response.status,
    code: String(payload?.code || "VIDEO_GENERATION_FAILED"),
    ...(credits ? { credits } : {}),
    ...(taskStatus ? { taskStatus } : {}),
    terminal: TERMINAL_STATUSES.has(taskStatus)
  });
}

export async function pollVideoGenerationTask({
  taskId,
  fetchImpl = globalThis.fetch,
  waitImpl = defaultWait,
  nowImpl = Date.now,
  maxDurationMs = 10 * 60 * 1000,
  initialDelayMs = 1000,
  maxDelayMs = 8000,
  maxRetryAfterMs = 30_000,
  signal,
  onStatus = () => {},
  initialCredits = null
} = {}) {
  const localTaskId = validateLocalTaskId(taskId);
  const startedAt = nowImpl();
  let delayMs = Math.max(0, Math.min(Number(initialDelayMs) || 1000, Number(maxDelayMs) || 8000));
  const boundedMaxDelay = Math.max(delayMs, Number(maxDelayMs) || 8000);
  const boundedMaxDuration = Math.max(1, Number(maxDurationMs) || 10 * 60 * 1000);
  let latestCredits = initialCredits;

  async function waitBeforeRetry(response, retriable) {
    const elapsed = nowImpl() - startedAt;
    const remaining = boundedMaxDuration - elapsed;
    if (remaining <= 0) {
      throw videoError("Video generation is still running. Return later to resume checking it.", {
        code: "VIDEO_CLIENT_TIMEOUT",
        terminal: false,
        taskId: localTaskId
      });
    }
    const requestedDelay = retriable
      ? retryAfterMs(response, { nowImpl, maxRetryAfterMs }) ?? delayMs
      : delayMs;
    await waitImpl(Math.min(requestedDelay, remaining), { signal });
    throwIfAborted(signal);
    delayMs = Math.min(boundedMaxDelay, Math.max(1, delayMs * 2));
  }

  while (true) {
    throwIfAborted(signal);
    if (nowImpl() - startedAt >= boundedMaxDuration) {
      throw videoError("Video generation is still running. Return later to resume checking it.", {
        code: "VIDEO_CLIENT_TIMEOUT",
        terminal: false,
        taskId: localTaskId
      });
    }

    let response;
    try {
      response = await fetchImpl(`/api/videos/status?task=${encodeURIComponent(localTaskId)}`, {
        method: "GET",
        credentials: "same-origin",
        headers: { accept: "application/json" },
        signal
      });
    } catch (error) {
      throwIfAborted(signal);
      onStatus({ status: "retrying", taskId: localTaskId, credits: latestCredits });
      const placeholder = new Response(null);
      await waitBeforeRetry(placeholder, false);
      continue;
    }

    const credits = parseCredits(response);
    if (credits) latestCredits = credits;
    const payload = await responsePayload(response);
    const retriableHttp = RETRIABLE_HTTP_STATUSES.has(response.status);

    if (!response.ok || !payload?.success) {
      if (retriableHttp && !payload?.task) {
        onStatus({ status: "retrying", taskId: localTaskId, credits: latestCredits });
        await waitBeforeRetry(response, true);
        continue;
      }
      if (payload?.task?.id) validateTaskPayload(payload, localTaskId);
      throw errorFromResponse(response, payload, credits);
    }

    validateTaskPayload(payload, localTaskId);
    const status = String(payload.task.status || "");
    if (status === "succeeded") {
      return {
        taskId: localTaskId,
        status,
        videoUrl: validateVideoUrl(payload.task.resultUrl),
        ...(latestCredits ? { credits: latestCredits } : {})
      };
    }
    if (TERMINAL_STATUSES.has(status)) {
      throw videoError("Video generation failed. Your credits were refunded.", {
        code: status === "expired" ? "VIDEO_TASK_EXPIRED" : "VIDEO_GENERATION_FAILED",
        taskStatus: status,
        terminal: true,
        ...(latestCredits ? { credits: latestCredits } : {})
      });
    }
    if (status !== "queued" && status !== "running" && status !== "submitting") {
      throw videoError("Video service returned an invalid task status.", {
        code: "INVALID_VIDEO_RESPONSE",
        terminal: false
      });
    }
    const retriable = payload.retriable === true;
    onStatus({
      status: retriable ? "retrying" : status,
      taskStatus: status,
      taskId: localTaskId,
      credits: latestCredits
    });
    await waitBeforeRetry(response, retriable);
  }
}

export async function requestVideoGeneration({
  prompt,
  duration = 5,
  aspectRatio = "16:9",
  fetchImpl = globalThis.fetch,
  signal,
  onTask = () => {},
  onStatus = () => {},
  ...pollOptions
} = {}) {
  throwIfAborted(signal);
  const response = await fetchImpl("/api/videos/generate", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      accept: "application/json",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      prompt: String(prompt || "").trim(),
      duration: Number(duration),
      resolution: "480p",
      aspectRatio: String(aspectRatio || "16:9")
    }),
    signal
  });
  const credits = parseCredits(response);
  const payload = await responsePayload(response);
  if (!response.ok || !payload?.success) throw errorFromResponse(response, payload, credits);
  const taskId = validateTaskPayload(payload);
  onTask(taskId);
  onStatus({ status: String(payload.task.status || "queued"), taskId, credits });
  return pollVideoGenerationTask({
    ...pollOptions,
    taskId,
    fetchImpl,
    signal,
    onStatus,
    initialCredits: credits
  });
}
