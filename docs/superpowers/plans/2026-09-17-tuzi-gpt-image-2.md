# Tuzi GPT Image 2 Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the existing GPT Image 2 studio view to Tuzi API for text-to-image and single-reference image-to-image generation without exposing the provider API key in the browser.

**Architecture:** The browser submits a same-origin multipart request to `/api/images/generate`. A shared Tuzi adapter validates and forwards text-only requests to `/v1/images/generations` as JSON and requests with a reference image to `/v1/images/edits` as multipart; both the Cloudflare Worker and local Express server use the adapter. The Worker reads `TUZI_API_KEY` only from its runtime environment, protects the paid endpoint with a Cloudflare rate-limit binding, and is routed only over `seedance3-pro.com/api/*` while the static site continues to use its existing origin.

**Tech Stack:** Static HTML/CSS/ES modules, Cloudflare Worker Fetch API, Express/Multer for local preview, Node.js built-in test runner.

---

### Task 1: Specify and implement the Tuzi adapter

**Files:**
- Create: `scripts/tuzi-image.mjs`
- Create: `tests/image-generation.test.mjs`

- [ ] **Step 1: Write failing adapter tests**

Test that text-only input calls `https://api.tu-zi.com/v1/images/generations` with exactly `model=gpt-image-2`, `n=1`, `size=1024x1024`, and `response_format=url`, while reference-image input calls `/v1/images/edits` with those same fields in multipart form data. Cover missing key, invalid prompt/image, provider errors, URL results, and Base64 results.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/image-generation.test.mjs`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement the minimal adapter**

Validate prompt length, one supported reference image up to 10 MB, a fixed supported size, and normalized response output. Use Bearer authentication and never serialize the provider key into application responses. Abort upstream work after 120 seconds, cap provider JSON at 20 MB with bounded stream reading, and cap error bodies at 64 KB.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/image-generation.test.mjs`

Expected: PASS.

### Task 2: Add Worker and local proxy endpoints

**Files:**
- Modify: `worker.js`
- Modify: `server.local.js`
- Modify: `wrangler.toml`
- Modify: `.gitignore`
- Modify: `package.json`
- Create: `.env.local.example`
- Test: `tests/image-generation.test.mjs`

- [ ] **Step 1: Write failing endpoint tests**

Test the Worker handler with real `Request`, `FormData`, and `Response` objects plus a controlled provider fetch boundary. Verify missing configuration returns 503, invalid requests return 400/415, a rejected rate-limit binding returns 429 before spending provider credit, and successful responses are normalized and marked `no-store`. Add an HTTP-level Express fixture test covering the local route with a controlled provider response.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/image-generation.test.mjs`

Expected: FAIL because `/api/images/generate` handling is absent.

- [ ] **Step 3: Implement both proxy routes**

Route the Worker request to the tested handler. Add an equivalent Multer-backed local endpoint so `npm run start:cms` can exercise the same UI without putting the key in frontend code. Configure an `IMAGE_RATE_LIMITER` binding at two attempted generations per minute per connecting IP; this is a cost guardrail rather than exact accounting, and production should later add authenticated user quotas.

- [ ] **Step 4: Document one local secret source safely**

Use one ignored `.env.local` file for both `npm run start:cms` and `wrangler dev`, with `.env.local.example` containing only `TUZI_API_KEY=replace_with_your_key`. The local server reads `TUZI_API_KEY` from process environment, `.env.local`, or ignored `cms.secrets.json`; Wrangler automatically loads `.env.local` when no `.dev.vars` file is present. Add an npm secret-sync command using `wrangler secret bulk .env.local`, and make the Worker deploy command sync that file before deployment. The Tuzi key must belong to an official-compatible `codex`, `openai`, or `原价` group that exposes `/v1/images/generations` and `/v1/images/edits`. Do not add a real key to source, examples, HTML, or Wrangler config.

- [ ] **Step 5: Define same-origin production routing**

Add Worker routes for `seedance3-pro.com/api/*` and `www.seedance3-pro.com/api/*` with zone `seedance3-pro.com`. This leaves the existing static origin responsible for `/app/` while the Worker handles only `/api/*`.

- [ ] **Step 6: Run and verify GREEN**

Run: `node --test tests/image-generation.test.mjs`

Expected: PASS.

### Task 3: Activate GPT Image 2 in the studio

**Files:**
- Create: `app/image-generation.mjs`
- Modify: `app/index.html`
- Modify: `app/studio.js`
- Modify: `app/studio.css`
- Modify: `tests/studio-routing.test.mjs`

- [ ] **Step 1: Write failing frontend contract tests**

Require a real optional reference-image file input, loading/error/result states, a GPT Image 2 generate button state, and a frontend request module that posts multipart data only to the first-party endpoint.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/studio-routing.test.mjs tests/image-generation.test.mjs`

Expected: FAIL because the interactive generation controls do not exist.

- [ ] **Step 3: Implement text-to-image and image-to-image interaction**

When GPT Image 2 is selected, treat no reference file as text-to-image and an uploaded PNG/JPEG/WebP as image-to-image. Enable generation only for a non-empty prompt, show progress and errors, and render the returned image. For provider URL results, expose an `Open / save original` link in a new tab and state that provider URLs may expire; do not proxy arbitrary result URLs because that would create an SSRF surface. Base64 results render as a data URL. Keep other models in preview mode and do not advance or remove the existing Pose implementation.

- [ ] **Step 4: Run and verify GREEN**

Run: `node --test tests/studio-routing.test.mjs tests/image-generation.test.mjs`

Expected: PASS.

### Task 4: Verify integration boundaries

**Files:**
- Verify: all changed files

- [ ] **Step 1: Run Studio and adapter tests**

Run: `node --test tests/studio-routing.test.mjs tests/image-generation.test.mjs`

- [ ] **Step 2: Run the full suite and syntax checks**

Run: `npm test`, `node --check worker.js`, `node --check server.local.js`, and `git diff --check`.

- [ ] **Step 3: Exercise the local UI without a provider charge**

Use a controlled local provider response to verify upload, loading, error, result, and download states at desktop and mobile widths. Do not call the paid Tuzi API without the user's key and explicit intent.

- [ ] **Step 4: Confirm protected boundaries**

Verify the pre-existing `blog.html`, `seedance-2-5-vs-minimax-h3-vs-kling-3-0-which-ai-video-model-is-best-in-2026-2.html`, and existing paused Pose changes in `app/index.html`, `app/studio.css`, `app/studio.js`, and `tests/studio-routing.test.mjs` are preserved. Verify the AnyPoses repository remains clean.
