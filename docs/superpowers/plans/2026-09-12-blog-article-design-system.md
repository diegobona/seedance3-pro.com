# Blog Article Design System Implementation Plan

**Goal:** Make every Blog article detail page visually consistent with the homepage, with a simple header containing only Home and Blog, and remove the Start Creating action.

**Architecture:** Treat the Blog cards as the source of the article-detail inventory. Add a reusable renderer to the existing article HTML module, use it for both CMS publishers, and use the same renderer to migrate the current legacy Tailwind article documents without changing their metadata or article body content. Keep `site.css` as the single visual source of truth.

**Tech Stack:** Static HTML/CSS, Node.js ESM helpers, Node test runner, local browser QA.

---

## Task 1: Define the article-page contract with failing tests

**Files:**
- Modify: `tests/seo-pages.test.mjs`

1. Derive the expected Blog detail pages from the links inside `BLOG_POSTS_START` / `BLOG_POSTS_END`.
2. Assert each linked detail page loads `site.css`, does not load Tailwind, and uses the shared `site-header`, article layout, and `site-footer` classes.
3. Assert the header links are exactly Home and Blog, and that Features, Pricing, and Start Creating are absent from the header.
4. Assert both CMS publisher templates use the shared article renderer so future posts inherit the design.
5. Run the focused test and confirm it fails against the current legacy pages and publishers.

## Task 2: Build the shared article renderer and stylesheet

**Files:**
- Modify: `scripts/article-html.mjs`
- Modify: `site.css`
- Modify: `server.local.js`
- Modify: `worker.js`

1. Add a shared `renderArticleDocument` function that sanitizes article content and outputs the homepage brand header, only Home/Blog navigation, the article hero/body, and shared footer.
2. Add responsive article-specific styles to `site.css`, including typography, lists, links, code, media, blockquotes, and tables.
3. Replace duplicated server and worker HTML templates with calls to the shared renderer.
4. Preserve metadata, canonical URL, and one-H1 semantics.

## Task 3: Migrate all current Blog article detail pages

**Files:**
- Modify: `scripts/normalize-blog-articles.mjs`
- Modify: all article HTML pages linked from `blog.html`

1. Extend the normalizer to preserve the existing head verbatim—including document title, description, robots, canonical, Open Graph/Twitter tags, and every JSON-LD block—while changing only the stylesheet hook and body shell.
2. Re-render only Blog-linked article pages using the shared renderer; do not touch model landing pages or redirect aliases.
3. Ensure the already-modern Seedance 2.5 guide also receives both Home and Blog header links.
4. Add fixture coverage for metadata/JSON-LD preservation, body links/text, and idempotent normalization, then run the focused tests and fix any structural regressions.

## Task 4: Verify behavior and presentation

**Files:**
- Verify: representative imported article, Seedance 2.5 guide, and all Blog-linked articles

1. Run the complete test suite.
2. Inspect representative pages at desktop and mobile widths, including long headings, code blocks, tables, and embedded media when present.
3. Verify Home and Blog navigation destinations, no Start Creating button, no horizontal overflow, consistent colors, and readable long-form content.
4. Review the final diff to confirm article content and SEO metadata were preserved.
