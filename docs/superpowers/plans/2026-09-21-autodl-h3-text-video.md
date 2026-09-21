# AutoDL MiniMax H3 Text-to-Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make MiniMax H3 a working, authenticated text-to-video generator in the studio using AutoDL workflow `minimax_h3_lightx2v_no_pic`, with asynchronous polling and credit-safe recovery.

**Architecture:** The browser submits a small JSON request to a same-origin TanStack API route. Before contacting AutoDL, the Worker atomically reserves credits and creates a user-owned local task in `submitting` state. A successful provider response is attached to that task before the browser receives it; status requests and the existing one-minute Worker cron share a leased polling state machine, so closing the browser cannot strand credits or cause duplicate provider polling. Terminal task and credit transitions are atomic. AutoDL documents no idempotency key, so an ambiguous submit timeout is never automatically retried: it becomes `submission_unknown`, is refunded, and is never allowed to deliver a late result. The first release intentionally supports text-to-video only; image-to-video will later use `minimax_h3_zm_u08` after an R2-backed upload path exists.

**Tech Stack:** TanStack Start/React, Cloudflare Workers, Neon/Drizzle, AutoDL ComfyUI API, Node test runner.

---

### Task 1: AutoDL provider adapter

**Files:**
- Create: `scripts/autodl-video.mjs`
- Create: `tests/autodl-video.test.mjs`
- Modify: `.env.example`
- Modify: `.env.local.example`
- Modify: `src/cloudflare-env.d.ts`

- [ ] **Step 1: Write failing adapter tests**

Cover strict JSON input validation, exact resolution/orientation mapping, raw `Authorization` token handling, bounded provider errors with token redaction, task-status normalization, HTTPS MP4 result validation, and submit/query timeouts. Use fixtures for queued, running, successful, failed, malformed, 429, and 5xx responses.

- [ ] **Step 2: Run the adapter tests and verify RED**

Run: `node --test tests/autodl-video.test.mjs`

Expected: FAIL because `scripts/autodl-video.mjs` does not exist.

- [ ] **Step 3: Implement the minimal adapter**

Expose `preflightVideoGenerationRequest`, `submitAutodlVideoTask`, and `queryAutodlVideoTask`. Accept only JSON, a non-empty prompt up to 10,000 characters, durations 5/10/15, resolutions `480p`/`768p`, and aspect ratios `9:16`/`16:9`/`1:1`. Map these six combinations exactly to `480p竖`, `480p横`, `480p(1:1)`, `768p竖`, `768p横`, and `768p(1:1)`.

Pin this provider contract in tests:

- Base URL: `https://autodl.art`
- Submit: `POST /api/v1/comfyui/comfyui_workflow/minimax_h3_lightx2v_no_pic`
- Submit body: `{ prompt, duration, resolution }`
- Query: `GET /api/v1/comfyui/comfyui_workflow/result/{providerTaskId}`
- Headers: raw AutoDL token in `Authorization`, JSON content type for submit
- Normalized statuses: `QUEUED` → queued, `RUNNING` → running, `SUCCESS`/`completed` → succeeded, `FAILED` → failed; unknown statuses stay retriable and never trigger a refund
- Timeout: 15 seconds per submit or query HTTP call

Never return provider credentials or unbounded upstream bodies. Treat query network errors, 429, and 5xx as transient; surface a retriable status and preserve `Retry-After` when present.

- [ ] **Step 4: Run adapter tests and verify GREEN**

Run: `node --test tests/autodl-video.test.mjs`

Expected: PASS.

### Task 2: Persistent video tasks and atomic credit transitions

**Files:**
- Create: `src/db/video-generation-tasks.ts`
- Create: `src/lib/protected-video-generation.ts`
- Modify: `src/db/schema.ts`
- Modify: `src/db/generation-credits.ts`
- Generate: `drizzle/0002_*.sql`
- Generate: `drizzle/meta/0002_snapshot.json`
- Generate: `drizzle/meta/_journal.json`
- Create: `tests/video-generation-task-db.test.ts`
- Create: `tests/auth-video-route.test.ts`

