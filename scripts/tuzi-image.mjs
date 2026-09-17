const DEFAULT_API_BASE = "https://api.tu-zi.com";
const MODEL_ID = "gpt-image-2";
const OUTPUT_SIZE = "1024x1024";
const MAX_PROMPT_LENGTH = 2500;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;
const MAX_SUCCESS_BYTES = 20 * 1024 * 1024;
const MAX_ERROR_BYTES = 64 * 1024;
const UPSTREAM_TIMEOUT_MS = 120_000;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function handleImageGenerationRequest(request, env = {}, options = {}) {
  const apiKey = String(env.TUZI_API_KEY || "").trim();
  if (!apiKey) {
    return json({ success: false, message: "Image generation is not configured." }, 503);
  }

  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("multipart/form-data")) {
    return json({ success: false, message: "Expected multipart form data." }, 415);
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return json({ success: false, message: "Image generation request is too large." }, 413);
  }

  if (!options.skipRateLimit) {
    if (typeof env.IMAGE_RATE_LIMITER?.limit !== "function") {
      return json({ success: false, message: "Image generation protection is not configured." }, 503);
    }
    const actor = request.headers.get("cf-connecting-ip") || "anonymous";
    const rateLimit = await env.IMAGE_RATE_LIMITER.limit({ key: `gpt-image-2:${actor}` });
    if (!rateLimit.success) {
      return json({ success: false, message: "Generation limit reached. Please wait a minute and try again." }, 429);
    }
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ success: false, message: "Invalid multipart form data." }, 400);
  }

  const fieldNames = [...new Set(form.keys())];
  if (fieldNames.some((name) => name !== "prompt" && name !== "image")) {
    return json({ success: false, message: "Unexpected image generation field." }, 400);
  }

  const promptValues = form.getAll("prompt");
  if (promptValues.length !== 1 || typeof promptValues[0] !== "string") {
    return json({ success: false, message: "Prompt must be a single text field." }, 400);
  }
  const prompt = promptValues[0].trim();
  if (!prompt) {
    return json({ success: false, message: "Prompt is required." }, 400);
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return json({ success: false, message: `Prompt cannot exceed ${MAX_PROMPT_LENGTH} characters.` }, 400);
  }

  const imageValues = form.getAll("image");
  if (imageValues.length > 1 || (imageValues.length === 1 && !isFileLike(imageValues[0]))) {
    return json({ success: false, message: "Provide at most one reference image." }, 400);
  }
  const candidate = imageValues[0];
  if (candidate && candidate.size === 0) {
    return json({ success: false, message: "Reference image cannot be empty." }, 400);
  }
  const image = candidate || null;
  if (image && !ALLOWED_IMAGE_TYPES.has(String(image.type || "").toLowerCase())) {
    return json({ success: false, message: "Reference image must be PNG, JPEG, or WebP." }, 400);
  }
  if (image && image.size > MAX_IMAGE_BYTES) {
    return json({ success: false, message: "Reference image cannot exceed 10 MB." }, 413);
  }

  try {
    const result = await generateTuziImage({ prompt, image }, {
      apiKey,
      apiBase: String(env.TUZI_API_BASE || DEFAULT_API_BASE),
      fetchImpl: options.fetchImpl || fetch,
      timeoutMs: options.timeoutMs || UPSTREAM_TIMEOUT_MS
    });
    return json({
      success: true,
      mode: image ? "image-to-image" : "text-to-image",
      image: result
    });
  } catch (error) {
    const status = Number(error?.status || 502);
    return json({
      success: false,
      message: String(error?.message || "Image provider request failed.")
    }, status);
  }
}

export async function generateTuziImage({ prompt, image }, {
  apiKey,
  apiBase = DEFAULT_API_BASE,
  fetchImpl = fetch,
  timeoutMs = UPSTREAM_TIMEOUT_MS
} = {}) {
  const normalizedBase = String(apiBase || DEFAULT_API_BASE).replace(/\/$/, "");
  const headers = { Authorization: `Bearer ${apiKey}` };
  let path;
  let body;

  if (image) {
    path = "/v1/images/edits";
    body = new FormData();
    body.set("model", MODEL_ID);
    body.set("prompt", prompt);
    body.set("image", image, image.name || "reference.png");
    body.set("n", "1");
    body.set("size", OUTPUT_SIZE);
    body.set("response_format", "b64_json");
  } else {
    path = "/v1/images/generations";
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({
      model: MODEL_ID,
      prompt,
      n: 1,
      size: OUTPUT_SIZE,
      response_format: "b64_json"
    });
  }

  let response;
  try {
    response = await fetchImpl(`${normalizedBase}${path}`, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    if (error?.name === "AbortError" || error?.name === "TimeoutError") {
      throw providerError("Image generation timed out. Please try again.", 504);
    }
    throw providerError("Unable to reach the image provider.", 502);
  }

  const payload = await readJsonWithinLimit(
    response,
    response.ok ? MAX_SUCCESS_BYTES : MAX_ERROR_BYTES
  );
  if (!response.ok) {
    const upstreamMessage = sanitizeProviderMessage(
      payload?.error?.message || payload?.message || `Provider request failed (${response.status}).`,
      apiKey
    );
    const status = [400, 413, 429].includes(response.status) ? response.status : 502;
    throw providerError(upstreamMessage, status);
  }

  const items = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.data?.images)
      ? payload.data.images
      : Array.isArray(payload?.images)
        ? payload.images
        : [];
  const item = items.find((entry) => entry?.url || entry?.b64_json || entry?.b64);
  if (item?.url) {
    const safeUrl = normalizeHttpsUrl(item.url);
    if (safeUrl) return { url: safeUrl };
    throw providerError("Image provider returned no usable image.", 502);
  }
  const encoded = item?.b64_json || item?.b64;
  if (encoded) {
    return { dataUrl: `data:image/png;base64,${String(encoded)}` };
  }
  throw providerError("Image provider returned no usable image.", 502);
}

async function readJsonWithinLimit(response, maxBytes) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) {
    throw providerError("Image provider response was too large.", 502);
  }
  if (!response.body) {
    return {};
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw providerError("Image provider response was too large.", 502);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw providerError("Image provider returned an invalid response.", 502);
  }
}

function isFileLike(value) {
  return Boolean(value && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.size === "number");
}

function providerError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeHttpsUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function sanitizeProviderMessage(message, apiKey) {
  let output = String(message || "Image provider request failed.");
  if (apiKey) output = output.split(String(apiKey)).join("[redacted]");
  return output.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 500);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json;charset=UTF-8",
      "cache-control": "no-store"
    }
  });
}
