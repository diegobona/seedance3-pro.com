# Muse Pages Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement the scoped page work and review it. Track completion below.

**Goal:** Add Muse Video and Muse Image model pages and their corresponding prompt libraries in English and Chinese.

**Architecture:** Follow the existing Seedance workspace preview and studio prompt-library patterns. Muse has no provider integration or generated assets in this repository, so offer editable prompt drafts and starter templates with generation visibly unavailable. Keep each model's prompt links and localized URLs consistent.

**Tech Stack:** React, TanStack Start/Router, TypeScript, existing studio CSS, Node tests.

---

### Task 1: Model workspaces and prompt libraries

Files: new `src/data/muse-prompts.ts`, `src/components/muse-workspace-page.tsx`, `src/styles/muse-workspace.css`, eight localized route files; extend `src/components/studio-showcase-page.tsx` and `src/data/ui-zh.json`.

- [x] Define separate video and image starter prompts, model paths, and prompt prefill URLs. Verify prefill preserves prompt text and selected model.
- [x] Create model workspace previews with editable prompt, local reference selection, template selection, disabled generation/settings, and links to each matching prompt library.
- [x] Add Muse starter-template grids to the existing library shell; label templates accurately and supply direct prefill links.
- [x] Add English and Chinese model/library routes, localized metadata, canonical URLs, and noindex on preview pages.
- [x] Translate all new editorial interface text while keeping prompt text unchanged.

### Task 2: Navigation and routing integration

Files: `src/routes/app.tsx`, `src/components/seedance3-preview-page.tsx`, `app/seo-routes.mjs`, `src/lib/site-static-proxy.ts`, `vite.config.ts`, `scripts/generate-zh-site.mjs`.

- [x] Add both Muse models and libraries to existing studio and preview navigation; update section counts.
- [x] Verify model query aliases redirect to the correct Muse workspace and preserve prompt parameters.
- [x] Route Muse prompt libraries through TanStack in production and development; preserve dynamic links during static Chinese publishing.
- [x] Generate the route tree; keep noindex previews out of the sitemap.

### Task 3: Verification and review

- [x] Run relevant routing, localization, and resource tests plus new behavioral URL tests.
- [x] Run the production build and TypeScript checks.
- [x] Inspect all four pages in a local browser, including Chinese, prompt prefill, and a mobile layout.
- [x] Review the scoped diff for missing navigation, incorrect model selection, and claims unsupported by an API integration.

Verification: 57 focused tests pass; the full JavaScript suite passes 295 tests. The broader TypeScript suite passes 108/109 tests. Its existing `daily-free-credits-db.test.ts` late-video-failure test fails at the poll lease assertion, also in an isolated rerun; database time was approximately 3 seconds ahead of this computer, exceeding the test's 1-second future poll timestamp. No credit or generation backend files were changed.

Review found a locale-dependent sidebar scrolling selector. It now uses `.sidebar > nav`; Chinese mobile navigation was verified to scroll to all five libraries and the Back link at 390 × 844.
