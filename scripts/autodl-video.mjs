const AUTODL_RESOLUTIONS = {
  "480p": {
    "9:16": "480p竖",
    "16:9": "480p横",
    "1:1": "480p(1:1)"
  },
  "768p": {
    "9:16": "768p竖",
    "16:9": "768p横",
    "1:1": "768p(1:1)"
  }
};
const MAX_VIDEO_REQUEST_BYTES = 16 * 1024;
const MAX_PROMPT_LENGTH = 10_000;
const VIDEO_REQUEST_FIELDS = new Set(["prompt", "duration", "resolution", "aspectRatio"]);
const ALLOWED_DURATIONS = new Set([5, 10, 15]);
const ALLOWED_RESOLUTIONS = new Set(["480p", "768p"]);
const ALLOWED_ASPECT_RATIOS = new Set(["9:16", "16:9", "1:1"]);
const DEFAULT_AUTODL_API_BASE = "https://autodl.art";
const PROVIDER_TIMEOUT_MS = 15_000;
const MAX_PROVIDER_SUCCESS_BYTES = 256 * 1024;
const MAX_PROVIDER_ERROR_BYTES = 64 * 1024;
const MAX_PROVIDER_MESSAGE_LENGTH = 500;

export const AUTODL_WORKFLOW_ID = "minimax_h3_lightx2v_no_pic";

