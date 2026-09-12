# Seedance 2.5 Image-to-Video Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish an authoritative English Seedance 2.5 image-to-video guide, preserve the older 2.0 tutorial as a clearly labeled legacy resource, and update discovery surfaces without introducing competing search intent.

**Architecture:** Add a new standalone, indexable article using the shared homepage design system and official ByteDance Seed sources. Keep the existing 2.0 URL self-canonical and focused only on the `Seedance 2.0 legacy tutorial` search intent, add a prominent contextual link to the 2.5 guide, and update the blog listing and sitemap so the new guide is the primary current tutorial. Do not add copy that distinguishes the site's brand name from the official model version.

**Tech Stack:** Static HTML, shared `site.css`, Node.js built-in test runner.

---

### Task 1: Define the SEO and content contract

**Files:**
- Modify: `tests/seo-pages.test.mjs`

- [x] **Step 1: Write the failing test**

Add assertions that the new page exists, has a unique title/H1/canonical, contains Article and FAQ structured data, links official sources, covers prompts/settings/examples/troubleshooting, and has no nested title or duplicate H1. In the same red phase, assert that the legacy page stays self-canonical with a 2.0-only title/H1 and an upgrade link, the new Blog card appears before the legacy card, the Blog card title matches the new page, and the sitemap contains the new canonical URL exactly once.

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/seo-pages.test.mjs`

Expected: FAIL because `seedance-2-5-image-to-video-guide.html` does not exist.

### Task 2: Publish the Seedance 2.5 guide

**Files:**
- Create: `seedance-2-5-image-to-video-guide.html`

- [x] **Step 1: Write the minimal implementation**

Create the page with one H1, current metadata, canonical and social tags, Article and FAQ JSON-LD, a concise answer-first introduction, step-by-step image-to-video workflow, reusable prompt formula and examples, settings guidance, reference-control tips, timestamp editing, troubleshooting, 2.0-to-2.5 differences, and official source links. Verify version-specific claims against these authoritative pages before drafting:

- `https://seed.bytedance.com/en/blog/one-take-creation-flexible-referencing-introducing-seedance-2-5`
- `https://seed.bytedance.com/en/seedance2_5`

- [x] **Step 2: Run the focused test**

Run: `npm test -- tests/seo-pages.test.mjs`

Expected: The new article contract passes; discovery checks may still fail until Task 3.

### Task 3: Update the legacy tutorial and discovery surfaces

**Files:**
- Modify: `seedance-2-0-complete-tutorial.html`
- Modify: `blog.html`
- Modify: `sitemap.xml`
- Modify: `tests/seo-pages.test.mjs`

- [x] **Step 1: Update the legacy article**

Retitle it to `Seedance 2.0 Image-to-Video Tutorial (Legacy Guide)`, preserve its URL and canonical, and add a prominent contextual link to the current 2.5 guide. Mention 2.5 only in that upgrade callout and its link, not in the legacy page title, H1, description, or keyword targets.

- [x] **Step 2: Update discovery**

Add the new 2.5 guide near the top of the blog listing, rename the old card as a legacy guide, and add the new canonical URL to the sitemap with the current last-modified date.

- [x] **Step 3: Confirm excluded copy is absent**

Confirm that neither article introduces an explanation distinguishing the site's brand name from the official model version.

- [x] **Step 4: Run the focused test**

Run: `npm test -- tests/seo-pages.test.mjs`

Expected: PASS.

### Task 4: Full verification

**Files:**
- Verify all modified files.

- [x] **Step 1: Run the full test suite**

Run: `npm test`

Expected: All tests pass with zero failures.

- [x] **Step 2: Inspect the diff and page structure**

Run: `git diff --check` and inspect the changed files for accidental unrelated edits.

- [x] **Step 3: Render the new and legacy pages locally**

Open both pages through the local site and verify responsive layout, headings, callouts, tables, links, and card order.
