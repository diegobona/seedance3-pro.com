/**
 * Six first attempts using the existing adapter. Default is read-only dry-run.
 *
 * node scripts/generate-pose-cases.mjs --manifest media/.../cases.json --billing .pose-case-run/billing.json
 * Add --execute --case crossed-arms-front --env-file /explicit/path/.env.local to submit ONE request.
 *
 * Manifest: {schemaVersion:1,cases:[{id,reference:{file,sha256},prompt,settings}]}.
 * Reference file paths are relative to the manifest directory. IDs and settings are fixed below.
 * Billing: {schemaVersion:1,currency:'USD',budgetUsd:1,verified:true,maxRequestUsd:number,
 *   group,proofSource,verifiedAt:ISO,credentialSha256,settings}. The maximum must cover all
 * request charges, including any input-image charge, for the verified credential/group.
 * Store billing and the ledger outside published assets. No ledger reset/retry command exists.
 * A crash, missing outcome, URL response, or any failure after reservation stops further work.
 * The ledger's reserved amount is a conservative ceiling, never a claim of actual expenditure.
 */
import { createHash, randomUUID } from 'node:crypto';
import { File } from 'node:buffer';
import { mkdir, open, readFile, realpath, rename, stat, unlink } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generateTuziImage } from './tuzi-image.mjs';

const CASE_IDS = Object.freeze(['crossed-arms-front', 'crossed-arms-low', 'kneeling-three-quarter', 'kneeling-high', 'jogging-side', 'jogging-three-quarter']);
const SETTINGS = Object.freeze({ endpoint: 'https://api.tu-zi.com/v1/images/edits', model: 'gpt-image-2', quality: 'medium', n: 1, size: '1024x1024', response_format: 'b64_json', seed: null });
const BUDGET_MICROS = 1_000_000;
const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;
const DEFAULT_LEDGER_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../.pose-case-run');
const HASH = /^[a-f0-9]{64}$/;
const digest = value => createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();

function fail(code, message) {
  const error = new Error(message);
  error.safeCode = code;
  throw error;
}

function inside(parent, child) {
  const path = relative(parent, child);
  return path !== '' && !path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path);
}

async function jsonFile(path, description) {
  if (typeof path !== 'string' || !path) fail('MISSING_CONFIG', `${description} path is required.`);
  try {
    if ((await stat(path)).size > 1024 * 1024) throw new Error();
    const text = await readFile(path, 'utf8');
    return { value: JSON.parse(text), sha256: digest(text) };
  } catch { fail('INVALID_CONFIG', `${description} is missing, too large, or invalid JSON.`); }
}

function fixedSettings(value) {
  if (!value || Object.keys(value).length !== Object.keys(SETTINGS).length
    || Object.entries(SETTINGS).some(([key, expected]) => value[key] !== expected)) {
    fail('INVALID_SETTINGS', 'Settings must exactly match the fixed endpoint, model, medium quality, n=1, 1024x1024, b64_json and omitted seed (null).');
  }
}