export class AutodlProviderError extends Error {
  constructor(message, {
    code = "AUTODL_PROVIDER_FAILURE",
    retriable = false,
    ambiguous = false,
    providerStatus,
    retryAfterSeconds
  } = {}) {
    super(message);
    this.name = "AutodlProviderError";
    this.code = code;
    this.retriable = retriable;
    this.ambiguous = ambiguous;
    this.status = code === "AUTODL_CONFIGURATION_ERROR" ? 503 : 502;
    if (providerStatus !== undefined) this.providerStatus = providerStatus;
    if (retryAfterSeconds !== undefined) this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function mapAutodlVideoResolution(resolution, aspectRatio) {
  return AUTODL_RESOLUTIONS[resolution]?.[aspectRatio];
}

export async function preflightVideoGenerationRequest(request) {
  const contentType = String(request.headers.get("content-type") || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return invalidRequest("Expected application/json.", 415);
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const normalizedLength = contentLength.trim();
    if (!/^\d+$/.test(normalizedLength)) {
      return invalidRequest("Invalid Content-Length header.", 400);
    }
    if (Number(normalizedLength) > MAX_VIDEO_REQUEST_BYTES) {
      return invalidRequest("Video generation request is too large.", 413);
    }
  }

  const body = await readRequestTextWithinLimit(request, MAX_VIDEO_REQUEST_BYTES);
  if (body === null) {
    return invalidRequest("Video generation request is too large.", 413);
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return invalidRequest("Invalid JSON request body.", 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return invalidRequest("Video generation request must be a JSON object.", 400);
  }

  const keys = readTopLevelObjectKeys(body);
  if (new Set(keys).size !== keys.length) {
    return invalidRequest("Duplicate video generation fields are not allowed.", 400);
  }
  if (keys.some((key) => !VIDEO_REQUEST_FIELDS.has(key))) {
    return invalidRequest("Unexpected video generation field.", 400);
  }

  if (typeof payload.prompt !== "string" || !payload.prompt.trim()) {
    return invalidRequest("Prompt is required.", 400);
  }
  const prompt = payload.prompt.trim();
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return invalidRequest("Prompt cannot exceed 10,000 characters.", 400);
  }
  if (!ALLOWED_DURATIONS.has(payload.duration)) {
    return invalidRequest("Duration must be 5, 10, or 15 seconds.", 400);
  }
  if (!ALLOWED_RESOLUTIONS.has(payload.resolution)) {
    return invalidRequest("Resolution must be 480p or 768p.", 400);
  }
  if (!ALLOWED_ASPECT_RATIOS.has(payload.aspectRatio)) {
    return invalidRequest("Aspect ratio must be 9:16, 16:9, or 1:1.", 400);
  }

  return {
    ok: true,
    payload: {
      prompt,
      duration: payload.duration,
      resolution: payload.resolution,
      aspectRatio: payload.aspectRatio
    }
  };
}

export async function submitAutodlVideoTask(payload, options = {}) {
  const configuration = readProviderConfiguration(options);
  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs ?? PROVIDER_TIMEOUT_MS;
  const signalFactory = options.signalFactory || ((milliseconds) => AbortSignal.timeout(milliseconds));
  const providerResolution = mapAutodlVideoResolution(payload?.resolution, payload?.aspectRatio);
  if (!providerResolution) {
    throw new AutodlProviderError("Video provider request is invalid.", {
      code: "AUTODL_CONFIGURATION_ERROR"
    });
  }

  let response;
  try {
    response = await fetchImpl(
      `${configuration.apiBase}/api/v1/comfyui/comfyui_workflow/${AUTODL_WORKFLOW_ID}`,
      {
        method: "POST",
        headers: {
          Authorization: configuration.token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: payload.prompt,
          duration: payload.duration,
          resolution: providerResolution
        }),
        signal: signalFactory(timeoutMs)
      }
    );
  } catch (error) {
    throw submissionUnknownError(error);
  }

  if (!response.ok) {
    const providerMessage = await readProviderFailureMessage(response, configuration.token);
    const retriable = isRetriableProviderStatus(response.status);
    throw new AutodlProviderError(providerMessage, {
      retriable,
      providerStatus: response.status,
      retryAfterSeconds: retriable
        ? readRetryAfterSeconds(response.headers.get("retry-after"))
        : undefined
    });
  }

  let result;
  try {
    result = await readJsonWithinLimit(response, MAX_PROVIDER_SUCCESS_BYTES);
  } catch (error) {
    if (error instanceof AutodlResponseReadError) {
      throw submissionUnknownError(error.cause, response.status);
    }
    throw new AutodlProviderError("AutoDL returned an invalid response.", {
      providerStatus: response.status
    });
  }

  const providerTaskId = result?.data?.task_id;
  if (result?.code !== "Success" || typeof providerTaskId !== "string" || !providerTaskId.trim()) {
    throw new AutodlProviderError("AutoDL returned an invalid task response.", {
      providerStatus: response.status
    });
  }
  return { providerTaskId: providerTaskId.trim() };
}

export async function queryAutodlVideoTask(providerTaskId, options = {}) {
  const configuration = readProviderConfiguration(options);
  if (typeof providerTaskId !== "string" || !providerTaskId.trim()) {
    throw new AutodlProviderError("AutoDL task ID is invalid.", {
      code: "AUTODL_CONFIGURATION_ERROR"
    });
  }

  const fetchImpl = options.fetchImpl || fetch;
  const timeoutMs = options.timeoutMs ?? PROVIDER_TIMEOUT_MS;
  const signalFactory = options.signalFactory || ((milliseconds) => AbortSignal.timeout(milliseconds));
  let response;
  try {
    response = await fetchImpl(
      `${configuration.apiBase}/api/v1/comfyui/comfyui_workflow/result/${encodeURIComponent(providerTaskId.trim())}`,
      {
        method: "GET",
        headers: { Authorization: configuration.token },
        signal: signalFactory(timeoutMs)
      }
    );
  } catch (error) {
    throw queryTransportError(error);
  }

  if (!response.ok) {
    const providerMessage = await readProviderFailureMessage(response, configuration.token);
    const retriable = isRetriableProviderStatus(response.status);
    throw new AutodlProviderError(providerMessage, {
      retriable,
      providerStatus: response.status,
      retryAfterSeconds: retriable
        ? readRetryAfterSeconds(response.headers.get("retry-after"))
        : undefined
    });
  }

  let result;
  try {
    result = await readJsonWithinLimit(response, MAX_PROVIDER_SUCCESS_BYTES);
  } catch (error) {
    if (error instanceof AutodlResponseReadError) {
      throw queryTransportError(error.cause, response.status);
    }
    throw new AutodlProviderError("AutoDL returned an invalid response.", {
      providerStatus: response.status
    });
  }
  const providerStatus = result?.data?.status;
  if (result?.code !== "Success" || typeof providerStatus !== "string" || !providerStatus.trim()) {
    throw new AutodlProviderError("AutoDL returned an invalid task response.", {
      providerStatus: response.status
    });
  }

  switch (providerStatus) {
    case "QUEUED":
      return { status: "queued", terminal: false };
    case "RUNNING":
      return { status: "running", terminal: false };
    case "FAILED":
      return { status: "failed", terminal: true };
    case "SUCCESS":
    case "completed":
      return readSuccessfulVideoResult(result.data.results, response.status);
    default:
      return {
        status: "unknown",
        providerStatus,
        terminal: false,
        retriable: true
      };
  }
}

function readSuccessfulVideoResult(results, providerStatus) {
  if (!Array.isArray(results) || results.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
    throw new AutodlProviderError("AutoDL returned malformed video results.", { providerStatus });
  }
  const videoUrls = results.flatMap((item) => {
    if (item.type !== "video" || item.file_type !== "mp4" || item.output_type !== "output") return [];
    const url = normalizeHttpsUrl(item.url);
    return url ? [url] : [];
  });
  if (videoUrls.length !== 1) {
    throw new AutodlProviderError("AutoDL returned no unique usable video.", { providerStatus });
  }
  return {
    status: "succeeded",
    terminal: true,
    videoUrl: videoUrls[0]
  };
}

function normalizeHttpsUrl(value) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return "";
    return url.href;
  } catch {
    return "";
  }
}