- [ ] **Step 1: Write failing persistence and protection tests**

Cover wrong-user task lookup, authentication before provider work, atomic reserve-plus-precreate, duration-based credit reservation, definite and ambiguous submit failure, settlement on a usable HTTPS video, no credit transition while queued/running, idempotent concurrent terminal polls, database transition failures, lease claims, ordered batches, backoff scheduling, overdue expiry/refund, and stale-reservation behavior for active versus abandoned video tasks.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npx tsx --test tests/video-generation-task-db.test.ts tests/auth-video-route.test.ts`

Expected: FAIL because the task store and protection module do not exist.

- [ ] **Step 3: Implement persisted state and protected lifecycle**

Create `video_generation_task` with an opaque local UUID, nullable unique provider task id, owning user id, unique reservation id, workflow id, duration, resolution, aspect ratio, normalized status (`submitting`, `submission_unknown`, `queued`, `running`, `succeeded`, `failed`, `expired`), result URL, bounded provider error, `poll_attempts`, `next_poll_at`, `lease_until`, `last_polled_at`, and timestamps. Do not persist prompts.

Implement these atomic database operations:

- `reserveAndCreate`: debit credits, create the reservation, and create the local `submitting` task in one statement/transaction before any provider call.
- `attachProviderTask`: transition `submitting` to `queued` with provider task id. Retry bounded database failures before returning. If attachment still fails after AutoDL accepted the job, finalize as `submission_unknown` and refund; accept the rare provider cost because AutoDL exposes no documented idempotency/recovery key.
- `claimForPoll`/`claimPending`: acquire a short lease only when `next_poll_at` is due, ordered oldest-due first, using row locking/atomic update so cron and browser polls cannot hammer the same task or starve later tasks.
- `scheduleNextPoll`: release the lease and set bounded exponential backoff.
- `finalizeSuccess`/`finalizeFailure`: atomically transition the task and reservation once; repeated/concurrent polls cannot double-settle, double-refund, or double-count generation totals.
- `expireOverdue`: atomically mark nonterminal tasks older than two hours `expired` and refund. `finalizeSuccess` must refuse an expired/refunded task, and cached expired responses must never expose a provider result URL.

Generate the migration and complete snapshot with `npm run db:generate`; do not hand-edit only the SQL/journal. Update generic 15-minute stale-reservation cleanup to exclude every reservation linked to any nonterminal video task, whether or not it currently holds a poll lease. Only `expireOverdue` may atomically transition such a task to `expired` and refund it after two hours. Test a queued/running task older than 15 minutes with no active lease while a concurrent new reservation triggers generic cleanup.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npx tsx --test tests/video-generation-task-db.test.ts tests/auth-video-route.test.ts`

Expected: PASS.

### Task 3: First-party routes and server-side reconciliation

**Files:**
- Create: `src/routes/api/videos/generate.ts`
- Create: `src/routes/api/videos/status.ts`
- Create: `src/lib/video-task-reconciler.ts`
- Modify: `src/server.ts`
- Modify: `src/routeTree.gen.ts` via the route generator
- Modify: `tests/tanstack-auth-structure.test.mjs`

- [ ] **Step 1: Add failing route-level tests**

Use behavioral route/protection tests for malformed or oversized JSON, missing token/rate limiter, cross-site requests, authentication before provider work, wrong-user task ids, transient query failures, provider `FAILED`, successful MP4 results, replayed terminal polls, database transition failures, and secret redaction. Keep a small structural assertion that the scheduled handler registers reconciliation with `ctx.waitUntil()`.

- [ ] **Step 2: Run the route tests and verify RED**

Run: `node --test tests/tanstack-auth-structure.test.mjs`

Run: `npx tsx --test tests/auth-video-route.test.ts`

Expected: FAIL because the video routes and reconciler are absent.

- [ ] **Step 3: Implement generate/status routes and reconciliation**

