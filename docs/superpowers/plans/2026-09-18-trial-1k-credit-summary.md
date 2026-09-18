# Trial 1K Lock And Credit Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock trial GPT Image 2 requests to 1K on both client and server, and add a prominent live credit summary showing this generation's cost, current balance, and projected balance.

**Architecture:** Keep the existing first-party multipart image endpoint and five-credits-per-image rule. The static studio controller owns balance loading and display state, while the existing balance endpoint and `seedance:credits-updated` event remain the source of truth. The provider adapter accepts only the product-facing `1K` quality value during trial, so a modified browser request cannot reach Tuzi with 2K or 4K.

**Tech Stack:** TanStack Start/React route shell, static ES modules, Node test runner, CSS, Tuzi GPT Image 2 adapter.

---

### Task 1: Specify the trial resolution and credit-summary behavior

**Files:**
- Modify: `tests/studio-controls.test.mjs`
- Modify: `tests/studio-routing.test.mjs`
- Modify: `tests/image-generation.test.mjs`

- [x] **Step 1: Write failing unit tests for projected balances**

Add assertions for a pure `projectedCreditBalance(balance, quantity)` helper: valid balances subtract five credits per image, insufficient balances clamp at zero for display, and an unknown balance returns `null`.

- [x] **Step 2: Write failing structure tests for the studio UI**

Require both `app/legacy-preview.html` and `src/routes/app.tsx` to render an always-visible three-option resolution control with `1K` selected and disabled `2K`/`4K` options, plus a visible `TRIAL · 1K ONLY` note. Require prominent credit-summary nodes for cost, current balance, and after-generation balance, and require the studio controller to load `/api/credits/balance` and listen for `seedance:credits-updated`.

- [x] **Step 3: Write failing adapter tests for server enforcement**

Change request fixtures and provider expectations from `low`/`medium`/`high` to `1K`. Add `2K` and `4K` to the invalid settings cases and assert provider work is not called.

- [x] **Step 4: Run the focused tests and confirm RED**

Run: `node --test tests/studio-controls.test.mjs tests/studio-routing.test.mjs tests/image-generation.test.mjs`

Expected: failures for the missing balance helper/UI nodes and because the adapter still accepts the old quality values.

### Task 2: Enforce trial-only 1K requests

**Files:**
- Modify: `app/image-generation.mjs`
- Modify: `app/studio.js`
- Modify: `scripts/tuzi-image.mjs`

- [x] **Step 1: Make 1K the client default and request value**

Set `requestImageGeneration`'s default quality to `1K`, and have the studio controller send the locked `1K` value from the hidden fixed form value.

- [x] **Step 2: Enforce 1K in the shared provider adapter**

Set `DEFAULT_QUALITY` to `1K`, reduce `ALLOWED_QUALITIES` to `new Set(["1K"])`, and return a clear 400 response such as `Trial generation supports 1K only.` for all other values. Forward `1K` to both generation and edit requests.

- [x] **Step 3: Run adapter tests and confirm GREEN**

Run: `node --test tests/image-generation.test.mjs`

Expected: all image-generation tests pass, including rejection of `2K` and `4K` before provider work.

### Task 3: Add a live high-contrast credit summary

**Files:**
- Modify: `app/studio-controls.mjs`
- Modify: `app/studio.js`
- Modify: `app/legacy-preview.html`
- Modify: `src/routes/app.tsx`
- Modify: `app/studio.css`

- [x] **Step 1: Implement the projected-balance helper**

Export `projectedCreditBalance(balance, quantity)`. Return `null` for an unknown or invalid balance and otherwise return `Math.max(0, balance - creditCostForQuantity(quantity))`.

- [x] **Step 2: Replace Quality with an always-visible locked Resolution control**

Render an `image-quality` resolution group containing three side-by-side buttons: `1K` is visibly selected and disabled, while `2K` and `4K` are visibly locked and disabled. Add a nearby trial-only badge/note. Keep a hidden `image-quality` form value fixed to `1K` for the existing controller contract, and keep aspect ratio independent because it maps to the supported pixel dimensions.

- [x] **Step 3: Render the credit summary in both studio shells**

Place a two-column summary immediately above the Generate button. Show `THIS GENERATION` with `5 credits` initially and `YOUR BALANCE` with an unknown placeholder until authenticated balance data arrives; include a separate `After generation` line.

- [x] **Step 4: Connect the summary to live state**

On studio initialization, fetch `/api/credits/balance` with same-origin credentials without opening the login dialog on a passive 401. Update cost and projected balance when quantity changes. Update current/projected balances when `seedance:credits-updated` fires after generation/refund. Mark the summary as insufficient when cost exceeds the known balance.

- [x] **Step 5: Add prominent responsive styling**

Use a high-contrast lime/orange border and glow, large numeric values, clearly separated cost and balance panels, a warning state for insufficient credits, and a one-column layout on narrow screens.

- [x] **Step 6: Run focused tests and confirm GREEN**

Run: `node --test tests/studio-controls.test.mjs tests/studio-routing.test.mjs tests/image-generation.test.mjs`

Expected: all focused tests pass.

### Task 4: Verify the complete application

**Files:**
- Verify only: `index.html`
- Verify only: all changed files above

- [x] **Step 1: Run the full JavaScript test suite**

Run: `npm test`

Expected: all tests pass.

- [x] **Step 2: Run the authenticated route suite**

Run: `npm run test:auth`

Expected: all authentication and credit-accounting tests pass.

- [x] **Step 3: Build the TanStack application**

Run: `npm run build`

Expected: production build succeeds.

- [x] **Step 4: Confirm the homepage is untouched**

Run: `git diff --quiet -- index.html`

Expected: exit code 0.

- [x] **Step 5: Browser smoke-test the studio**

Open `/app?model=gpt-image-2` and verify the always-visible three-option resolution control (1K selected; 2K/4K locked), initial 5-credit cost, signed-in current balance, projected balance changes for quantities 1–3, and responsive layout without overflow. With a new 15-credit account, verify one successful image leaves 10 credits.
