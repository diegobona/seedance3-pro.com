# Blog SEO Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the duplicate Seedance API article into one indexable URL, normalize imported article markup to one H1 and one document title, and display the requested `$0.01/sec` showcase price.

**Architecture:** Keep `how-to-use-the-seedance-api-complete-developer-guide-2026.html` as the primary URL. Remove the `-2` URL from listings and the sitemap while retaining it as a canonicalized, non-indexable compatibility alias. Add a shared article-fragment sanitizer used by both publishers and a one-time normalization script for existing imported posts.

**Tech Stack:** Static HTML, Node.js ESM, Node test runner, Express local CMS, Cloudflare Worker publisher.

---

### Task 1: Lock the SEO requirements in tests

**Files:**
- Modify: `tests/seo-pages.test.mjs`

- [ ] Update the expected Blog cards to contain only the primary API article URL.
- [ ] Add assertions that the primary API URL remains `index,follow`, self-canonical, and appears exactly once in the sitemap; assert that the duplicate alias canonicalizes to the primary URL, is `noindex,follow`, and is absent from the sitemap.
- [ ] Add an all-article structural check for one `<title>` in `<head>`, no `<title>` in `<body>`, and exactly one `<h1>`.
- [ ] Add sanitizer tests covering nested titles, imported H1s, Lark metadata, custom tags, noisy attributes, event handlers, and `javascript:` URLs while proving that text, HTTPS links/images, safe relative and root-relative links/images (including `./blog-assets/...`), lists, and code/pre blocks are preserved.
- [ ] Update showcase price assertions to require `As low as $0.01/sec`.
- [ ] Run `npm test` and confirm the new assertions fail for the missing behavior.

### Task 2: Normalize article fragments at publication time

**Files:**
- Create: `scripts/article-html.mjs`
- Modify: `server.local.js`
- Modify: `worker.js`

- [ ] Implement `sanitizeArticleHtml()` with explicit retained-element, retained-attribute, and URL-protocol allowlists, including safe relative and root-relative internal URLs. Remove embedded title/head metadata, editor payloads, event handlers, unsafe URLs, custom editor tags, and noisy attributes; demote imported H1s to H2s while preserving safe text, headings, links, images, lists, blockquotes, and code/pre markup.
- [ ] Import and apply the sanitizer in both article publishers before content is inserted into the page template.
- [ ] Run the sanitizer unit tests and confirm they pass.

### Task 3: Consolidate the duplicate API article

**Files:**
- Modify: `blog.html`
- Modify: `sitemap.xml`
- Modify: `how-to-use-the-seedance-api-complete-developer-guide-2026-2.html`
- Modify: `scripts/cleanup-blog-duplicates.mjs`
- Test: `tests/blog-cleanup.test.mjs`

- [ ] Keep the non-suffixed API URL in the Blog grid and remove the duplicate card.
- [ ] Remove the `-2` URL from the sitemap.
- [ ] Convert the `-2` page into a lightweight `noindex,follow` compatibility alias with a canonical link and immediate client-side redirect to the primary URL.
- [ ] Make the duplicate-cleanup script deterministically retain the non-suffixed API URL regardless of card order and preserve the `-2` file as a canonical alias instead of deleting it.
- [ ] Add a temporary-fixture test that runs duplicate cleanup against reversed card order and verifies the primary card, single primary sitemap entry, and alias canonical/noindex output.
- [ ] Run duplicate URL tests and confirm they pass.

### Task 4: Normalize existing imported posts

**Files:**
- Create: `scripts/normalize-blog-articles.mjs`
- Modify: imported root-level article HTML files containing `.article-content` or `.prose` content containers.

- [ ] Apply the shared sanitizer only to the article-body fragment of each post.
- [ ] Verify article text remains present while embedded titles, extra H1s, Lark payloads, custom tags, and noisy attributes are removed.
- [ ] Run the all-article structural tests and confirm they pass.

### Task 5: Apply and verify the requested showcase price

**Files:**
- Modify: `index.html`

- [ ] Replace all nine showcase captions with `As low as $0.01/sec`.
- [ ] Run the complete test suite with `npm test`.
- [ ] Start the local site, inspect the home showcase and primary/alias article URLs in the browser, and verify rendered headings, price copy, canonical tags, and redirect behavior.
- [ ] Review `git diff` to ensure unrelated user changes were preserved.