function pngDimensions(bytes) {
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || bytes.toString('ascii', 12, 16) !== 'IHDR' || bytes.readUInt32BE(8) !== 13
    || bytes.readUInt32BE(16) === 0 || bytes.readUInt32BE(20) === 0) {
    fail('UNSUPPORTED_OUTPUT', 'An intact PNG image is required; no conversion or external download was attempted.');
  }
  let offset = 8;
  let hasImageData = false;
  let hasEnd = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const end = offset + 12 + length;
    if (end > bytes.length) break;
    if (type === 'IDAT' && length > 0) hasImageData = true;
    if (type === 'IEND') { hasEnd = length === 0 && end === bytes.length; break; }
    offset = end;
  }
  if (!hasImageData || !hasEnd) fail('UNSUPPORTED_OUTPUT', 'PNG data is truncated or missing its complete image/end chunks.');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function prepare(manifestPath, billingPath, caseId) {
  if (caseId !== undefined && !CASE_IDS.includes(caseId)) fail('UNKNOWN_CASE', 'Case ID is outside the six approved cases.');
  const manifestFile = await jsonFile(manifestPath, 'Manifest');
  const billingFile = await jsonFile(billingPath, 'Billing configuration');
  const manifest = manifestFile.value;
  const billing = billingFile.value;
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.cases) || manifest.cases.length !== 6
    || new Set(manifest.cases.map(item => item.id)).size !== 6 || manifest.cases.some(item => !CASE_IDS.includes(item.id))) {
    fail('INVALID_MANIFEST', 'Manifest must contain each of the six approved case IDs exactly once.');
  }
  if (billing?.schemaVersion !== 1 || billing.currency !== 'USD' || billing.budgetUsd !== 1) {
    fail('INVALID_BUDGET', 'The authorized budget is fixed at 1 USD (one dollar).');
  }
  if (billing.verified !== true || typeof billing.maxRequestUsd !== 'number'
    || !Number.isFinite(billing.maxRequestUsd) || billing.maxRequestUsd <= 0) {
    fail('UNVERIFIED_PRICE', 'A verified, positive numeric maximum per request is required.');
  }
  if (typeof billing.group !== 'string' || !billing.group.trim()
    || typeof billing.proofSource !== 'string' || !billing.proofSource.trim()
    || typeof billing.verifiedAt !== 'string' || !Number.isFinite(Date.parse(billing.verifiedAt))
    || typeof billing.credentialSha256 !== 'string' || !HASH.test(billing.credentialSha256)) {
    fail('UNVERIFIED_PRICE', 'Verified group, proof source, verification time and credential SHA-256 are required.');
  }
  fixedSettings(billing.settings);
  // Round upward: floating-point or sub-micro-dollar prices must never under-reserve.
  const maxRequestMicros = Math.ceil(billing.maxRequestUsd * BUDGET_MICROS);
  if (!Number.isSafeInteger(maxRequestMicros) || maxRequestMicros * 6 > BUDGET_MICROS) {
    fail('OVER_BUDGET', 'The six initial requests do not fit the authorized budget.');
  }
  const assetsDir = await realpath(dirname(resolve(manifestPath)));
  if (inside(assetsDir, await realpath(billingPath))) fail('PUBLIC_BILLING', 'Billing proof must stay outside published assets.');
  const cases = [];
  for (const item of manifest.cases) {
    fixedSettings(item.settings);
    if (typeof item.prompt !== 'string' || !item.prompt || item.prompt.trim() !== item.prompt || item.prompt.length > 2500) {
      fail('INVALID_PROMPT', 'Each full prompt must be 1–2500 characters without surrounding whitespace.');
    }
    const reference = item.reference;
    if (!reference || typeof reference.file !== 'string' || !reference.file.startsWith('references/')
      || reference.file.includes('\\') || reference.file.includes(':') || reference.file.split('/').some(part => part === '..' || part === '.')
      || !inside(assetsDir, resolve(assetsDir, reference.file))) {
      fail('INVALID_REFERENCE', 'Reference path must remain within the manifest references directory.');
    }
    let bytes;
    try {
      const target = await realpath(resolve(assetsDir, reference.file));
      if (!inside(join(assetsDir, 'references'), target) || (await stat(target)).size > 10 * 1024 * 1024) throw new Error();
      bytes = await readFile(target);
    } catch { fail('INVALID_REFERENCE', 'Reference path is missing, escapes its directory, or exceeds 10 MB.'); }
    if (typeof reference.sha256 !== 'string' || !HASH.test(reference.sha256) || digest(bytes) !== reference.sha256) {
      fail('REFERENCE_HASH_MISMATCH', 'Reference hash does not match the captured file.');
    }
    const dimensions = pngDimensions(bytes);
    cases.push({ ...item, reference: { file: reference.file, sha256: reference.sha256, ...dimensions }, bytes });
  }
  return { cases, assetsDir, manifestSha256: manifestFile.sha256, billingSha256: billingFile.sha256, billing, maxRequestMicros };
}

