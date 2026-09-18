const DEFAULT_API_BASE = "https://api.tu-zi.com";
const MODEL_ID = "gpt-image-2";
const DEFAULT_OUTPUT_SIZE = "1024x1024";
const DEFAULT_RESOLUTION = "1K";
const PROVIDER_QUALITY = "medium";
const DEFAULT_QUANTITY = 1;
const MAX_PROMPT_LENGTH = 2500;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;
const MAX_SUCCESS_BYTES = 16 * 1024 * 1024;
const MAX_ERROR_BYTES = 64 * 1024;
const UPSTREAM_TIMEOUT_MS = 120_000;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const ALLOWED_QUANTITIES = new Set([1, 2, 3]);
const ALLOWED_RESOLUTIONS = new Set([DEFAULT_RESOLUTION]);
const ALLOWED_SIZES = new Set(["1024x1024", "1536x1024", "1024x1536"]);
const QUANTITY_HEADER = "x-seedance-image-quantity";

export function getRequestedImageQuantity(request) {
  const value = request.headers.get(QUANTITY_HEADER);
  if (value === null) return DEFAULT_QUANTITY;
  const quantity = Number(value);
  return ALLOWED_QUANTITIES.has(quantity) ? quantity : DEFAULT_QUANTITY;
}

export async function preflightImageGenerationRequest(request, env = {}, options = {}) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("multipart/form-data")) {
    return json({ success: false, message: "Expected multipart form data." }, 415);
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return json({ success: false, message: "Image generation request is too large." }, 413);
  }

  const quantityValue = request.headers.get(QUANTITY_HEADER);
  if (quantityValue !== null && !ALLOWED_QUANTITIES.has(Number(quantityValue))) {
    return json({ success: false, message: "Quantity must be 1, 2, or 3." }, 400);
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
  return null;
}

export async function handleImageGenerationRequest(request, env = {}, options = {}) {
  const apiKey = String(env.TUZI_API_KEY || "").trim();
  if (!apiKey) {
    return json({ success: false, message: "Image generation is not configured." }, 503);
  }

  if (!options.skipPreflight) {
    const preflightResponse = await preflightImageGenerationRequest(request, env, options);
    if (preflightResponse) return preflightResponse;
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ success: false, message: "Invalid multipart form data." }, 400);
  }

  const fieldNames = [...new Set(form.keys())];
  const allowedFields = new Set(["prompt", "image", "quantity", "resolution", "size"]);
  if (fieldNames.some((name) => !allowedFields.has(name))) {
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

  const quantityResult = readSingleTextField(form, "quantity", String(DEFAULT_QUANTITY));
  if (!quantityResult.ok || !ALLOWED_QUANTITIES.has(Number(quantityResult.value))) {
    return json({ success: false, message: "Quantity must be 1, 2, or 3." }, 400);
  }
  const quantity = Number(quantityResult.value);
  const headerQuantity = request.headers.get(QUANTITY_HEADER);
  const hasExplicitQuantity = form.has("quantity");
  if ((headerQuantity === null && hasExplicitQuantity)
    || (headerQuantity !== null && Number(headerQuantity) !== quantity)) {
    return json({ success: false, message: "Image quantity does not match the request header." }, 400);
  }

  const resolutionResult = readSingleTextField(form, "resolution", DEFAULT_RESOLUTION);
  if (!resolutionResult.ok || !ALLOWED_RESOLUTIONS.has(resolutionResult.value)) {
    return json({ success: false, message: "Trial generation supports 1K only." }, 400);
  }

  const sizeResult = readSingleTextField(form, "size", DEFAULT_OUTPUT_SIZE);
  if (!sizeResult.ok || !ALLOWED_SIZES.has(sizeResult.value)) {
    return json({ success: false, message: "Image size is not supported." }, 400);
  }
  const size = sizeResult.value;

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
    const images = await generateTuziImage({ prompt, image, quantity, size }, {
      apiKey,
      apiBase: String(env.TUZI_API_BASE || DEFAULT_API_BASE),
      fetchImpl: options.fetchImpl || fetch,
      timeoutMs: options.timeoutMs || UPSTREAM_TIMEOUT_MS
    });
    return json({
      success: true,
      mode: image ? "image-to-image" : "text-to-image",
      image: images[0],
      images
    }, 200, { "x-seedance-validated-image-count": String(images.length) });
  } catch (error) {
    const status = Number(error?.status || 502);
    return json({
      success: false,
      message: String(error?.message || "Image provider request failed.")
    }, status);
  }
}

export async function generateTuziImage({
  prompt,
  image,
  quantity = DEFAULT_QUANTITY,
  size = DEFAULT_OUTPUT_SIZE
}, {
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
    body.set("n", String(quantity));
    body.set("quality", PROVIDER_QUALITY);
    body.set("size", size);
    body.set("response_format", "b64_json");
  } else {
    path = "/v1/images/generations";
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({
      model: MODEL_ID,
      prompt,
      n: quantity,
      quality: PROVIDER_QUALITY,
      size,
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
  const images = items.flatMap((item) => {
    if (item?.url) {
      const safeUrl = normalizeHttpsUrl(item.url);
      return safeUrl ? [{ url: safeUrl }] : [];
    }
    const encoded = item?.b64_json || item?.b64;
    const imageData = encoded ? normalizeBase64Image(encoded) : null;
    return imageData ? [imageData] : [];
  });
  if (!images.length) throw providerError("Image provider returned no usable image.", 502);
  if (images.length !== quantity) {
    throw providerError("Image provider did not return the requested number of images.", 502);
  }
  return images;
}

function normalizeBase64Image(value) {
  const encoded = String(value || "");
  if (!encoded || encoded.length % 4 !== 0 || !/^[a-z0-9+/]*={0,2}$/i.test(encoded)) return null;
  let binary;
  try {
    binary = atob(encoded);
  } catch {
    return null;
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const mime = detectImageMime(bytes);
  return mime ? { dataUrl: `data:${mime};base64,${encoded}` } : null;
}

function detectImageMime(bytes) {
  if (bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 12
    && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }
  return "";
}

function readSingleTextField(form, name, fallback) {
  const values = form.getAll(name);
  if (!values.length) return { ok: true, value: fallback };
  if (values.length !== 1 || typeof values[0] !== "string") return { ok: false, value: fallback };
  return { ok: true, value: values[0] };
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

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json;charset=UTF-8",
      "cache-control": "no-store",
      ...extraHeaders
    }
  });
}
