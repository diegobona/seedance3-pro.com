# AutoDL 768P multi-reference implementation plan

> **For agentic workers:** Use test-driven development and verification-before-completion. Execute these tightly coupled changes in this session; request independent plan and implementation reviews.

**Goal:** Route new H3 reference videos to AutoDL's upgraded-quality workflow at 768P, allow 1–9 references for all current users, and retain the inactive CompShare adapter and existing tasks.

**Architecture:** Keep the existing quota, private reference storage, task persistence, polling and refunds. Add the upgraded AutoDL workflow as an explicit allowlisted channel selected by `H3_REFERENCE_PROVIDER=autodl-upgraded`; continue querying historical AutoDL and CompShare workflows from each task's stored marker. New studio/home requests use 768p; guests retain 5/10-second choices and ten lifetime seconds. Multi-reference jobs cost only their output duration in application credits. Keep reference images fully visible and prepare at 768P rather than the old 480P frame.

**Tech stack:** TanStack Start, Cloudflare Workers/D1/R2, JavaScript modules, TypeScript, node:test/tsx.

## Task 1: provider contract and multi-reference validation

Files: `scripts/autodl-video.mjs`, `src/lib/video-providers.ts`, `src/lib/protected-video-generation.ts`, `tests/autodl-video.test.mjs`, `tests/video-providers.test.ts`.

- [x] Add failing tests for 1/9 valid references, 0/10/duplicate/invalid IDs, 768P square input, upgraded-workflow submission, and historical polling across channel switches.
- [x] Run `node --test tests/autodl-video.test.mjs` and `npx tsx --test tests/video-providers.test.ts`; confirm expected failures.
- [x] Add `minimax_h3_zm_u24` without replacing historical workflow IDs; validate the chosen workflow before fetch, preserve existing CompShare contract, and map ordered URLs to `ref_image_0` through `ref_image_8`.
- [x] Route `autodl-upgraded` reference jobs to the new workflow and preserve no-fallback behavior. Keep text jobs on their existing AutoDL text workflow at 768P.
- [x] Run the same tests and confirm passing.

## Task 2: 768P request and quota boundaries

Files: `src/routes/api/videos/generate.ts`, `src/lib/protected-video-generation.ts`, `wrangler.jsonc`, generated Worker bindings, `tests/auth-video-route.test.ts`, `tests/d1-guest-video-trial.test.ts`.

- [x] Update guest tests to permit 768P 5/10-second multi-reference jobs, reject 15-second guest requests, and verify duration-only reservation/refund behavior.
- [x] Confirm failures before changing production code.
- [x] Move new request resolution gates to 768P, keeping quotas and refunds unchanged. Switch only new reference jobs via configuration; leave CompShare code and secrets intact.
- [x] Regenerate Worker bindings and run guest/provider/D1 integration tests.

## Task 3: upload UI, reference preparation and bilingual copy

Files: `app/video-generation.mjs`, `app/video-reference-frame.mjs`, `app/studio.js`, `app/home-video.mjs`, `app/i18n.mjs`, `src/data/ui-zh.json`, `src/routes/app.tsx`, `src/components/model-landing-content.tsx`, affected frontend/SSR tests.

- [x] Add failing tests for ordered nine-image uploads, prevalidation before any upload, tenth-image rejection, reference removal/paste/transfer limits, 768P payloads and full-image 768P frame preparation.
- [x] Implement multiple selection, 0/9 counter, square reference support, translated hints and 768P resolution copy in both the client dictionary and SSR `src/data/ui-zh.json`. Homepage may retain its simple single-image picker while sharing the upgraded generation path.
- [x] Preserve captured drafts, ownership, abort handling, per-file 10 MiB limits and image-generator behavior.
- [x] Run `node --test tests/video-generation.test.mjs tests/video-reference-frame.test.mjs tests/studio-generation-preview.test.mjs tests/home-video.test.mjs` and affected bilingual SSR tests.

## Task 4: integrated verification and trial release

- [x] Request independent spec/correctness review; fix actionable findings.
- [x] Run the complete JavaScript and TypeScript tests, build/typecheck, and Wrangler deployment dry run. Inspect the final diff for unrelated changes and leaked secrets.
- [x] Update `docs/h3-reference-video.md` and `docs/guest-video-trial.md` with routing, resolution, multi-reference behavior and rollback limits.
- [x] Deploy the configured Worker `seedance3-blog-cms-worker` after successful checks, preserving its current secrets/resources and existing D1 database `seedance3-production`. Also deploy the static Pages project `seedance3-pro-com`, since home HTML and its bundle are proxied from that separate origin. Verify bilingual served UI and non-billable validation.
- [x] If usable existing credentials are available, submit one bounded 5-second, two-reference synthetic trial through the protected guest path (expected AutoDL peak cost ¥0.25); confirm workflow, returned video dimensions, single reservation and result, without repeatedly retrying billed submissions. Otherwise state that visual generation remains unverified.
- [x] Deliver verification evidence and trial result. CompShare is disabled for new jobs, not deleted; enabling its old channel alone will still retain its old single-image/480P contract until separately upgraded.

## Release evidence

Worker version `e9e35466-d761-4bf5-a705-fffd153220d9` and Pages deployment `045710f8` are live. The two-reference, five-second trial returned 1344×768 video at 24 FPS with AAC audio and settled exactly five application credits. The synthetic D1 user, task, reservation and both R2 references were removed.

83 focused JavaScript and 67 focused TypeScript/D1 tests passed. The full suites retain 24 JavaScript and 7 TypeScript baseline failures with no newly failing tests; live Neon tests were disabled. Build, typecheck and Wrangler dry run passed. Independent review approved after correcting the homepage 768P label and square-reference mode.