async function existing(path) {
  try { await stat(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function writeExclusive(path, contents) {
  const handle = await open(path, 'wx', 0o600);
  try { await handle.writeFile(contents); await handle.sync(); } finally { await handle.close(); }
}

async function saveLedger(path, ledger) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeExclusive(temporary, `${JSON.stringify(ledger, null, 2)}\n`);
  // The run lock prevents concurrent writers. Rename exposes only the complete, fsynced file.
  await rename(temporary, path);
}

async function loadLedger(path, prepared) {
  if (!(await existing(path))) return { schemaVersion: 1, budgetMicros: BUDGET_MICROS, reservedMicros: 0, manifestSha256: prepared.manifestSha256, billingSha256: prepared.billingSha256, attempts: [] };
  const ledger = (await jsonFile(path, 'Private ledger')).value;
  if (ledger?.schemaVersion !== 1 || ledger.budgetMicros !== BUDGET_MICROS || !Array.isArray(ledger.attempts)
    || !Number.isSafeInteger(ledger.reservedMicros) || ledger.reservedMicros < 0
    || new Set(ledger.attempts.map(attempt => attempt.caseId)).size !== ledger.attempts.length
    || ledger.attempts.some(attempt => !CASE_IDS.includes(attempt.caseId)
      || !['reserved', 'succeeded', 'ambiguous'].includes(attempt.status)
      || attempt.reservedMicros !== prepared.maxRequestMicros)
    || ledger.attempts.reduce((sum, attempt) => sum + attempt.reservedMicros, 0) !== ledger.reservedMicros) {
    fail('INVALID_LEDGER', 'The private ledger is inconsistent; manual reconciliation is required.');
  }
  if (ledger.manifestSha256 !== prepared.manifestSha256 || ledger.billingSha256 !== prepared.billingSha256) {
    fail('CHANGED_RUN', 'Manifest or billing configuration changed after a prior reservation.');
  }
  return ledger;
}

async function readCredential(envFile, prepared) {
  if (typeof envFile !== 'string' || !envFile) fail('MISSING_CREDENTIAL', 'Execution requires an explicit local --env-file.');
  let text;
  try { text = await readFile(envFile, 'utf8'); } catch { fail('MISSING_CREDENTIAL', 'The explicit credential file could not be read.'); }
  const matches = [...text.matchAll(/^\s*(?:export\s+)?TUZI_API_KEY\s*=\s*(.*?)\s*$/gm)];
  if (matches.length !== 1) fail('INVALID_CREDENTIAL', 'The explicit credential file must define TUZI_API_KEY exactly once.');
  let apiKey = matches[0][1];
  if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || (apiKey.startsWith("'") && apiKey.endsWith("'"))) apiKey = apiKey.slice(1, -1);
  if (!/^[A-Za-z0-9._-]{8,512}$/.test(apiKey)) fail('INVALID_CREDENTIAL', 'The explicit credential is empty or malformed.');
  if (digest(apiKey) !== prepared.billing.credentialSha256) fail('CREDENTIAL_MISMATCH', 'Credential does not match the verified billing group.');
  if (prepared.cases.some(item => item.prompt.includes(apiKey) || item.reference.file.includes(apiKey))) fail('SECRET_IN_MANIFEST', 'Manifest contains the credential and cannot be published.');
  return apiKey;
}

async function readUsage(response) {
  // Only allow numeric usage fields through. Provider messages, URLs and arbitrary payload
  // metadata are deliberately discarded, including when a successful response has an error.
  try {
    if (Number(response.headers.get('content-length')) > MAX_RESPONSE_BYTES || !response.body) return null;
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) { void reader.cancel(); return null; }
      chunks.push(value);
    }
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const usage = {};
    for (const key of ['input_tokens', 'output_tokens', 'total_tokens']) {
      if (typeof payload?.usage?.[key] === 'number' && Number.isFinite(payload.usage[key]) && payload.usage[key] >= 0) usage[key] = payload.usage[key];
    }
    return Object.keys(usage).length ? usage : null;
  } catch { return null; }
}

