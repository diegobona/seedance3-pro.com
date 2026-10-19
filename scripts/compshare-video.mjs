export const COMPSHARE_FIRST_FRAME_WORKFLOW_ID = 'compshare:minimax-h3:first-frame';

const API_BASE = 'https://cp.compshare.cn/minimax/v2';
const TIMEOUT_MS = 15_000;
const MAX_SUCCESS_BYTES = 256 * 1024;
const MAX_ERROR_BYTES = 64 * 1024;
const LOCAL_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class CompshareProviderError extends Error {
  constructor(message, { code = 'COMPSHARE_PROVIDER_FAILURE', retriable = false, ambiguous = false, providerStatus, retryAfterSeconds } = {}) {
    super(message);
    this.name = 'CompshareProviderError';
    this.code = code;
    this.status = code === 'COMPSHARE_CONFIGURATION_ERROR' ? 503 : 502;
    this.retriable = retriable;
    this.ambiguous = ambiguous;
    if (providerStatus !== undefined) this.providerStatus = providerStatus;
    if (retryAfterSeconds !== undefined) this.retryAfterSeconds = retryAfterSeconds;
  }
}

function configurationError(retriable = false) {
  return new CompshareProviderError('CompShare configuration or request is invalid.', { code: 'COMPSHARE_CONFIGURATION_ERROR', retriable });
}

function readKey(options, query = false) {
  const key = typeof options.apiKey === 'string' ? options.apiKey.trim() : '';
  if (!key || /[\r\n]/.test(key)) throw configurationError(query);
  return key;
}

function validTaskId(value) {
  if (typeof value !== 'string' || !value.length || value.length > 256
    || value !== value.trim() || /[\x00-\x1f\x7f]/.test(value) || value === '.' || value === '..') return false;
  try { encodeURIComponent(value); return true; } catch { return false; }
}

function httpsUrl(value, mp4 = false) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash
      || (mp4 && !url.pathname.toLowerCase().endsWith('.mp4'))) return '';
    return url.href;
  } catch { return ''; }
}

export function assertCompshareVideoPayload(payload, { requireReferenceUrl = true } = {}) {
  const references = payload?.referenceImageUrls;
  const ids = payload?.referenceImageIds;
  if (typeof payload?.prompt !== 'string' || !payload.prompt.trim() || payload.prompt.length > 7000
    || ![5, 10, 15].includes(payload.duration) || payload.resolution !== '480p'
    || !['16:9', '9:16'].includes(payload.aspectRatio)
    || (ids !== undefined && (!Array.isArray(ids) || ids.length !== 1))
    || (references !== undefined && (!Array.isArray(references) || references.length !== 1 || !imageSource(references[0])))
    || (requireReferenceUrl ? !references : !references && !ids)) {
    throw configurationError();
  }
}

function imageSource(value) {
  if (httpsUrl(value)) return true;
  if (typeof value !== 'string' || value.length > Math.ceil(10 * 1024 * 1024 / 3) * 4 + 64) return false;
  const prefix = /^data:image\/(?:png|jpeg|webp);base64,/.exec(value)?.[0];
  if (!prefix) return false;
  const bytes = value.slice(prefix.length);
  return bytes.length > 0 && bytes.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(bytes);
}

export async function submitCompshareVideoTask(payload, options = {}) {
  const key = readKey(options);
  assertCompshareVideoPayload(payload);
  if (typeof options.localTaskId !== 'string' || !LOCAL_UUID.test(options.localTaskId)) throw configurationError();
  const response = await request('/video_generation', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json', 'Idempotency-Key': `seedance-video:${options.localTaskId}` },
    body: JSON.stringify({ model: 'MiniMax-H3', content: [
      { type: 'text', text: payload.prompt },
      { type: 'image_url', image_url: { url: payload.referenceImageUrls[0] }, role: 'first_frame' },
    ], resolution: '480P', duration: payload.duration, ratio: payload.aspectRatio, use_context_ir: true }),
  }, options, false);
  let result;
  try { result = await readJson(response, MAX_SUCCESS_BYTES); }
  catch { throw submissionUnknown(response.status); }
  if (!validTaskId(result?.task_id)) throw submissionUnknown(response.status);
  return { providerTaskId: result.task_id };
}

export async function queryCompshareVideoTask(providerTaskId, options = {}) {
  const key = readKey(options, true);
  if (!validTaskId(providerTaskId)) throw configurationError();
  const response = await request(`/query/video_generation/${encodeURIComponent(providerTaskId)}`, {
    method: 'GET', headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
  }, options, true);
  let result;
  try { result = await readJson(response, MAX_SUCCESS_BYTES); }
  catch (error) {
    throw new CompshareProviderError('CompShare returned an invalid response.', { providerStatus: response.status, retriable: error instanceof ResponseReadError });
  }
  const task = result?.task;
  if (task?.id !== providerTaskId || typeof task?.status !== 'string' || !task.status.trim()) {
    throw new CompshareProviderError('CompShare returned an invalid task response.', { providerStatus: response.status });
  }
  switch (task.status) {
    case 'queued': return { status: 'queued', terminal: false };
    case 'running': return { status: 'running', terminal: false };
    case 'failed':
    case 'cancelled': return { status: 'failed', terminal: true };
    case 'succeeded': {
      const videoUrl = httpsUrl(task.content?.url, true);
      if (!videoUrl) throw new CompshareProviderError('CompShare returned an unusable result.', { providerStatus: response.status });
      return { status: 'succeeded', terminal: true, videoUrl };
    }
    default: return { status: 'unknown', terminal: false, retriable: true };
  }
}

function submissionUnknown(providerStatus) {
  return new CompshareProviderError('CompShare submission could not be confirmed.', { code: 'COMPSHARE_SUBMISSION_UNKNOWN', ambiguous: true, providerStatus });
}

async function request(path, init, options, query) {
  let response;
  try {
    response = await (options.fetchImpl || fetch)(`${API_BASE}${path}`, {
      ...init, redirect: 'manual', signal: (options.signalFactory || AbortSignal.timeout)(TIMEOUT_MS),
    });
  } catch {
    if (!query) throw submissionUnknown();
    throw new CompshareProviderError('CompShare request could not be completed.', { retriable: true });
  }
  if (!response.ok) {
    // Consume only a bounded body. Never include upstream text, URLs or credentials in errors.
    try { await readBytes(response, MAX_ERROR_BYTES); } catch { /* Generic status below. */ }
    const retriable = query && ([401, 403, 408, 425, 429].includes(response.status) || response.status >= 500);
    throw new CompshareProviderError('CompShare request failed.', {
      retriable, providerStatus: response.status,
      ...(retriable ? { retryAfterSeconds: retryAfter(response.headers.get('retry-after')) } : {}),
    });
  }
  return response;
}

function retryAfter(value) {
  if (value === null || !/^\d+$/.test(value.trim())) return undefined;
  const seconds = Number(value);
  return Number.isSafeInteger(seconds) && seconds >= 0 && seconds <= 86_400 ? seconds : undefined;
}

class ResponseReadError extends Error {}

async function readBytes(response, limit) {
  if (Number(response.headers.get('content-length')) > limit) {
    try { await response.body?.cancel(); } catch { /* Do not leak stream errors. */ }
    throw new Error('Response too large');
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      let chunk;
      try { chunk = await reader.read(); } catch { throw new ResponseReadError(); }
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > limit) {
        try { await reader.cancel(); } catch { /* Bound bytes even if cancellation fails. */ }
        throw new Error('Response too large');
      }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

async function readJson(response, limit) {
  return JSON.parse(new TextDecoder().decode(await readBytes(response, limit)));
}
