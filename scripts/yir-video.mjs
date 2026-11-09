// https://yir.ai/docs/reference/videos/submit-video-generation
// https://yir.ai/docs/reference/jobs/get-job
import { validGuestVideoInput } from '../app/guest-video-input.mjs';
import { normalizeReferenceMentions } from '../app/reference-mentions.mjs';
const API_BASE = 'https://gateway.yir.ai';
const MAX_RESPONSE_BYTES = 1024 * 1024;
export const YIR_TEXT_WORKFLOW_ID = 'yir:minimax-h3:metaso:text-to-video';
export const YIR_IMAGE_WORKFLOW_ID = 'yir:minimax-h3:metaso:image-to-video';

export class YirVideoError extends Error {
  constructor(message, { code = 'YIR_PROVIDER_FAILURE', ambiguous = false, retriable = false, providerStatus } = {}) {
    super(message);
    this.name = 'YirVideoError'; this.code = code; this.ambiguous = ambiguous;
    this.retriable = retriable; this.providerStatus = providerStatus;
  }
}

function inputError(message = 'Guest Yir videos require 5 seconds at 768p: up to 5 reference images, or a first frame with an optional last frame.') {
  return new YirVideoError(message, { code: 'YIR_INPUT_ERROR' });
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
export async function areYirReferencesReachable(urls, { fetchImpl = fetch } = {}) {
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

export function buildYirVideoRequest(payload) {
  const references = payload.referenceImageUrls ?? [];
  if (payload.duration !== 5 || payload.resolution !== '768p' || !['16:9','9:16','1:1'].includes(payload.aspectRatio)
    || typeof payload.prompt !== 'string' || !payload.prompt.trim() || payload.prompt.length > 20_000
    || !validGuestVideoInput(payload.inputMode, references.length) || references.some(url => !publicHttpsUrl(url))) throw inputError();
  if (payload.referenceImageIds?.length && references.length !== payload.referenceImageIds.length) throw inputError('Reference image is not ready.');
  return { model: 'minimax/minimax-h3', routing: { only: ['metaso'], fallback: false },
    input: { type: references.length ? payload.inputMode === 'reference' ? 'reference' : 'image' : 'text', prompt: payload.inputMode === 'reference' ? normalizeReferenceMentions(payload.prompt, references.length) : payload.prompt,
      ...(references.length ? { references: references.map((url, index) => ({
        role: payload.inputMode === 'reference' ? 'reference_image' : index === 0 ? 'first_frame' : 'last_frame', url,
      })) } : {}) },
    parameters: { duration: 5, resolution: '768P', aspect_ratio: references.length ? 'adaptive' : payload.aspectRatio,
      generate_audio: true, n: 1 } };
}

function apiKey(value, forQuery = false) {
  if (typeof value !== 'string' || !value.trim() || /[\r\n]/.test(value)) {
    throw new YirVideoError('Yir is not configured.', { code: 'YIR_CONFIGURATION_ERROR', retriable: forQuery });
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
    if (error instanceof YirVideoError) throw error;
    throw new YirVideoError('Yir request could not be confirmed.', { ambiguous: !query, retriable: query });
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new YirVideoError('Yir request failed.', {
      providerStatus: response.status, retriable: query,
      ambiguous: !query && ([408,409,425].includes(response.status) || response.status >= 500),
    });
  }
  try { return await readJson(response); }
  catch { throw new YirVideoError('Yir returned an unusable response.', { ambiguous: !query, retriable: query }); }
}

export async function submitYirVideoTask(payload, options = {}) {
  apiKey(options.apiKey);
  if (!/^[a-zA-Z0-9-]{1,128}$/.test(options.localTaskId ?? '')) throw inputError('A stable task identifier is required.');
  const body = buildYirVideoRequest(payload);
  const result = await request('/v1/videos/generations', { method: 'POST', headers: {
    'Content-Type': 'application/json', 'Idempotency-Key': `seedance-video:${options.localTaskId}`,
  }, body: JSON.stringify(body) }, options);
  const id = result?.id;
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,256}$/.test(id)) {
    throw new YirVideoError('Yir task could not be identified.', { ambiguous: true });
  }
  return { providerTaskId: id };
}

export async function queryYirVideoTask(taskId, options = {}) {
  if (typeof taskId !== 'string' || !/^[a-zA-Z0-9_-]{1,256}$/.test(taskId)) throw inputError('Invalid task identifier.');
  const result = await request(`/v1/jobs/${encodeURIComponent(taskId)}`, { method: 'GET' }, options, true);
  const generation = result;
  if (['queued', 'running', 'delivering'].includes(generation?.status)) return { status: 'running', terminal: false };
  if (['failed','cancelled'].includes(generation?.status)) return {
    status: 'failed', terminal: true,
    // Preserve the cost reservation: a failed job may still be billed by Yir.
  };
  if (generation?.status === 'succeeded') {
    const asset = generation.result?.files?.find(asset => asset.media_type?.startsWith('video/') && publicHttpsUrl(asset.url));
    if (!asset) throw new YirVideoError('Yir video result is unavailable.', { retriable: true });
    return { status: 'succeeded', terminal: true, videoUrl: asset.url };
  }
  return { status: 'unknown', terminal: false };
}