/** Run one explicitly selected case, or validate all six without side effects. */
export async function runPoseCase({ manifestPath, billingPath, caseId, execute = false, envFile, ledgerDir = DEFAULT_LEDGER_DIR, fetchImpl = globalThis.fetch } = {}) {
  const prepared = await prepare(manifestPath, billingPath, caseId);
  if (execute !== true) return { mode: 'dry-run', initialMaximumUsd: prepared.maxRequestMicros * 6 / BUDGET_MICROS, budgetUsd: 1, cases: prepared.cases.map(item => ({ id: item.id, reference: item.reference, settings: item.settings })) };
  if (!caseId) fail('MISSING_CASE', 'Execution requires one explicit --case ID.');
  const privateDir = resolve(ledgerDir);
  if (privateDir === prepared.assetsDir || inside(prepared.assetsDir, privateDir)) fail('PUBLIC_LEDGER', 'Private ledger must stay outside published assets.');
  await mkdir(privateDir, { recursive: true });
  if ((await realpath(privateDir)) !== privateDir) fail('UNSAFE_LEDGER', 'Private ledger path must not use symlinks.');
  const lockPath = join(privateDir, 'run.lock');
  let lock;
  try { lock = await open(lockPath, 'wx', 0o600); } catch { fail('RUN_LOCKED', 'Run lock exists or is unavailable; an execution may be in progress or need manual reconciliation.'); }
  try {
    await lock.writeFile(JSON.stringify({ createdAt: now(), caseId }));
    await lock.sync();
    const ledgerPath = join(privateDir, 'ledger.json');
    const ledger = await loadLedger(ledgerPath, prepared);
    if (ledger.attempts.some(attempt => attempt.caseId === caseId)) fail('DUPLICATE_CASE', 'This case has a prior attempt; no paid retry is allowed.');
    if (ledger.attempts.some(attempt => attempt.status !== 'succeeded')) fail('UNRESOLVED_ATTEMPT', 'An ambiguous or unresolved attempt requires manual reconciliation before proceeding.');
    if (ledger.reservedMicros + prepared.maxRequestMicros > BUDGET_MICROS) fail('OVER_BUDGET', 'Remaining budget cannot cover the next maximum request charge.');
    for (const id of CASE_IDS) {
      const hasOutput = await existing(join(prepared.assetsDir, 'outputs', `${id}.png`));
      const hasEvidence = await existing(join(prepared.assetsDir, 'attempts', `${id}.json`));
      const prior = ledger.attempts.find(attempt => attempt.caseId === id);
      if ((!prior && (hasOutput || hasEvidence)) || (prior && (!hasOutput || !hasEvidence))) {
        fail('ORPHANED_EVIDENCE', 'Prior output/evidence and private ledger disagree; manual reconciliation is required.');
      }
    }
    const apiKey = await readCredential(envFile, prepared);
    const selected = prepared.cases.find(item => item.id === caseId);
    for (const directory of ['outputs', 'attempts']) {
      const target = join(prepared.assetsDir, directory);
      await mkdir(target, { recursive: true });
      if ((await realpath(target)) !== target) fail('UNSAFE_OUTPUT', 'Output and evidence directories must not use symlinks.');
    }
    const attempt = { caseId, status: 'reserved', reservedMicros: prepared.maxRequestMicros, reservedAt: now() };
    ledger.attempts.push(attempt);
    ledger.reservedMicros += prepared.maxRequestMicros;
    await saveLedger(ledgerPath, ledger);
    const evidence = { schemaVersion: 1, caseId, status: 'reserved', attemptNumber: 1, source: 'developer-api-with-live-editor-reference', prompt: selected.prompt, reference: selected.reference, settings: SETTINGS, reservedMaximumUsd: prepared.maxRequestMicros / BUDGET_MICROS, reservedAt: attempt.reservedAt, requestStartedAt: null, requestFinishedAt: null, httpStatus: null, requestId: null, usage: null, output: null };
    let usagePromise = Promise.resolve(null);
    try {
      const images = await generateTuziImage({ prompt: selected.prompt, image: new File([selected.bytes], basename(selected.reference.file), { type: 'image/png' }), quantity: 1, size: SETTINGS.size }, {
        apiKey, apiBase: 'https://api.tu-zi.com', fetchImpl: async (url, init) => {
          // Check the adapter's actual wire fields against the verified billing settings.
          if (url !== SETTINGS.endpoint || init.method !== 'POST' || !(init.body instanceof FormData)
            || [...init.body.keys()].sort().join(',') !== 'image,model,n,prompt,quality,response_format,size'
            || ['model', 'quality', 'size', 'response_format'].some(key => init.body.get(key) !== SETTINGS[key])
            || init.body.get('n') !== '1' || init.body.get('prompt') !== selected.prompt) {
            fail('ADAPTER_MISMATCH', 'Adapter request does not match the verified settings.');
          }
          evidence.requestStartedAt = now();
          const response = await fetchImpl(url, { ...init, redirect: 'error' });
          evidence.httpStatus = response.status;
          const requestId = response.headers.get('x-request-id') || response.headers.get('request-id');
          if (requestId && /^[A-Za-z0-9_-]{1,100}$/.test(requestId) && !requestId.includes(apiKey)) evidence.requestId = requestId;
          usagePromise = readUsage(response.clone());
          return response;
        }
      });
      if (images.length !== 1 || typeof images[0].dataUrl !== 'string' || !images[0].dataUrl.startsWith('data:image/png;base64,')) {
        fail('UNSUPPORTED_OUTPUT', 'Provider returned a URL or non-PNG output; it was not downloaded or converted.');
      }
      const bytes = Buffer.from(images[0].dataUrl.slice('data:image/png;base64,'.length), 'base64');
      const dimensions = pngDimensions(bytes);
      const outputFile = `outputs/${caseId}.png`;
      await writeExclusive(join(prepared.assetsDir, outputFile), bytes);
      evidence.output = { file: outputFile, sha256: digest(bytes), bytes: bytes.length, ...dimensions };
      evidence.status = 'succeeded';
    } catch (error) {
      evidence.status = 'ambiguous';
      evidence.errorCode = ['UNSUPPORTED_OUTPUT', 'ADAPTER_MISMATCH'].includes(error.safeCode) ? error.safeCode : 'PROVIDER_OR_STORAGE_FAILURE';
      evidence.error = 'Potentially billed attempt. Reserved maximum retained. No automatic retry; inspect provider billing before taking further action.';
    }
    evidence.requestFinishedAt = now();
    evidence.usage = await usagePromise;
    // If evidence persistence fails the ledger stays reserved, deliberately blocking all new work.
    await writeExclusive(join(prepared.assetsDir, 'attempts', `${caseId}.json`), `${JSON.stringify(evidence, null, 2)}\n`);
    attempt.status = evidence.status;
    attempt.finishedAt = evidence.requestFinishedAt;
    attempt.httpStatus = evidence.httpStatus;
    attempt.requestId = evidence.requestId;
    await saveLedger(ledgerPath, ledger);
    return { mode: 'execute', caseId, status: evidence.status, errorCode: evidence.errorCode, reservedMaximumUsd: ledger.reservedMicros / BUDGET_MICROS, remainingMaximumUsd: (BUDGET_MICROS - ledger.reservedMicros) / BUDGET_MICROS, output: evidence.output };
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}

export async function main(args = process.argv.slice(2)) {
  const options = {};
  const names = { '--manifest': 'manifestPath', '--billing': 'billingPath', '--case': 'caseId', '--env-file': 'envFile' };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--execute' && options.execute === undefined) { options.execute = true; continue; }
    if (arg === '--dry-run' && options.execute === undefined) { options.execute = false; continue; }
    const key = names[arg];
    if (!key || options[key] !== undefined || !args[i + 1] || args[i + 1].startsWith('--')) fail('INVALID_ARGUMENT', 'Use --manifest FILE --billing FILE; execution also requires --execute --case ID --env-file FILE.');
    options[key] = args[++i];
  }
  return runPoseCase(options);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await main();
    console.log(JSON.stringify(result, null, 2));
    if (result.status === 'ambiguous') process.exitCode = 2;
  } catch (error) {
    // Never print raw provider, filesystem or credential-file errors.
    console.error(JSON.stringify({ error: error.safeCode || 'LOCAL_FAILURE', message: error.safeCode ? error.message : 'Local operation failed. Inspect the private ledger before proceeding.' }));
    process.exitCode = 1;
  }
}
