# CompShare H3 First Frame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route the existing H3 single-image 480p trial through CompShare first-frame generation while keeping text generation and outstanding AutoDL jobs functional.

**Architecture:** Add a bounded CompShare adapter and a small server-side channel dispatcher. Persist a unique `compshare:minimax-h3:first-frame` workflow identifier using the current task table; both polling paths dispatch by this stored identifier. A runtime switch stages activation until the user configures their server-side key.

**Tech Stack:** TanStack Start, TypeScript, native fetch, Cloudflare Workers/R2/D1, Node test runner, existing credit/task stores.

**Spec:** `docs/superpowers/specs/2026-10-19-compshare-first-frame.md`

---

### Task 1: Complete provider integration as one atomic lifecycle change

The adapter, task metadata and both polling paths are tightly coupled: deploy this task together, never partially switch one endpoint. Work in the existing attached worktree on `codex/compshare-first-frame`; starting commit is `184cd6a8c71d92e7fad086dccd226019292a1715`.

**Files:**
- Create `scripts/compshare-video.mjs` — external transport, request mapping, bounded parsing/status normalization.
- Create `src/lib/video-providers.ts` — select channel, validate channel credentials, submit/query by channel.
- Modify `src/lib/protected-video-generation.ts` — trusted workflow selection and submission context; pass persisted workflow into poll query callback.
- Modify `src/routes/api/videos/generate.ts` and `src/routes/api/videos/status.ts` — use dispatcher, credential checks only for selected channel.
- Modify `src/lib/video-task-reconciler.ts` — dispatch each claimed task by its workflow, preserve optional dependency injection and idle gate.
- Modify `wrangler.jsonc`, `.env.example`, `src/cloudflare-env.d.ts`; regenerate `src/worker-bindings.d.ts` with installed Wrangler.
- Modify `docs/h3-reference-video.md`; add `docs/compshare-first-frame.md` for key setup/cutover/rollback.
- Create `tests/compshare-video.test.mjs` and `tests/video-providers.test.ts`.
- Extend `tests/auth-video-route.test.ts`, `tests/video-task-reconciler.test.ts`, and a focused D1 lifecycle integration test.

- [x] **Step 1: Write adapter and dispatcher contract tests before implementation.**

Tests must capture the precise outbound POST URL, Bearer header, `Idempotency-Key: seedance-video:<local UUID>`, uppercase `480P`, selected duration/ratio, `MiniMax-H3`, `use_context_ir:true`, and exactly one `first_frame` image. Reject absent/multiple/unsafe references, unsupported resolution/duration and blank keys before fetch. Validate/encode task IDs before GET. Normalize exact queued/running/succeeded/failed/cancelled states; verify matching response task ID, HTTPS MP4 result, malformed/oversized JSON handling, Retry-After bounds, transport timeout, unknown status remaining pending, no redirect following and no secret-bearing provider error text. No real network requests.

Dispatcher interface may follow this shape (equivalent clear signatures are acceptable):

```ts
type VideoProviderEnvironment = {
  H3_REFERENCE_PROVIDER?: string
  AUTODL_TOKEN?: string
  COMPSHARE_API_KEY?: string
}
selectVideoWorkflow(payload, environment): string
assertVideoProviderConfigured(workflowId, environment): void
submitVideoTask(payload, { workflowId, localTaskId, environment, fetchImpl? })
queryVideoTask(providerTaskId, { workflowId, environment, fetchImpl? })
```

Known old workflows remain AutoDL even when `H3_REFERENCE_PROVIDER` changes. Only exact allowlisted workflow IDs are routed. Key/config errors are retriable when querying; missing credentials must not be logged verbatim. A recognized CompShare workflow is never queried via AutoDL even if credentials/switch change later.

- [x] **Step 2: Run tests red.**

Run `node --test tests/compshare-video.test.mjs` and `node node_modules/tsx/dist/cli.mjs --test tests/video-providers.test.ts`. Missing-module failures can initially establish scaffolding; also demonstrate the actual request/status expectations fail before completing the implementation.

- [x] **Step 3: Implement adapter and dispatcher minimally.**

Use fixed default endpoint `https://cp.compshare.cn`; token only from injected server configuration. `fetchImpl` injection is for tests. Do not add a user-controlled endpoint. Use a 15-second timeout, `redirect:'error'`, and a bounded reader (at most 256 KiB success/64 KiB errors). Prefer generic provider errors over relaying upstream text. Never perform automatic POST retries. Mark submission network/read uncertainty ambiguous; polling transport/408/425/429/5xx, credential gaps and upstream 401/403 retriable. Failed/cancelled are terminal failures; unexpected status remains pending. The dispatcher validates the current 480p single-image scope, and keeps text AutoDL.

