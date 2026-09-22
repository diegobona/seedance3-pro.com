# Pose SEO Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ship the first useful SEO increment: an indexable Pose to Image landing page with authentic existing media, accurate workflow copy, and links from the homepage, existing tutorial, and sitemap.

**Architecture:** Keep the public static HTML site separate from the noindex React workbench. Add `pose-to-image.html` and a small page-specific stylesheet using `site.css` tokens. Preserve the existing tutorial URL and video intent while explaining the current on-site image workflow and external video step. Reuse only verified media; do not fabricate case studies or claim unimplemented motion transfer.

**Tech Stack:** Static HTML/CSS, existing Node test runner, local HTTP preview, browser QA. Existing TanStack/Vite app remains unchanged.

**Spec:** `docs/research/2026-09-22-pose-seo-research.md`. User authorized step-by-step execution. This is the first stage; additional measured cases, new tutorials, channel distribution, and conversion measurement follow after the landing-page foundation. No external outreach is authorized.

**Workspace:** `C:/Users/zhouw/.codex/worktrees/pose-seo-foundation/Seedance3`, branch `codex/pose-seo-foundation`. Original checkout was clean at start. Baseline: 27/28 relevant tests pass; one existing homepage navigation test predates the Pose Control link and will be updated as part of the intentional navigation change.

### Task 1: Verify evidence and delivery path

- [x] Audit existing screenshots, recording source, generated images, capture instructions, and current image/video behavior.
- [x] Identify static-site deployment mechanism from repository configuration without printing secrets or deploying during implementation.
- [x] Choose only media with defensible captions. Use a smaller honest set if six independently verified cases are unavailable; record the gap instead of fabricating outputs.

### Task 2: Public landing page

**Files:** create `pose-to-image.html`, `pose-to-image.css`; optional copies/exports of verified existing media under `assets/pose-seo/`.

- [x] Write indexable English HTML with a single H1, canonical `https://seedance3-pro.com/pose-to-image.html`, consistent social metadata, and simple WebPage/BreadcrumbList structured data that matches visible content. No fabricated reviews, ratings, price claims, or unsupported structured data.
- [x] Title: `AI Pose Generator & 3D Pose Editor | Seedance`. Explain 3D pose → capture → GPT Image 2; CTA `./app/?model=pose-to-image`.
- [x] Reuse the shared dark/lime shell. Add accessible page-specific responsive layouts, explicit keyboard focus, real media with dimensions/alt text, native video controls, and meaningful below-fold text. Load media conservatively.
- [x] Include supported scene controls, a three-step workflow, truthful pricing/login boundary, output limitations, FAQs, and a related tutorial link. Do not advertise exact identity preservation, OpenPose export, preset deep links, or direct pose-to-video generation.
- [x] Do not add custom interaction JavaScript when native HTML suffices. Reversible content/style edits do not need mirrored implementation tests; verify their real links, metadata, HTML assets and browser rendering.

### Task 3: Discovery and tutorial update

**Files:** modify `index.html`, `blog.html`, `how-to-control-character-poses-in-seedance-with-3d-pose-references.html`, `sitemap.xml`; update the existing navigation expectation in `tests/seo-pages.test.mjs`.

- [x] Update the homepage Pose Control navigation destination to the landing page, and add an explanatory link from its existing Pose section while retaining direct editor access.
- [x] Retain Home/Blog navigation in article pages and the existing blog card structure. Place additional tool links in relevant body content, respecting established templates.
- [x] Revise the existing tutorial to lead readers through supported pose-to-image functionality, preserve its pose-reference-for-video context, clearly state that video continuation currently requires a compatible external image-to-video tool, and remove SEO draft text. Preserve URL/canonical, add honest screenshots and prompt examples, and use accurate image alt text.
- [x] Add the landing page to sitemap once and update actual modified-page dates only.
- [x] Update the obsolete homepage navigation regression expectation for the deliberate Pose Control destination change; run the existing relevant suites. Do not broaden scope to unrelated CMS or auth code.

### Task 4: Verification and review

- [x] Run `node --test tests/seo-pages.test.mjs tests/blog-cleanup.test.mjs` and the full existing `npm test` suite. Resolve regressions relevant to this change; record unrelated pre-existing failures accurately.
- [x] Parse JSON-LD and check local links/media on all edited pages with a temporary validation command. Verify canonical, indexability and one H1; test actual HTTP responses in preview.
- [x] Preview desktop and mobile in the approved browser. Verified loaded media, native controls, no horizontal overflow, FAQ interactions, link destinations and local HTTP responses. Video metadata/decoding returned no errors; sustained playback was not verified because this app preview paused the video immediately after tool interactions. Live editor navigation remains part of release validation.
- [x] Obtain independent spec review, then quality review; fix actionable issues and recheck affected behavior.
- [x] Prepare a concrete reviewed patch and screenshots. Publication uses the verified Cloudflare Pages GitHub integration: main triggers production; other branches get a preview. Validate deployment SHA and live content after the push. No external outreach.

### Execution evidence

- Full existing suite: 159 passed, 0 failed after linking the existing dependencies into the isolated worktree. Final targeted SEO/blog check: 28 passed, 0 failed.
- Independent plan, spec, and code-quality reviews: approved; no blocking issues.
- Landing: one H1, index/follow, correct canonical, valid WebPage/BreadcrumbList JSON-LD, six native FAQs, valid local resources and fragment targets.
- Desktop and 390px mobile previews inspected; mobile document scroll width equals client width. Tutorial image loads and its URL is preserved.
- Existing recording ends after reference transfer. Its carousel sample is not a generated output. The landing labels this next to the player; tutorial prompt examples are not claimed as tested results.
- Static publication confirmed through Cloudflare API: project seedance3-pro-com, production branch main, enabled GitHub push deployments, active apex/www domains. No Worker deployment is needed.

### Later stages (not silently represented as completed)

- [ ] Produce six documented input/output cases through the actual generator, with generation cost and provenance known.
- [ ] Publish one or two distinct hands-on articles and demonstration videos derived from the cases.
- [ ] Add useful conversion measurement after identifying the existing analytics stack, and obtain a Search Console baseline if access is available.
- [ ] Improve the Anyposes handoff after ownership/cooperation is confirmed; prepare relevant external submission material. Actual outreach requires explicit instructions.
