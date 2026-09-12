# Homepage Video Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the homepage Showcase menu jump to a nine-video gallery, simplify Blog navigation, and remove the requested footer phrase everywhere.

**Architecture:** Replace the homepage metric strip with a semantic `#showcase` video section and move the existing creative-card section to a unique ID. Keep the site static, render remote MP4s with native `<video>` controls, and extend `site.css` with a responsive 3/2/1-column gallery.

**Tech Stack:** Static HTML, CSS, native HTML video, Node.js built-in test runner

---

### Task 1: Add failing regression coverage

**Files:**
- Modify: `tests/seo-pages.test.mjs`

- [ ] Update the homepage navigation expectation so Showcase targets `#showcase` and Blog targets `./blog.html`.
- [ ] Update the Blog navigation expectation to contain only Blog and reject all Showcase links on that page.
- [ ] Add a test asserting exactly nine video sources in the supplied order inside the unique homepage `#showcase` section, with controls, playsinline, and metadata preload.
- [ ] Add a test covering every top-level HTML page and asserting `Independent AI video model guide` is absent.
- [ ] Run `node --test --test-name-pattern="compact navigation|video showcase|footer guide" tests/seo-pages.test.mjs` and confirm failure for the current markup.

### Task 2: Implement navigation and video gallery

**Files:**
- Modify: `index.html`
- Modify: `blog.html`
- Modify: `site.css`

- [ ] Change the homepage Showcase link to `#showcase`.
- [ ] Remove Showcase from the Blog header and Blog footer Explore links.
- [ ] Replace the homepage metric-strip content with a `#showcase` section containing nine `<video>` elements in the exact user-supplied order.

  1. `https://cdn.metaso.cn/minimax-h3-example-video/h3-example-009.mp4`
  2. `https://cdn.metaso.cn/minimax-h3-example-video/02.mp4`
  3. `https://cdn.metaso.cn/minimax-h3-example-video/05.mp4`
  4. `https://cdn.metaso.cn/minimax-h3-example-video/11.mp4`
  5. `https://cdn.metaso.cn/minimax-h3-example-video/h3-example-007.mp4`
  6. `https://cdn.metaso.cn/minimax-h3-example-video/h3-example-013.mp4`
  7. `https://cdn.metaso.cn/minimax-h3-example-video/h3-example-024.mp4`
  8. `https://cdn.metaso.cn/minimax-h3-example-video/h3-example-006.mp4`
  9. `https://cdn.metaso.cn/minimax-h3-example-video/h3-example-001.mp4`

- [ ] Rename the later creative-directions section ID so the document contains only one `id="showcase"`.
- [ ] Add gallery styling with 3 desktop, 2 tablet, and 1 phone column; videos use a 16:9 frame, native controls, rounded and focus visibility. Give `#showcase` enough `scroll-margin-top` to remain visible below the sticky header.
- [ ] Run focused tests and confirm they pass.

### Task 3: Remove the footer phrase globally

**Files:**
- Modify: `index.html`
- Modify: `blog.html`
- Inspect: all top-level `*.html`

- [ ] Remove `Independent AI video model guide` from every footer where it appears, leaving the copyright row valid.
- [ ] Run the footer-focused test and `rg -n -S "Independent AI video model guide" -g "*.html" .` to confirm zero matches recursively, including nested HTML pages.

### Task 4: Verify behavior and media

**Files:**
- Verify: `index.html`
- Verify: `blog.html`
- Verify: `site.css`
- Verify: `tests/seo-pages.test.mjs`

- [ ] Run `npm.cmd test` and `git diff --check`.
- [ ] In the local browser, click Showcase and verify the URL hash becomes `#showcase` and the video gallery is visible.
- [ ] Confirm all nine video elements load metadata without media errors, and inspect desktop plus phone layouts.
- [ ] Confirm the Blog header shows only Blog and no requested footer phrase remains.
