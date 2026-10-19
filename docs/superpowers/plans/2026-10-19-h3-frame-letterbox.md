# H3 first-frame letterboxing implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Preserve the complete reference image and its proportions for every selectable video aspect ratio by centering an equally scaled image on an opaque black frame before upload.

**Architecture:** Normalize at the shared `requestVideoGeneration` reference-upload boundary, so file uploads, pasted images, generated-image transfers and explicit retries all use the captured generation ratio. Browser Canvas produces an owned reference at CompShare's native 480P frame size. The existing server ownership, provider routing, duration and quota lifecycle remain unchanged. Thumbnail previews use the same target frame ratio and `object-fit:contain`.

**Tech Stack:** Native browser image decoding/Canvas, existing ES modules, Node tests, current Vite/Cloudflare build.

## Requirements and boundaries

- Always use a single scale factor: `min(frameWidth / imageWidth, frameHeight / imageHeight)`; center the complete image and fill unused area black. Never crop or stretch.
- Respect actual CompShare 480P dimensions: 16:9 maps to 864x480 and 9:16 to 480x864. A generic frame helper also covers the existing 1:1 selector (480x480); currently disabled reference modes remain disabled. No new aspect ratio options are enabled.
- Use a fresh frame on each new generation/retry, based on the captured ratio; do not reuse a previously padded image after a selector change. Preserve originals in the draft.
- Decode with EXIF orientation. Export an opaque PNG (bounded by existing 10 MiB upload limit), remove temporary graphics resources, and stop before upload or paid submission on decode/encode/abort errors. No fallback to the unprocessed original.
- Text-only generations and resumed GET-only tasks do not decode, normalize or upload images. Existing source file validation, one-reference limit and quota accounting remain intact.
- Reference thumbnails reflect the selected frame and show the complete source. Do not add lengthy UI notices.

## Task 1: Shared preparation and upload boundary

**Files:** create `app/video-reference-frame.mjs`, `tests/video-reference-frame.test.mjs`; modify `app/video-generation.mjs`, `tests/video-generation.test.mjs`, `app/i18n.mjs`.

- [x] Write failing geometry tests for the reported 1080x938 source in both target directions, square/wide/tall sources, matching native ratios, invalid sizes/ratios, equal scale and centered bounded content.
- [x] Write failing Canvas preparation and shared request tests: black fill, entire source drawn with equal scale, PNG output used as upload body, selected ratio preserved in generation JSON, failures/aborts prevent all paid submission, and source remains unchanged. Inject browser primitives only at explicit test seams; production never skips fitting.
- [x] Run tests red, implement the smallest shared frame/Canvas helper and call it before upload. Use browser `createImageBitmap` with orientation metadata and an `Image` fallback; clean up both bitmap and canvas in `finally`.
- [x] Verify green plus existing request/polling tests. Update prior transport-only tests with a preparation seam rather than treating invalid fixture bytes as real images.

## Task 2: Preview and verification

**Files:** modify `app/studio.js`, `app/studio.css`, `tests/studio-generation-preview.test.mjs`, `docs/compshare-first-frame.md`, this plan.

- [x] Add a failing studio regression for thumbnail fit/ratio changes and unchanged original file on subsequent selection. Use the real event handlers and shared frame sizes.
- [x] Make thumbnails contain the source in the selected native-ratio black frame; refresh on ratio changes. Preserve task draft capture and retry behavior.
- [x] Run relevant browser-client and provider/accounting tests, TypeScript and production build. Where browser tooling connects, verify a local browser harness with real Canvas pixels and zero provider calls; accurately report any browser verification limit.
- [x] Request an independent code review, resolve material findings, commit and merge to primary without touching unrelated `2026-10-19-my-creations.md`.
- [x] Publish the exact reviewed commits, deploy to the known Worker, verify deployed client/CSS parity and bilingual studio routes, and record the release evidence. No real generation is necessary to verify equal-scale Canvas preparation; do not consume user quota for smoke checks.

Local verification: 61 browser/provider MJS tests and 51 protected/dispatcher/reconciler/D1 tests passed. A real browser Canvas harness checked opaque black padding, all four source corners, and an unchanged circular marker in landscape, portrait and square frames; the shared request uploaded the prepared PNG. The harness made zero provider calls. Build/typecheck and independent review are release gates.

Release evidence (2026-10-19): independent review approved with no material findings; 32 focused tests also passed on primary after merge. The production build/typecheck, credential-free client scan and Wrangler dry run passed. Worker version 5bc657ae-0b35-4121-9999-26d884664919 is deployed at 100%. Six bilingual studio pages, exact client/CSS hashes, deployed frame preparation markers and contain/black preview styles passed. Guest balances were unchanged and no video was generated during this release verification.
