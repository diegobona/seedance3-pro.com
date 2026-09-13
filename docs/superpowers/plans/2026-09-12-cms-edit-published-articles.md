# CMS Edit Published Articles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an administrator load any article listed in the CMS, edit its title, excerpt, category, and rich-text body, then save the changes back to the same article URL and Blog card.

**Architecture:** Add pure article-document and Blog-index helpers for extracting editable content, validating Blog-owned file names, updating an existing HTML document, and replacing a Blog card in place. Extend both local and worker APIs with authenticated/validated article reads and edit-aware publishing. Add a small edit state to the current single-file admin UI. Edits update searchable title/description fields while preserving URL identity and unrelated structured data.

**Tech Stack:** Static HTML/JavaScript admin UI, Express, Cloudflare Worker, Node.js ESM helpers, Node test runner.

---

### Task 1: Define safe article extraction and update behavior

**Files:**
- Modify: `tests/seo-pages.test.mjs`
- Modify: `scripts/article-html.mjs`

- [ ] Add failing tests for extracting the existing article body from nested HTML.
- [ ] Add failing tests showing that an edit updates `<title>`, meta description, visible article category, visible H1, excerpt, Open Graph/Twitter title and descriptions, plus Article JSON-LD `headline`, `description`, and `dateModified`.
- [ ] Assert canonical URL, Article `datePublished`/author/image fields, FAQ and other JSON-LD, and unrelated metadata are preserved.
- [ ] Run the focused test and confirm it fails because the edit helpers do not exist.
- [ ] Implement `extractEditableArticleContent` and `updateArticleDocument` with HTML escaping and existing sanitizer rules.
- [ ] Run the focused test and confirm it passes.

### Task 2: Add local CMS edit endpoints and stable-URL publishing

**Files:**
- Create: `scripts/blog-cms-html.mjs`
- Modify: `server.local.js`
- Modify: `tests/seo-pages.test.mjs`

- [ ] Add real unit tests for Blog inventory parsing, basename-only `.html` validation, and in-place Blog-card replacement.
- [ ] Reject traversal, absolute paths, redirect aliases, unlisted HTML pages, and nonexistent files before any disk or GitHub write.
- [ ] Add `GET /api/post?fileName=...` that only loads files currently present in the Blog marker inventory.
- [ ] Bind the local CMS server explicitly to `127.0.0.1` and test that local-only boundary; do not expose unauthenticated article reads or mutations on the LAN.
- [ ] Accept an optional validated Blog-owned `fileName` in `/api/publish`; when present, update that file instead of generating a new slug.
- [ ] Replace the matching Blog card in its existing position so title, excerpt, and category edits appear immediately.
- [ ] Keep canonical and sitemap URL stable for edits.
- [ ] Run focused tests.

### Task 3: Add admin edit controls and state

**Files:**
- Modify: `admin/index.html`
- Modify: `tests/seo-pages.test.mjs`

- [ ] Add failing UI contract assertions for an Edit button, edit-state banner, cancel-edit control, article-loading request, and edit `fileName` in the publish payload.
- [ ] Add an Edit button next to Delete for every published article.
- [ ] Load title, excerpt, category, and HTML body into the existing form.
- [ ] Display which URL is being edited, change the primary button label to Save Changes, and provide Cancel Editing.
- [ ] Clear edit state after a successful save and refresh the article list.
- [ ] Run focused tests.

### Task 4: Keep worker publishing compatible

**Files:**
- Modify: `worker.js`
- Modify: `tests/seo-pages.test.mjs`

- [ ] Add an authenticated worker `GET /api/post` equivalent that reads the Blog inventory and requested article from GitHub.
- [ ] Add tests for authorization, filename validation, Blog ownership, missing files, optional edit `fileName`, and same-file updates.
- [ ] Store the edit file name on queued jobs.
- [ ] Load and update the existing GitHub article when editing; continue using unique slugs for new posts.
- [ ] Update the existing Blog card in place.
- [ ] Run focused tests.

### Task 5: Verify the complete workflow

**Files:**
- Verify: `admin/index.html`, representative article HTML, Blog list HTML
- Create: `tests/fixtures/cms-edit-preview-server.mjs`

- [ ] Run the full Node test suite.
- [ ] Run syntax checks on changed JavaScript modules.
- [ ] Start a disposable loopback-only preview server that serves the real admin UI but stubs the CMS APIs entirely in memory.
- [ ] Use the browser to load a fixture article, edit it, click Save Changes, and verify the submitted `fileName`, success-state reset, cancellation without mutation, and error-state retention—without invoking Git or touching real site files.
- [ ] Exercise the complete extract-update-card workflow against disposable in-memory/temp fixtures, verifying title/body/card changes, unchanged URL/canonical/sitemap identity, cancellation without mutation, and edit-state retention on errors. Do not trigger the CMS's real Git commit/push during automated verification.
- [ ] Review `git diff --check` and confirm no unrelated user changes were overwritten.
