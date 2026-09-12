# SEO-First Multi-Model Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the public site around its existing Seedance 3 search visibility while adding indexable MiniMax H3, Nano Banana 2 Lite, and GPT Image 2 landing pages plus a non-indexable static studio preview.

**Architecture:** Keep `/index.html` as the sole Seedance 3 primary landing page and preserve its canonical URL, title focus, and main query intent. Give each additional model one distinct public SEO page, link them through a restrained “Explore more models” section, and keep the backend-free `/app/` preview out of the index. Shared CSS provides the visual system without introducing a framework or build step.

**Tech Stack:** Static HTML, shared CSS, vanilla JavaScript, Node.js built-in test runner.

---

### Task 1: Add SEO regression tests

**Files:**
- Create: `tests/seo-pages.test.mjs`
- Modify: `package.json`

- [x] Write tests that require the homepage to retain the Seedance 3 title/canonical/H1 focus, require unique public model pages, require `/app/` to use `noindex,follow`, and require the sitemap to exclude `/app/`.
- [x] Run `node --test tests/seo-pages.test.mjs` and confirm failure because the new pages and signals do not exist.
- [x] Add an npm test script after the tests prove red.

### Task 2: Build shared visual assets and redesign the homepage

**Files:**
- Create: `site.css`
- Create: `assets/seedance-hero.svg`
- Modify: `index.html`
- Modify: `main.js`

- [x] Preserve the existing homepage `<title>`, canonical URL, and Seedance 3 primary intent.
- [x] Replace the false live generator with a cinematic hero and a truthful studio-preview CTA.
- [x] Add a visible Seedance 3 “Coming Soon” status, examples, capabilities, model discovery, workflow, FAQ, and independence disclaimer.
- [x] Link MiniMax H3 below the Seedance-focused sections rather than adding it to the homepage title or H1.
- [x] Keep responsive navigation and accessible interactions in vanilla JavaScript.

### Task 3: Add model SEO landing pages

**Files:**
- Create: `minimax-h3-ai-video-generator.html`
- Create: `nano-banana-2-lite.html`
- Create: `gpt-image-2.html`
- Create: `minimax-h3-vs-seedance-3.html`

- [x] Give each page one unique title, description, H1, canonical URL, and search intent.
- [x] Use verified model positioning and avoid claiming the local site already provides generation.
- [x] Link each page back to the Seedance 3 homepage and to the studio preview.
- [x] Include useful comparisons, prompts, FAQs, and breadcrumbs rather than thin model-name variants.

### Task 4: Add the static multi-model studio preview

**Files:**
- Create: `app/index.html`
- Create: `app/studio.css`
- Create: `app/studio.js`

- [x] Add `noindex,follow` and a canonical back to the homepage.
- [x] Present AI Video models MiniMax H3 and Seedance 3.0 (Coming Soon).
- [x] Present AI Image models Nano Banana 2 Lite and GPT Image 2.
- [x] Show model-aware controls, examples, and a truthful “Generation coming soon” action.
- [x] Ensure mobile navigation and model switching work without a backend.

### Task 5: Update discovery and verify

**Files:**
- Modify: `sitemap.xml`
- Modify: `robots.txt` only if needed
- Modify: `package.json`

- [x] Add only the four public SEO pages to the sitemap.
- [x] Run `npm test` and confirm all SEO regression tests pass.
- [x] Start the local static server and visually inspect the homepage, one model page, and `/app/` at desktop and mobile widths.
- [x] Check browser console output and verify there are no page errors.
- [x] Review `git diff` to confirm no existing URLs were removed and no unrelated files changed.
