import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main, runPoseCase } from '../scripts/generate-pose-cases.mjs';

const IDS = ['crossed-arms-front', 'crossed-arms-low', 'kneeling-three-quarter', 'kneeling-high', 'jogging-side', 'jogging-three-quarter'];
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6XIoAAAAASUVORK5CYII=', 'base64');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const SETTINGS = { endpoint: 'https://api.tu-zi.com/v1/images/edits', model: 'gpt-image-2', quality: 'medium', n: 1, size: '1024x1024', response_format: 'b64_json', seed: null };

async function fixture(t, maxRequestUsd = 0.15) {
  const directory = await mkdtemp(join(tmpdir(), 'pose-case-budget-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const assets = join(directory, 'media');
  await mkdir(join(assets, 'references'), { recursive: true });
  await writeFile(join(assets, 'references', 'reference.png'), PNG);
  const manifest = { schemaVersion: 1, cases: IDS.map(id => ({ id, reference: { file: 'references/reference.png', sha256: sha256(PNG) }, prompt: 'Use the attached pose. A full-body studio portrait.', settings: { ...SETTINGS } })) };
  const billing = { schemaVersion: 1, currency: 'USD', budgetUsd: 1, verified: true, maxRequestUsd, group: 'verified-test-group', proofSource: 'local:test-pricing-evidence', verifiedAt: '2026-09-22T00:00:00.000Z', credentialSha256: sha256('sk-test-never-network-000'), settings: { ...SETTINGS } };
  const options = { manifestPath: join(assets, 'cases.json'), billingPath: join(directory, 'billing.json'), ledgerDir: join(directory, '.pose-case-run'), envFile: join(directory, '.env.test'), caseId: IDS[0], execute: true };
  await writeFile(options.manifestPath, JSON.stringify(manifest));
  await writeFile(options.billingPath, JSON.stringify(billing));
  await writeFile(options.envFile, 'TUZI_API_KEY=sk-test-never-network-000\n');
  return { directory, assets, manifest, billing, options, saveManifest: () => writeFile(options.manifestPath, JSON.stringify(manifest)), saveBilling: () => writeFile(options.billingPath, JSON.stringify(billing)) };
}

const imageResponse = () => new Response(JSON.stringify({ data: [{ b64_json: PNG.toString('base64') }], usage: { input_tokens: 12, output_tokens: 34, total_tokens: 46 }, private_value: 'do-not-publish' }), { status: 200, headers: { 'content-type': 'application/json', 'x-request-id': 'req-test-001' } });

test('dry-run validates six references without opening a missing credential or calling fetch', async t => {
  const f = await fixture(t);
  const result = await runPoseCase({ ...f.options, execute: false, envFile: join(f.directory, 'missing.env'), fetchImpl: () => assert.fail('dry-run attempted a network call') });
  assert.equal(result.mode, 'dry-run');
  assert.equal(result.initialMaximumUsd, 0.9);
  assert.equal(result.cases.length, 6);
  assert.deepEqual((await readdir(f.directory)).sort(), ['.env.test', 'billing.json', 'media']);
});

test('six requests must fit the fixed one-dollar cap before any reservation or network call', async t => {
  const f = await fixture(t, 0.166667);
  await assert.rejects(runPoseCase({ ...f.options, fetchImpl: () => assert.fail('budget overflow reached network') }), /six.*budget/i);
  f.billing.maxRequestUsd = '0.10';
  await f.saveBilling();
  await assert.rejects(runPoseCase({ ...f.options, execute: false }), /numeric/i);
  f.billing.maxRequestUsd = 0.1;
  f.billing.budgetUsd = 2;
  await f.saveBilling();
  await assert.rejects(runPoseCase({ ...f.options, execute: false }), /one dollar|1 USD/i);
});

test('a request is durably reserved before fetch and preserves exact first PNG and safe evidence', async t => {
  const f = await fixture(t);
  let calls = 0;
  const result = await runPoseCase({ ...f.options, fetchImpl: async (url, init) => {
    calls++;
    const ledger = JSON.parse(await readFile(join(f.options.ledgerDir, 'ledger.json'), 'utf8'));
    assert.equal(ledger.reservedMicros, 150000);
    assert.equal(ledger.attempts[0].status, 'reserved');
    assert.equal(url, SETTINGS.endpoint);
    assert.equal(init.redirect, 'error');
    assert.equal(init.body.get('quality'), 'medium');
    assert.equal(init.body.get('n'), '1');
    assert.equal(init.body.get('model'), 'gpt-image-2');
    return imageResponse();
  } });
  assert.equal(calls, 1);
  assert.equal(result.status, 'succeeded');
  assert.deepEqual(await readFile(join(f.assets, 'outputs', `${IDS[0]}.png`)), PNG);
  const evidenceText = await readFile(join(f.assets, 'attempts', `${IDS[0]}.json`), 'utf8');
  const evidence = JSON.parse(evidenceText);
  assert.equal(evidence.prompt, f.manifest.cases[0].prompt);
  assert.equal(evidence.reference.sha256, sha256(PNG));
  assert.equal(evidence.output.sha256, sha256(PNG));
  assert.equal(evidence.httpStatus, 200);
  assert.equal(evidence.requestId, 'req-test-001');
  assert.equal(evidence.usage.total_tokens, 46);
  assert.doesNotMatch(evidenceText, /sk-test|do-not-publish/);
  await assert.rejects(runPoseCase({ ...f.options, fetchImpl: () => assert.fail('duplicate reached network') }), /prior attempt|already attempted/i);
});

test('ambiguous timeout retains reservation, publishes a sanitized failure and blocks another attempt', async t => {
  const f = await fixture(t);
  const result = await runPoseCase({ ...f.options, fetchImpl: async () => { throw new Error('sk-test-never-network-000 https://asset.invalid/image?signature=SECRET'); } });
  assert.equal(result.status, 'ambiguous');
  const ledger = JSON.parse(await readFile(join(f.options.ledgerDir, 'ledger.json'), 'utf8'));
  assert.equal(ledger.reservedMicros, 150000);
  assert.equal(ledger.attempts[0].status, 'ambiguous');
  const publicEvidence = await readFile(join(f.assets, 'attempts', `${IDS[0]}.json`), 'utf8');
  assert.doesNotMatch(publicEvidence, /sk-test|signature|SECRET|asset\.invalid/);
  await assert.rejects(runPoseCase({ ...f.options, caseId: IDS[1], fetchImpl: () => assert.fail('unresolved run reached network') }), /ambiguous|unresolved/i);
});

test('URL responses are never fetched or recorded and retain potentially billed cost', async t => {
  const f = await fixture(t);
  let calls = 0;
  const result = await runPoseCase({ ...f.options, fetchImpl: async () => {
    calls++;
    return new Response(JSON.stringify({ data: [{ url: 'https://asset.invalid/image.png?signature=SECRET' }] }));
  } });
  assert.equal(calls, 1);
  assert.equal(result.status, 'ambiguous');
  assert.equal(result.errorCode, 'UNSUPPORTED_OUTPUT');
  assert.doesNotMatch(await readFile(join(f.assets, 'attempts', `${IDS[0]}.json`), 'utf8'), /asset\.invalid|signature|SECRET/);
});

test('concurrent processes cannot submit a second request while one holds the run lock', async t => {
  const f = await fixture(t);
  let release, entered;
  const inFetch = new Promise(resolve => { entered = resolve; });
  const barrier = new Promise(resolve => { release = resolve; });
  const first = runPoseCase({ ...f.options, fetchImpl: async () => { entered(); await barrier; return imageResponse(); } });
  await inFetch;
  try {
    await assert.rejects(runPoseCase({ ...f.options, caseId: IDS[1], fetchImpl: () => assert.fail('parallel request reached network') }), /lock|in progress/i);
  } finally { release(); }
  assert.equal((await first).status, 'succeeded');
});

test('invalid references, unknown cases, absent proof and nonfixed settings fail before network', async t => {
  const f = await fixture(t);
  const options = { ...f.options, fetchImpl: () => assert.fail('invalid input reached network') };
  await assert.rejects(runPoseCase({ ...options, caseId: 'surprise-seventh-case' }), /case/i);
  f.manifest.cases[0].reference.file = '../.env.test';
  await f.saveManifest();
  await assert.rejects(runPoseCase(options), /reference.*path/i);
  f.manifest.cases[0].reference.file = 'references/reference.png';
  f.manifest.cases[0].reference.sha256 = '0'.repeat(64);
  await f.saveManifest();
  await assert.rejects(runPoseCase(options), /hash/i);
  f.manifest.cases[0].reference.sha256 = sha256(PNG);
  f.manifest.cases[0].settings.quality = 'high';
  await f.saveManifest();
  await assert.rejects(runPoseCase(options), /settings/i);
  f.manifest.cases[0].settings.quality = 'medium';
  await f.saveManifest();
  f.billing.proofSource = '';
  await f.saveBilling();
  await assert.rejects(runPoseCase(options), /proof/i);
});

test('a changed manifest cannot reset a previous reservation', async t => {
  const f = await fixture(t);
  await runPoseCase({ ...f.options, fetchImpl: async () => imageResponse() });
  f.manifest.cases[1].prompt = 'Changed after first submission';
  await f.saveManifest();
  await assert.rejects(runPoseCase({ ...f.options, caseId: IDS[1], fetchImpl: () => assert.fail('changed run reached network') }), /manifest.*changed|manifest.*match/i);
});

test('a truncated PNG response cannot be recorded as a successful first output', async t => {
  const f = await fixture(t);
  const result = await runPoseCase({ ...f.options, fetchImpl: async () => new Response(JSON.stringify({ data: [{ b64_json: PNG.subarray(0, 33).toString('base64') }] })) });
  assert.equal(result.status, 'ambiguous');
  assert.equal(result.output, null);
  assert.deepEqual(await readdir(join(f.assets, 'outputs')), []);
});

test('the verified credential fingerprint is required and another key cannot reach the provider', async t => {
  const f = await fixture(t);
  await writeFile(f.options.envFile, 'TUZI_API_KEY=sk-different-test-credential\n');
  await assert.rejects(runPoseCase({ ...f.options, fetchImpl: () => assert.fail('unverified credential reached provider') }), /credential.*verified/i);
  assert.deepEqual(await readdir(f.options.ledgerDir), []);
});

test('all six first requests retain their reserved ceilings and never permit a seventh request', async t => {
  const f = await fixture(t, 0.166666);
  let calls = 0;
  for (const caseId of IDS) {
    const result = await runPoseCase({ ...f.options, caseId, fetchImpl: async () => { calls++; return imageResponse(); } });
    assert.equal(result.status, 'succeeded');
  }
  assert.equal(calls, 6);
  const ledger = JSON.parse(await readFile(join(f.options.ledgerDir, 'ledger.json'), 'utf8'));
  assert.equal(ledger.reservedMicros, 999996);
  await assert.rejects(runPoseCase({ ...f.options, fetchImpl: () => assert.fail('seventh request') }), /prior attempt/);
});

test('default CLI mode performs validation only and rejects contradictory execution flags', async t => {
  const f = await fixture(t);
  const result = await main(['--manifest', f.options.manifestPath, '--billing', f.options.billingPath]);
  assert.equal(result.mode, 'dry-run');
  assert.deepEqual((await readdir(f.directory)).sort(), ['.env.test', 'billing.json', 'media']);
  await assert.rejects(main(['--execute', '--dry-run']), /execution|--execute/);
  await assert.rejects(main(['--ledger-dir', join(f.directory, 'replacement-ledger')]), error => error.safeCode === 'INVALID_ARGUMENT');
});

test('orphaned evidence cannot bypass a lost ledger', async t => {
  const f = await fixture(t);
  await runPoseCase({ ...f.options, fetchImpl: async () => imageResponse() });
  await assert.rejects(runPoseCase({ ...f.options, ledgerDir: join(f.directory, 'new-empty-ledger'), caseId: IDS[1], fetchImpl: () => assert.fail('lost ledger bypass reached provider') }), /ledger disagree|reconciliation/);
});

test('billing proof is not allowed in the public assets directory', async t => {
  const f = await fixture(t);
  const publicBilling = join(f.assets, 'public-billing.json');
  await writeFile(publicBilling, JSON.stringify(f.billing));
  await assert.rejects(runPoseCase({ ...f.options, billingPath: publicBilling, execute: false }), /billing.*outside.*assets/i);
});
