# Homepage and Blog Navigation Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Showcase and Blog navigation to the homepage, remove the screenshot-highlighted Blog copy, and restyle the Blog page to match the homepage.

**Architecture:** Keep the site static and reuse the existing homepage design system in `site.css`. Both pages will share the same compact header navigation, while Blog-specific layout classes extend the existing container, card, button, and footer primitives without changing article URLs or CMS markers.

**Tech Stack:** Static HTML, CSS, Node.js built-in test runner

---

### Task 1: Lock the requested structure with regression tests

**Files:**
- Modify: `tests/seo-pages.test.mjs`
- Test: `tests/seo-pages.test.mjs`

- [ ] **Step 1: Write failing tests for the homepage navigation**

Assert that the homepage header contains exactly the Showcase and Blog links while retaining the existing Start for Free action.

Revise the prior `desktop-nav` exclusion assertion so it rejects the removed multi-item/mobile navigation but permits one `desktop-nav compact-nav`. Assert exact targets: Showcase uses `./showcase.html`; Blog uses `./blog.html` (served locally as `http://localhost:4310/blog.html`).

- [ ] **Step 2: Write failing tests for the Blog cleanup and shared styling**

Assert that `blog.html` loads `site.css`, removes Tailwind and all screenshot-highlighted copy, uses the compact shared navigation, preserves the article grid and CMS markers, and contains no old indigo/slate page shell.

Add source assertions that `server.local.js` and `worker.js` generate `blog-card card card-pad`, `blog-card-category`, `blog-card-excerpt`, and `card-link` markup rather than Tailwind utility classes. This protects future CMS-published cards.

- [ ] **Step 3: Run the focused tests and confirm they fail for missing navigation and old Blog markup**

Run: `node --test --test-name-pattern="homepage exposes|blog uses|CMS blog" tests/seo-pages.test.mjs`

Expected: FAIL because the homepage has no compact navigation and Blog still uses its old Tailwind header and hero.

### Task 2: Add the shared compact navigation

**Files:**
- Modify: `index.html`
- Modify: `site.css`

- [ ] **Step 1: Add Showcase and Blog links to the homepage header**

Insert a two-link `desktop-nav compact-nav` between the brand and existing Start for Free action.

- [ ] **Step 2: Make the compact navigation responsive**

Add a scoped `.compact-nav` override so the two links remain usable at tablet and phone widths without restoring the removed multi-item/hamburger menu.

- [ ] **Step 3: Run the focused tests**

Run: `node --test --test-name-pattern="homepage exposes" tests/seo-pages.test.mjs`

Expected: PASS.

### Task 3: Rebuild Blog with the homepage design system

**Files:**
- Modify: `blog.html`
- Modify: `site.css`
- Modify: `server.local.js`
- Modify: `worker.js`

- [ ] **Step 1: Replace the Tailwind shell with shared homepage assets and header**

Remove the Tailwind CDN and old slate/indigo utility markup. Load `site.css`, use the shared `site-header`, `brand`, `desktop-nav compact-nav`, and the same Showcase/Blog links.

- [ ] **Step 2: Remove highlighted Blog intro content**

Delete the Start Creating action, Tutorial Center badge, page heading, and explanatory paragraph so the article grid begins directly below the shared header.

- [ ] **Step 3: Convert posts to shared card styling**

Keep every article title, category, description, URL, and `BLOG_POSTS_START` / `BLOG_POSTS_END` marker. Apply Blog-specific classes built on `.card`, `.card-pad`, and `.card-link` for consistent typography, spacing, borders, hover behavior, and responsive columns.

- [ ] **Step 4: Update both CMS card generators and the local parser**

Change `upsertBlogCard` in `server.local.js` and `upsertBlogCardHtml` in `worker.js` to emit the same shared Blog card classes. Update `listPublishedPosts` in `server.local.js` to parse `blog-card-category` and `blog-card-excerpt`, preserving CMS listing and deletion behavior.

- [ ] **Step 5: Replace the footer with the homepage footer design**

Use `site-footer`, `footer-grid`, brand treatment, and shared link styling.

- [ ] **Step 6: Run the focused tests**

Run: `node --test --test-name-pattern="blog uses|CMS blog" tests/seo-pages.test.mjs`

Expected: PASS.

### Task 4: Verify behavior and presentation

**Files:**
- Verify: `index.html`
- Verify: `blog.html`
- Verify: `site.css`
- Verify: `tests/seo-pages.test.mjs`

- [ ] **Step 1: Run the complete automated test suite**

Run: `npm.cmd test`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Inspect both pages in the local browser**

Verify the two header links, confirm Blog has no highlighted copy, inspect desktop and mobile layouts, and confirm article links remain visible and usable.

- [ ] **Step 3: Review the final diff**

Run: `git diff --check` and inspect only the intended hunks without overwriting unrelated user changes.
