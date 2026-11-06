// SeeAPI API docs: https://www.seeapi.com/docs/minimax-h3-max-turbo/text-to-video/
// https://www.seeapi.com/docs/minimax-h3-max-turbo/image-to-video/
// https://www.seeapi.com/docs/get-task-detail/
const API_BASE = 'https://api.seeapi.com';
const MAX_RESPONSE_BYTES = 1024 * 1024;
export const SEEAPI_TEXT_WORKFLOW_ID = 'seeapi:minimax-h3-max-turbo:text-to-video';
export const SEEAPI_IMAGE_WORKFLOW_ID = 'seeapi:minimax-h3-max-turbo:image-to-video';

export class SeeApiVideoError extends Error {
  constructor(message, { code = 'SEEAPI_PROVIDER_FAILURE', ambiguous = false, retriable = false, providerStatus } = {}) {
    super(message);
    this.name = 'SeeApiVideoError'; this.code = code; this.ambiguous = ambiguous;
    this.retriable = retriable; this.providerStatus = providerStatus;
  }
}

function inputError(message = 'Guest SeeAPI videos require 5 seconds at 768p and at most one reference image.') {
  return new SeeApiVideoError(message, { code: 'SEEAPI_INPUT_ERROR' });
}

function publicHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash
      && !/^(?:localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|\[)/i.test(url.hostname)
      && url.hostname.includes('.');
  } catch { return false; }
}

// Local tunnels can expire while the app keeps running. Check the actual image
// response before reserving credits or sending a generation to the supplier.
export async function areSeeApiReferencesReachable(urls, { fetchImpl = fetch } = {}) {
  for (const url of urls) {
    if (!publicHttpsUrl(url)) return false;
    let reader;
    try {
      const response = await fetchImpl(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(30_000) });
      const type = response.headers.get('content-type')?.split(';')[0].trim();
      if (!response.ok || !['image/png', 'image/jpeg', 'image/webp'].includes(type) || !response.body) {
        await response.body?.cancel(); return false;
      }
      reader = response.body.getReader();
      const prefix = new Uint8Array(12); let count = 0; let length = 0;
      while (true) {
        const part = await reader.read(); if (part.done) break;
        length += part.value.length;
        if (length > 10 * 1024 * 1024) return false;
        const take = Math.min(part.value.length, prefix.length - count);
        prefix.set(part.value.subarray(0, take), count); count += take;
      }
      const valid = count === 12 && (type === 'image/png'
        ? [137,80,78,71,13,10,26,10].every((byte, index) => prefix[index] === byte)
        : type === 'image/jpeg' ? prefix[0] === 255 && prefix[1] === 216 && prefix[2] === 255
        : new TextDecoder().decode(prefix.subarray(0, 4)) === 'RIFF' && new TextDecoder().decode(prefix.subarray(8, 12)) === 'WEBP');
      if (!valid) return false;
    } catch { return false; }
    finally { await reader?.cancel().catch(() => {}); reader?.releaseLock(); }
  }
  return true;
}

export function buildSeeApiVideoRequest(payload) {
  const references = payload.referenceImageUrls ?? [];
  if (payload.duration !== 5 || payload.resolution !== '768p' || !['16:9','9:16','1:1'].includes(payload.aspectRatio)
    || typeof payload.prompt !== 'string' || !payload.prompt.trim() || payload.prompt.length > 50_000
    || references.length > 1 || references.some(url => !publicHttpsUrl(url))) throw inputError();
  if (payload.referenceImageIds?.length && references.length !== payload.referenceImageIds.length) throw inputError('Reference image is not ready.');
  return { model: 'minimax-h3-max-turbo', endpoint: references.length ? 'image-to-video' : 'text-to-video', provider: 'fal', input: {
    prompt: payload.prompt, duration_seconds: 5, resolution: '768P', prompt_expansion_mode: 'balanced',
    ...(references.length ? { first_frame_image: references[0] } : { aspect_ratio: payload.aspectRatio }),
  } };
}

function apiKey(value, forQuery = false) {
  if (typeof value !== 'string' || !value.trim() || /[\r\n]/.test(value)) {
    throw new SeeApiVideoError('SeeAPI is not configured.', { code: 'SEEAPI_CONFIGURATION_ERROR', retriable: forQuery });
  }
  return value.trim();
}

async function readJson(response) {
  if (Number(response.headers.get('content-length')) > MAX_RESPONSE_BYTES) {
    await response.body?.cancel(); throw Error('Response too large');
  }
  if (!response.body) throw Error('Empty response');
  const reader = response.body.getReader(); const chunks = []; let length = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      length += part.value.length;
      if (length > MAX_RESPONSE_BYTES) { await reader.cancel(); throw Error('Response too large'); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function request(path, init, options, query = false) {
  let response;
  try {
    response = await (options.fetchImpl ?? fetch)(API_BASE + path, {
      ...init, headers: { ...init.headers, Authorization: `Bearer ${apiKey(options.apiKey, query)}` },
      redirect: 'manual', signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    if (error instanceof SeeApiVideoError) throw error;
    throw new SeeApiVideoError('SeeAPI request could not be confirmed.', { ambiguous: !query, retriable: query });
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new SeeApiVideoError('SeeAPI request failed.', {
      providerStatus: response.status, retriable: query,
      ambiguous: !query && ([408,409,425].includes(response.status) || response.status >= 500),
    });
  }
  try { return await readJson(response); }
  catch { throw new SeeApiVideoError('SeeAPI returned an unusable response.', { ambiguous: !query, retriable: query }); }
}

export async function submitSeeApiVideoTask(payload, options = {}) {
  apiKey(options.apiKey);
  if (!/^[a-zA-Z0-9-]{1,128}$/.test(options.localTaskId ?? '')) throw inputError('A stable task identifier is required.');
  const body = buildSeeApiVideoRequest(payload);
  const result = await request('/v1/generations', { method: 'POST', headers: {
    'Content-Type': 'application/json', 'Idempotency-Key': `seedance-video:${options.localTaskId}`,
  }, body: JSON.stringify(body) }, options);
  const id = result?.generation?.id;
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,256}$/.test(id)) {
    throw new SeeApiVideoError('SeeAPI task could not be identified.', { ambiguous: true });
  }
  return { providerTaskId: id };
}

export async function querySeeApiVideoTask(taskId, options = {}) {
  if (typeof taskId !== 'string' || !/^[a-zA-Z0-9_-]{1,256}$/.test(taskId)) throw inputError('Invalid task identifier.');
  const result = await request(`/v1/generations/${encodeURIComponent(taskId)}`, { method: 'GET' }, options, true);
  const generation = result?.generation;
  if (generation?.status === 'processing') return { status: 'running', terminal: false };
  if (['failed','canceled','refunded','expired'].includes(generation?.status)) return {
    status: 'failed', terminal: true,
    ...(generation.consumed_credits === 0 ? { freeCostRefundable: true } : {}),
  };
  if (generation?.status === 'succeeded') {
    const asset = generation.result?.assets?.find(asset => asset.type === 'video' && publicHttpsUrl(asset.url));
    if (!asset) throw new SeeApiVideoError('SeeAPI video result is unavailable.', { retriable: true });
    return { status: 'succeeded', terminal: true, videoUrl: asset.url };
  }
  return { status: 'unknown', terminal: false };
}
