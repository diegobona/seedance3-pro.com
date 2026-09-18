# Studio Controls and Model Availability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make GPT Image 2 the only selectable studio model, clearly mark the other four models as coming soon, remove the model-note card, and make all highlighted GPT Image controls perform real work through the first-party API.

**Architecture:** Keep the TanStack `/app` route and legacy preview markup synchronized. Put deterministic prompt and option behavior in a small browser-neutral module, pass validated quantity/quality/size fields through the existing multipart client and Tuzi adapter, and calculate reservations as `quantity × 5 credits`. Preserve the existing single-image response field while adding an image array so old clients remain compatible.

**Tech Stack:** TanStack Start, React, browser ES modules, Node test runner, Tuzi OpenAI-compatible Images API, Neon credit reservations.

---

### Task 1: Lock the studio to GPT Image 2

**Files:**
- Modify: `src/routes/app.tsx`
- Modify: `app/legacy-preview.html`
- Modify: `app/model-routing.mjs`
- Modify: `app/studio.js`
- Modify: `app/studio.css`
- Modify: `tests/studio-routing.test.mjs`
- Modify: `tests/tanstack-auth-structure.test.mjs`

- [x] Add failing tests proving MiniMax H3, SEEDANCE 3.0, Pose to Image, and Nano Banana 2 Lite are disabled and labeled `COMING SOON`, GPT Image 2 is active, and the default model is GPT Image 2.
- [x] Add failing tests proving the model-note card and `context-title` binding are absent.
- [x] Run focused structural tests and confirm failures describe the old markup/default.
- [x] Update both route and preview markup, remove dead note-card data/bindings, and add disabled-state styling.
- [x] Re-run focused tests and confirm they pass.

### Task 2: Define real image-control behavior

**Files:**
- Create: `app/studio-controls.mjs`
- Modify: `src/routes/app.tsx`
- Modify: `app/legacy-preview.html`
- Modify: `app/studio.js`
- Modify: `app/image-generation.mjs`
- Create: `tests/studio-controls.test.mjs`
- Modify: `tests/studio-routing.test.mjs`
- Modify: `tests/image-generation.test.mjs`

- [x] Write failing tests for prompt-structure insertion, example cycling, quantity cost calculation, aspect-ratio-to-size mapping, and multipart serialization of quantity/quality/size.
- [x] Give prompt buttons stable ids and image selects stable ids with quantity `1–3`, quality `low/medium/high`, and sizes `1024x1024`, `1536x1024`, `1024x1536`.
- [x] Implement prompt tools, live button cost (`5 credits` per image), and pass selected values to the image client.
- [x] Re-run focused browser-neutral tests.

### Task 3: Validate options, bill per image, and return every result

**Files:**
- Modify: `scripts/tuzi-image.mjs`
- Modify: `src/lib/protected-image-generation.ts`
- Modify: `src/routes/api/images/generate.ts`
- Modify: `app/studio.js`
- Modify: `app/studio.css`
- Modify: `tests/image-generation.test.mjs`
- Modify: `tests/auth-image-route.test.ts`

- [x] Write failing tests proving invalid option fields are rejected before provider work, valid fields reach both generation/edit endpoints, and all returned images are normalized.
- [x] Write failing tests proving quantity 3 reserves 15 credits, insufficient balances skip provider work, and response credit headers expose total cost.
- [x] Validate an allowlist of multipart fields and supported values, forward `n`, `quality`, and `size`, and return `{ image: first, images: all }`.
- [x] Render all returned images, keep first-image compatibility, and restore/download each result safely.
- [x] Re-run focused tests.

### Task 4: Verify the complete workflow

**Files:**
- No production files unless verification exposes a defect.

- [x] Run `npm test`.
- [x] Run `npm run test:auth`.
- [x] Run `npm run build`.
- [x] Reload `http://localhost:4311/app?model=gpt-image-2` and verify disabled model navigation, removed note card, prompt tools, setting controls, live credit cost, and no console errors.
- [x] Run `git diff --check -- . ':(exclude)node_modules'` and confirm `index.html` is unchanged.
