# Public model URLs implementation plan

**Goal:** Align public tool and prompt-library URLs with Seedance 2.5 and GPT Image 2.5 while preserving generation and existing links.

**Architecture:** Use one public-path alias map for localized links, canonical metadata, static HTML, and server redirects. Route the new Seedance address to the existing working video studio; keep provider IDs, storage keys, media paths, and database records intact. Rename prompt-library routes and retain redirects for every existing index/detail URL.

**Tech stack:** TanStack Router, React, static HTML, Cloudflare Workers and Pages, Node test runner.

- [x] Add failing behavior tests for both locales, query/hash preservation, old detail redirects, link rewriting, and selection of the working model from its new route.
- [x] Implement shared public URL aliases and update SEO/model navigation, static synchronization, canonical metadata, and sitemap generation.
- [x] Move prompt index/detail routes to `seedance-2-5-prompts` and `gpt-image-2-5-prompts`; create GPT tool route `app/image/gpt-image-2-5`; replace Seedance preview with the working tool.
- [x] Preserve partner attribution and saved workflow parameters across redirects. Keep existing generation IDs and billing behavior unchanged.
- [x] Run routing, locale, partner, workflow, and build/type checks. Stage on top of the latest validated Pages release, deploy with existing bindings/variables, and verify new pages plus old redirects live.

User clarified that “database paths” means prompt-library URLs, so no database migration is required.

Validation: production build and dry run succeeded; 118 targeted tests, 44 local URL checks, and 51 live URL/page/sitemap checks passed. Plan/implementation review approved after covering Pose Studio fallback and Chinese static regeneration. Worker version `3546cd92-fff1-42a8-9ebd-1c7fb328326c`; Pages deployment `686e04cc`.
