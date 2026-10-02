# Bilingual Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide complete English and Chinese site editions with regional defaults and persistent manual language selection.

**Architecture:** Keep indexed English URLs; Chinese counterparts use /zh/. Cloudflare Workers chooses the initial language from the country and preference cookie, serves React studio routes, and proxies public documents from the existing Pages project. Translate source content in React, client modules and static catalogs, preserving user input and original generation prompts.

**Tech Stack:** React, TanStack Start/Router, Cloudflare Workers/Pages, Node.js static generators.

---

### Task 1: Locale contract and routing

Files: app/site-locale.mjs, app/seo-routes.mjs, src/server.ts, wrangler.jsonc, tests/site-locale.test.mjs, tests/site-static-proxy.test.ts.

- [x] Add pure locale helpers and tests for CN/TW/HK versus other countries.
- [x] Preserve query parameters, explicit Chinese URLs and manual English preferences; exclude APIs and assets.
- [x] Route public documents through the Worker to the existing Pages upstream, keeping SSR application routes and assets intact.
- [x] Run focused tests and npm run build; confirm app, blog, unknown paths and files.

### Task 2: React and interactive studio editions

Files: src/components, src/routes, src/lib/site-i18n.tsx, app/i18n.mjs, app/studio.js, app/pose-*.js.

- [x] Translate interface content explicitly at source and add Chinese routes with matching metadata.
- [x] Preserve provider enums, original prompts, uploads, paid generation behavior and authentication.
- [x] Localize all internal navigation, case dialogs and Pose workflow handoffs.
- [x] Add shared switch, html language and reciprocal SEO alternatives in the root shell.

### Task 3: Public content and SEO

Files: scripts/generate-zh-site.mjs, scripts/i18n, zh/*.html, assets/site-language.js, assets/site-language.css, sitemap.xml, server.local.js.

- [x] Translate all public pages and complete article content into independently crawlable Chinese documents.
- [x] Add language switches and reciprocal hreflang/canonical metadata, with neutral resources and localized internal links.
- [x] Generate bilingual sitemap and integrate the generator with local CMS publishing.
- [x] Keep referral tracking and Pose entrance visibility working across locales.

### Task 4: Verification and release

- [x] Run focused behavioral tests plus required build/type checks.
- [x] Smoke-test both languages, manual switch, form input and popup navigation in an isolated browser.
- [ ] Commit scoped changes; deploy Pages content and the Worker; verify live routes and metadata.
- [ ] Report completed behavior, deployment status and any concrete limitations.