function readProviderConfiguration(options) {
  const token = typeof options.token === "string" ? options.token.trim() : "";
  if (!token) {
    throw new AutodlProviderError("AutoDL is not configured.", {
      code: "AUTODL_CONFIGURATION_ERROR"
    });
  }

  const configuredBase = options.apiBase ?? DEFAULT_AUTODL_API_BASE;
  let url;
  try {
    url = new URL(String(configuredBase));
  } catch {
    throw new AutodlProviderError("AutoDL configuration is invalid.", {
      code: "AUTODL_CONFIGURATION_ERROR"
    });
  }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new AutodlProviderError("AutoDL configuration is invalid.", {
      code: "AUTODL_CONFIGURATION_ERROR"
    });
  }
  return {
    token,
    apiBase: url.href.replace(/\/$/, "")
  };
}

async function readProviderFailureMessage(response, token) {
  let payload;
  try {
    payload = await readJsonWithinLimit(response, MAX_PROVIDER_ERROR_BYTES);
  } catch {
    return `AutoDL request failed (${response.status}).`;
  }
  return sanitizeProviderMessage(
    payload?.message || payload?.msg || payload?.error?.message || `AutoDL request failed (${response.status}).`,
    token
  );
}

async function readJsonWithinLimit(response, maxBytes) {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null && Number(declaredLength) > maxBytes) {
    throw new Error("Provider response too large");
  }
  if (!response.body) return {};

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    let chunk;
    try {
      chunk = await reader.read();
    } catch (error) {
      throw new AutodlResponseReadError(error);
    }
    const { done, value } = chunk;
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("Provider response too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

class AutodlResponseReadError extends Error {
  constructor(cause) {
    super("AutoDL response body could not be read.", { cause });
    this.name = "AutodlResponseReadError";
  }
}

function submissionUnknownError(error, providerStatus) {
  const message = isTimeoutError(error)
    ? "AutoDL submission timed out before it could be confirmed."
    : "AutoDL submission could not be confirmed.";
  return new AutodlProviderError(message, {
    code: "AUTODL_SUBMISSION_UNKNOWN",
    ambiguous: true,
    providerStatus
  });
}

function queryTransportError(error, providerStatus) {
  const message = isTimeoutError(error)
    ? "AutoDL request timed out."
    : "Unable to reach AutoDL.";
  return new AutodlProviderError(message, {
    retriable: true,
    providerStatus
  });
}

function isTimeoutError(error) {
  return error?.name === "AbortError" || error?.name === "TimeoutError";
}

function isRetriableProviderStatus(status) {
  return status === 429 || status >= 500;
}

function readRetryAfterSeconds(value) {
  if (value === null || !/^\d+$/.test(value.trim())) return undefined;
  const seconds = Number(value);
  return Number.isSafeInteger(seconds) && seconds >= 0 && seconds <= 86_400
    ? seconds
    : undefined;
}

function sanitizeProviderMessage(message, token) {
  let output = String(message || "AutoDL request failed.");
  if (token) output = output.split(token).join("[redacted]");
  output = output.replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
  return output.slice(0, MAX_PROVIDER_MESSAGE_LENGTH);
}

async function readRequestTextWithinLimit(request, maxBytes) {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function readTopLevelObjectKeys(source) {
  const keys = [];
  let index = skipWhitespace(source, 0);
  if (source[index] !== "{") return keys;
  index += 1;

  while (index < source.length) {
    index = skipWhitespace(source, index);
    if (source[index] === "}") break;
    if (source[index] !== '"') return keys;

    const stringEnd = findJsonStringEnd(source, index);
    if (stringEnd < 0) return keys;
    keys.push(JSON.parse(source.slice(index, stringEnd + 1)));
    index = skipWhitespace(source, stringEnd + 1);
    if (source[index] !== ":") return keys;
    index = skipJsonValue(source, index + 1);
    index = skipWhitespace(source, index);
    if (source[index] === "}") break;
    if (source[index] !== ",") return keys;
    index += 1;
  }
  return keys;
}

function findJsonStringEnd(source, start) {
  let escaped = false;
  for (let index = start + 1; index < source.length; index += 1) {
    if (escaped) {
      escaped = false;
    } else if (source[index] === "\\") {
      escaped = true;
    } else if (source[index] === '"') {
      return index;
    }
  }
  return -1;
}

function skipJsonValue(source, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{" || character === "[") depth += 1;
    else if (character === "]") depth -= 1;
    else if (character === "}") {
      if (depth === 0) return index;
      depth -= 1;
    } else if (character === "," && depth === 0) {
      return index;
    }
  }
  return source.length;
}

function skipWhitespace(source, start) {
  let index = start;
  while (/\s/.test(source[index] || "")) index += 1;
  return index;
}

function invalidRequest(message, status) {
  return {
    ok: false,
    response: json({ success: false, message }, status)
  };
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json;charset=UTF-8",
      "cache-control": "no-store"
    }
  });
}
