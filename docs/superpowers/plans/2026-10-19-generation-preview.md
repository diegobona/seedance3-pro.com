# Generation Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. The user already authorized implementation and production release in this session; execute inline without another approval question.

**Goal:** Make the right-hand preview the stable location for examples, active generation, results and failures for both image models and videos.

**Architecture:** Add a browser-only preview controller with model-scoped jobs and page-local completed result batches. Keep existing provider, D1, ownership, credits and polling APIs unchanged. Preserve existing result item download/animate handlers by retaining their DOM nodes; examples and guide cards stay inside an idle-only wrapper. The same controller drives loading, elapsed time, retries, history and completion visibility.

**Tech Stack:** TanStack React SSR markup, vanilla JavaScript DOM controllers, CSS, Node test runner, existing Vite/Cloudflare Worker deployment.

## Accepted behavior

- Right-side idle content immediately switches to a prominent neutral loading card on submit. Show the real phase (upload/submitting/queued/running/checking), a spinner and elapsed time; never invent a percentage.
- Success replaces loading at the same position with usable image(s) or a video player and existing download/animate actions. A subsequent request preserves prior results below the current preview.
- Failure occupies the same preview position with its actual message and an explicit retry action. Nonterminal video timeouts stay pending, with a resume-status action that never submits a duplicate generation.
- Model changes and late responses cannot display the wrong model's result. Image and video jobs may run simultaneously; only the selected model's active job occupies the main preview. Completed batches remain available in the corresponding page-local model history.
- Generation-time quota warnings remain suppressed, as implemented in d73272c. No changes to guest allowances, charging, refunds or empty database polling.
- Desktop output remains visible using a viewport-bounded sticky panel; mobile submit reveals the output area. Completion off screen or on a different model supplies a visible view-result action without stealing focus or automatic scrolling.
- Accessible status text, non-announcing elapsed timer, keyboard retry/reveal controls, reduced-motion styles and complete English/Chinese copy.

## Task 1: Preview controller and behavioral tests

**Files:** Create `app/generation-preview.mjs`, `tests/generation-preview.test.mjs`, and a small test DOM helper if needed.

- [x] Write failing tests for idle→pending→success/error, image batch placeholders, neutral pending state, elapsed time, retry/resume, cleanup, preserved prior results, model switching and late responses.
- [x] Implement `createGenerationPreviewController({root,onRetry,onRevealModel,onChange,clock/timer dependencies})`. Public methods: `selectModel`, `begin`, `update`, `succeed`, `fail`, `pause`, `destroy`. Jobs are tokenized and model-scoped; late/stale or destroyed callbacks cannot overwrite newer jobs.
- [x] Render completed batch DOM nodes into the latest gallery and older batches into page-local history without cloning or discarding their action handlers. Clear timers after completion and on destroy; one timer suffices for active jobs.
- [x] Run `node --test tests/generation-preview.test.mjs` and confirm success after observing the initial failures.

## Task 2: Stable SSR shell, responsive styles and translations

**Files:** Modify `src/routes/app.tsx`, `app/legacy-preview.html`, `app/studio.css`, `app/i18n.mjs`, `src/data/ui-zh.json`, and `tests/guest-studio-page.test.ts`.

- [x] Add one preview root with idle content wrapper, pending card/placeholder grid, result host retaining existing IDs, error card and retry control. Add a history section and a view-result control.
- [x] Keep React-owned examples/guide nodes in their original static wrapper; hide the wrapper rather than moving/deleting its React DOM. Tag idle examples/guide groups by model and provide an empty-preview fallback.
- [x] Add neutral spinner/skeleton states, stable frame size, selected aspect ratio handling, batched grids, visible action buttons, mobile reveal and desktop viewport-bounded sticky output. Disable motion when requested.
- [x] Add bilingual SSR/controller strings and SSR assertions for the loading/error/history hooks and their position in the right-hand output area.

## Task 3: Wire real image/video lifecycles

**Files:** Modify `app/studio.js`; retain `app/image-generation.mjs`, `app/video-generation.mjs` and all backend APIs unless a demonstrated integration defect requires a narrow change.

- [x] Initialize/select/destroy the preview controller with the studio. Capture model IDs, kind, batch size and aspect ratio before each request; pass tokenized handles through asynchronous callbacks.
- [x] Refactor result item creation to return existing DOM nodes with their download/animate callbacks. Route success/failure into the controller instead of toggling scattered result/example cards. Animate actions must work for preserved results too.
- [x] Send actual upload/queue/running/retry phases to the preview. Recoverable video polling errors show a pending resume action; terminal failure permits a new generation only via explicit user action and the existing button/credit gating.
- [x] Remove conflicting result/example visibility toggles. Preserve pose-reference preview and pose result actions, original credits events, task resume and signup links.
- [x] Ensure background jobs do not overwrite the currently selected model's status/result. Provide view-result navigation on background completion.

## Task 4: Verify, review and release

- [ ] Run new controller tests plus existing quota, studio, locale, provider-client, pose actions and image-to-video suites; run bilingual SSR checks, `tsc --noEmit`, build and deployment dry run. Existing unrelated stale pricing/reference-count assertions should be recorded, not disguised as new regressions.
- [x] Request a focused code review under the requesting-code-review skill; address substantive findings before release.
- [x] Attempt read-only UI verification through the allowed browser tools if available. Existing CUA tab binding has repeatedly failed in this session; do not waste retries or claim browser screenshots were verified if inaccessible. DOM behavioral tests and served asset hash verification remain required.
- [ ] Commit/merge to main, publish GitHub and deploy the tested Worker. Verify production bilingual markup, exact tested client assets, 100% active deployment and unchanged anonymous quota balances without invoking paid providers or writing user data.

The unrelated `2026-10-19-my-creations.md` plan stays untouched. This feature's history is limited to the current loaded page; no database migration, permanent works library or provider generation is required for verification.

## Verification record

- Controller behavior: 15 passing cases, with red-to-green coverage for hidden-tab completion and retained media nodes.
- Real studio lifecycle: 9 passing cases against genuine clients with controlled fetch and clocks, including both image/video completion orders, cross-model caches, GET-only paused resume, captured retry drafts, hidden reference exclusion and retained animate action recovery. Confirmed failing regressions before the animate and paused-switch fixes.
- Relevant regression suites: 100/100 pass; bilingual SSR: 4/4 pass; TypeScript noEmit: pass.
- Browser inspection attempted: inventory available, IAB getTab timed out after 35 seconds and reset its kernel. No browser screenshot or live provider-generation verification claimed.
- Spec review issues resolved: exclude hidden video references in text mode; restore detached animate buttons after transfer failure; paused video remains explicitly resumable after model switching.
- Independent quality review: no remaining P1/P2 findings; 24/24 controller + real studio cases rerun by reviewer.
- Production build and deployment are executed next from the primary checkout so its existing release environment is used. Release checks are recorded in ignored local deployment logs.
