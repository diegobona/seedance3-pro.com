# Christmas Photo Prompt Collection Implementation Plan

> **For agentic workers:** Use scoped parallel implementation and review the result. Check completed tasks below.

**Goal:** Add an indexable seasonal Christmas photo prompt collection with useful original prompts and direct image-generator handoff.

**Architecture:** Serve `/ai-christmas-photo-prompt` and `/zh/ai-christmas-photo-prompt` inside the existing studio prompt-library shell. Keep the URL year-independent; feature the collection below the homepage hero and in image/studio prompt navigation. Use original text templates without claiming they are generated examples.

**Tech Stack:** React, TanStack Start/Router, TypeScript, existing studio CSS, bilingual sitemap generator, Node tests.

---

### Collection content and interface

Files: `src/data/christmas-photo-prompts.ts`, `src/data/christmas-photo-zh.json`, `src/components/christmas-photo-prompts.tsx`, `src/styles/christmas-photo-prompts.css`, EN/ZH route files, `src/components/studio-showcase-page.tsx`.

- [x] Write 12 distinct Christmas photo prompts across portraits, couples, families, pets and cards; keep prompts below the workspace limit and use only supported aspect ratios.
- [x] Implement category filtering, visible/readable prompt text, copy feedback and exact prompt/aspect-ratio handoff to GPT Image 2.
- [x] Include practical customization guidance and reference-photo instructions. Clearly present prompts as templates.
- [x] Translate editorial content and metadata while preserving the original generation prompt text.
- [x] Add indexable localized route heads and self-canonical URLs; retain the site's shared locale alternates.

### Discovery and integration

Files: homepage EN/ZH HTML, `site.css`, existing studio/preview sidebars, `src/lib/site-i18n.tsx`, `src/lib/site-static-proxy.ts`, `vite.config.ts`, `scripts/generate-zh-site.mjs`, static translation catalog, `sitemap.xml`, `docs/seo-url-map.md`.

- [x] Feature the collection below the homepage hero and link it in the Explore footer.
- [x] Add the seasonal collection to studio prompt-library navigation and link it from the image library.
- [x] Route both locales through the Worker in development and production and localize static links correctly.
- [x] Add both canonicals to the sitemap with reciprocal language alternatives and an accurate update date.

### Verification

- [x] Verify prompt handoff, localization and production routing with meaningful tests.
- [x] Run the relevant regression suite and production build.
- [x] Inspect desktop/mobile layout and verify copy, category filtering, generator handoff and SSR metadata in the browser.
- [x] Review the scoped changes and report local completion and deployment requirements accurately.


Validation (2026-10-15): production build and TypeScript check passed; 295 static regression tests and 9 Christmas behavior/routing tests passed. Actual EN/ZH SSR returned correct titles, canonicals, indexable robots and all 12 templates. Desktop and 390px mobile inspection passed; category filtering, copy feedback and exact GPT Image 2 prompt/aspect-ratio prefill were verified. Homepage feature and image-library CTA were checked in both locales. Independent review found no actionable issues. Changes remain local and require the existing Pages plus Worker release path.