`POST /api/videos/generate` performs origin checks, preflight, rate limiting, authentication, atomic reserve/task precreation, AutoDL submission, and provider-id attachment. Do not retry an ambiguous provider submit timeout because AutoDL has no documented idempotency key; mark `submission_unknown` and refund. `GET /api/videos/status?task=...` authenticates, verifies task ownership, returns cached terminal tasks, or acquires a poll lease. Query network errors, 429, and 5xx schedule a later retry without changing credits. Register a bounded cron reconciler in `src/server.ts` that first expires overdue tasks, then claims an ordered limited batch and applies the same state machine. Preserve the existing `legacyWorker.scheduled(controller, env, ctx)` call and test that both CMS scheduling and video reconciliation execute; every promise is awaited or passed to `ctx.waitUntil()`.

- [ ] **Step 4: Regenerate routes and verify GREEN**

Run: `npm run generate-routes`

Run: `node --test tests/tanstack-auth-structure.test.mjs`

Run: `npx tsx --test tests/auth-video-route.test.ts`

Expected: PASS.

### Task 4: Video client and authenticated studio UI

**Files:**
- Create: `app/video-generation.mjs`
- Modify: `app/studio-controls.mjs`
- Modify: `app/studio.js`
- Modify: `src/routes/app.tsx`
- Modify: `app/legacy-preview.html`
- Modify: `app/studio.css`
- Modify: `vite.config.ts` if required by the final import path
- Modify: `tests/studio-controls.test.mjs`
- Modify: `tests/studio-routing.test.mjs`
- Create: `tests/video-generation.test.mjs`

- [ ] **Step 1: Write failing client and UI tests**

Cover submit/poll behavior, bounded exponential backoff, `Retry-After`, timeout/abort behavior, credit propagation, provider failure display, H3 route selection, duration-based credit summaries, enabled H3 navigation in the authenticated shell, text-only controls, resumable local task state, and video result rendering.

- [ ] **Step 2: Run focused frontend tests and verify RED**

Run: `node --test tests/studio-controls.test.mjs tests/studio-routing.test.mjs tests/video-generation.test.mjs`

Expected: FAIL for missing H3 behavior.

- [ ] **Step 3: Implement the H3 studio experience**

Enable MiniMax H3 only in the authenticated TanStack studio; keep `app/legacy-preview.html` clearly preview-only/disabled because it has no `UserMenu` or `AuthDialog`. Show prompt, duration, resolution, and aspect-ratio controls; hide reference upload for the text-only launch. Charge one credit per second, require login, display queued/running progress, poll with bounded exponential backoff that honors `Retry-After`, render the returned MP4 in a native video player, and preserve the existing GPT Image 2 flow. Persist only the opaque local task id in session storage so a refresh can resume it; a client timeout must leave the server task reconcilable rather than refunding or discarding it.

- [ ] **Step 4: Run focused frontend tests and verify GREEN**

Run: `node --test tests/studio-controls.test.mjs tests/studio-routing.test.mjs tests/video-generation.test.mjs`

Expected: PASS.

### Task 5: Full verification and setup handoff

**Files:**
- Modify: `docs/auth-setup.md`

- [ ] **Step 1: Document AutoDL setup**

Document `AUTODL_TOKEN`, raw-token authorization, workflow id, local `.env.local` setup, database migration, and the existing encrypted bulk-secret deployment flow without recording a real token.

- [ ] **Step 2: Run the full test and build suite**

Run: `npm test`

Run: `npm run test:auth`

Run: `npm run build`

Expected: all commands succeed with no new warnings or type errors.

- [ ] **Step 3: Perform local UI verification**

Open `/app?model=minimax-h3`; verify the H3 sidebar item is active, settings are usable, anonymous generation opens login, and a mocked provider task moves from queued to a playable HTTPS MP4 without regressing GPT Image 2. Verify refreshing can resume a known local task and that the cron reconciler can complete a task without an open browser.

- [ ] **Step 4: Record the required deployment secret**

The user must provide an AutoDL ComfyUI token through `.env.local` or the Cloudflare secret store before a real paid generation can be exercised. Do not paste or commit the token.

