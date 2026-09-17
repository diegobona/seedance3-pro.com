# Pose-to-Image Sidebar Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Pose to Image the visually dominant AI image workflow in the studio sidebar while leaving the homepage and AnyPoses untouched.

**Architecture:** Keep the existing static studio architecture and URL selection behavior. Add Pose to Image as a signature workflow card above a separately labelled image-model list, then reuse the existing studio view configuration so the card has a coherent selected state and preview content.

**Tech Stack:** Static HTML, CSS, browser JavaScript ES modules, Node.js built-in test runner.

---

### Task 0: Record the out-of-scope baseline

**Files:**
- Verify only: `blog.html`
- Verify only: `seedance-2-5-vs-minimax-h3-vs-kling-3-0-which-ai-video-model-is-best-in-2026-2.html`
- Verify only: `D:/Asideproject/! 网站、插件、APP/anyposes/A-anyposes-master-latest-2026`

- [ ] **Step 1: Record current Seedance3 changes**

Run `git status --short`, `git diff --name-only`, and hash the existing diffs for the two already-modified homepage/content files so the same hashes can be compared after implementation.

- [ ] **Step 2: Record current AnyPoses state**

Run `git -C "D:\Asideproject\! 网站、插件、APP\anyposes\A-anyposes-master-latest-2026" status --short` and `git -C "..." diff --name-only` before implementation.

### Task 1: Specify the signature workflow entry

**Files:**
- Modify: `tests/studio-routing.test.mjs`

- [ ] **Step 1: Write a failing test**

Add assertions that the AI Image area contains `.model-button[data-model="pose-to-image"]` before the `IMAGE MODELS 02` subheading, and that the visible copy says `Pose to Image`, `Build poses in 3D`, and `Open Pose Studio`. Assert that `app/studio.js` registers it as an image workflow so the shared active-selection, deep-link, URL-preservation, and popstate code paths apply to it.

Extend the routing unit test's available-ID set with `pose-to-image` and verify normalization accepts that deep link while still preserving existing query and hash state.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/studio-routing.test.mjs`

Expected: FAIL because the Pose to Image workflow card is absent.

### Task 2: Implement the card and selected preview state

**Files:**
- Modify: `app/index.html`
- Modify: `app/studio.css`
- Modify: `app/studio.js`

- [ ] **Step 1: Add the workflow markup**

Place the signature card first in the AI Image section and move the `02` count to a new `IMAGE MODELS` heading above the two provider models.

- [ ] **Step 2: Add focused visual styling**

Use the existing lime accent, a pose-joint SVG icon, stronger border/background treatment, and a distinct `SIGNATURE` badge without changing global layout or homepage assets.

- [ ] **Step 3: Add the studio view configuration**

Register `pose-to-image` in `app/studio.js` so selecting the card updates the title, status, selected item, image settings, and explanatory example while preserving history navigation.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/studio-routing.test.mjs`

Expected: PASS.

### Task 3: Verify regressions and presentation

**Files:**
- Verify only: `app/index.html`
- Verify only: `app/studio.css`
- Verify only: `app/studio.js`

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Inspect the studio at desktop and narrow widths**

Confirm the signature card is immediately visible, the image-model count remains accurate, selection state is clear, text does not overlap, and mobile sidebar behavior is unchanged.

Click through Pose to Image and all four existing models. Confirm each button receives the active state, its matching settings panel is shown, its URL is updated, and browser back/forward restores the prior selection.

- [ ] **Step 3: Confirm the edit boundary**

Run: `git status --short` and `git diff -- app/index.html app/studio.css app/studio.js tests/studio-routing.test.mjs`.

Recompute the two pre-existing Seedance3 file diff hashes and compare them to Task 0. Separately run `git -C "D:\Asideproject\! 网站、插件、APP\anyposes\A-anyposes-master-latest-2026" status --short` and `git -C "..." diff --name-only`.

Expected: no homepage or AnyPoses source files were changed by this implementation.