- [x] **Step 4: Write lifecycle regression tests red.**

Prove selected CompShare workflow is recorded before submission and exact reservation local ID reaches submit for idempotency. Change protected start callback to accept trusted `{workflowId,localTaskId}` context while retaining backward compatibility with existing one-argument callbacks. Use a trusted workflow resolver option rather than accepting workflow/provider fields from request JSON. Prove poll callback receives stored workflow after ownership lookup/lease. Reconciler tests must include a mixed AutoDL/CompShare batch, missing CompShare key leaves task pending without refund, explicit failure refunds once, success settles once, no jobs means zero provider requests and zero store creation. Existing text and guest-second tests remain intact.

- [x] **Step 5: Wire generation and both query paths.**

Select/validate the requested provider after JSON preflight but before provisioning a guest or reserving credits. Preserve same-origin and rate limits. Allow cached terminal polling responses even when one provider key is absent. Invoke query with task workflow in protected polling and reconciliation. Keep the existing reconciler dependency seam usable for AutoDL tests; add persisted workflow context if needed and pass the relevant token. Do not change task/credit schemas or remove activity-gated SQL logic. Current reference-to-video still supports only 16:9 and 9:16; respect the selected ratio rather than secretly overriding the selector with `adaptive`.

- [x] **Step 6: Add configuration and cutover instructions.**

Set source config `vars.H3_REFERENCE_PROVIDER` to `autodl` for staging. Document `COMPSHARE_API_KEY=...` in ignored `.env.local` and how the operator switches to `compshare` after the credential is ready. Regenerate binding types using installed `wrangler types`; use a temporary ignored empty placeholder key if type discovery requires it, never fake a real credential. Keep primary `.env.local` untouched until the user adds their key. Update the existing handwritten optional Env projection only for compatibility with existing call sites; do not rewrite unrelated bindings. Explain rollback affects new tasks only; accepted tasks continue at their recorded provider.

- [x] **Step 7: Run meaningful local checks and self-review.**

Run adapter/dispatcher/protected/reconciler/D1 lifecycle tests; existing client `video-generation`, studio preview, quota projection, ownership and guest trial tests; `node node_modules/typescript/bin/tsc --noEmit`; production build. Avoid unrelated stale GPT 2.5 four-image tests as release gates, but report their known baseline status accurately if encountered. Verify no keys or new provider capabilities are shipped to client JS and no secret files are tracked.

- [ ] **Step 8: Review and commit.**

Spec review first, then quality review; resolve material findings and rerun affected checks. Commit only implementation/spec/plan/docs/tests, preserving unrelated files. Parent agent performs final overall review and controls integration/publishing/deployment. Do not deploy or run paid tasks inside the implementation subagent.

Implementation self-review is complete; external spec/quality reviews remain with
the parent. Actual TDD red evidence: 8 adapter and 5 dispatcher assertions failed
against export scaffolding; 6 protected/reconciler behavior assertions and 2 D1
lifecycle assertions failed against the previous lifecycle. Additional red tests
caught dot-only task IDs and AutoDL 401/403 polling refunds before their fixes.
Verification includes local D1/PGlite lifecycle/accounting, client/preview/quota
regressions, TypeScript and production build. Legacy remote Neon tests were
attempted once and rejected at their initial insert by authentication; subsequent
verification excludes external DB access. The known unrelated GPT reference-count
and source-shape suites are unchanged. No live generation quality is claimed.

### Release checkpoint (parent agent)

- [ ] Request the real API key only after code and offline validation are ready; tell user to save `COMPSHARE_API_KEY` in primary ignored `.env.local` and reply when done. Link official key-creation documentation. Never request the raw key in chat.
- [ ] If the key is not supplied, finish all key-independent work, commit it on the feature branch and report exactly what is ready and what remains. Do not activate or claim live first-frame generation.
- [ ] Once a key is supplied, verify balance with read-only API, configure provider switch, rebuild/typecheck/dry-run and deploy to the known Worker. Check both new CompShare and persisted old AutoDL routing. Any small real generation verification should use a nonprivate public test image, clearly bounded duration/cost and the existing protected quota path.
- [ ] Verify live bilingual studio pages, client bundle parity, backend one-reference validation, quota metadata unchanged except deliberately consumed test quota, and 100% expected deployment version. Preserve the ability to resume existing jobs after rollback.
