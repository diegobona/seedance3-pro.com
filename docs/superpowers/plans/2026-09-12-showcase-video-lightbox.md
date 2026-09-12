# Showcase Video Lightbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the homepage Showcase as clean poster-like video cards that reveal a play button on hover/focus and open the selected clip in a larger centered playback dialog.

**Architecture:** Keep the nine existing MP4 URLs and responsive grid, but make each preview a semantic button containing a muted, control-free video frame plus an overlay icon. Add one shared native `<dialog>` and reuse one controlled video element for all cards. Extend `main.js` to open, play, close, reset, and restore focus without adding dependencies.

**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node test runner, in-app browser QA.

---

### Task 1: Lock the card and dialog contract with a failing test

**Files:**
- Modify: `tests/seo-pages.test.mjs`

- [ ] Add assertions that all nine Showcase previews are buttons with ordered `data-video-src` values, accessible names, muted control-free preview videos, and a play-overlay element.
- [ ] Add assertions for one accessibly named native dialog containing an accessibly named close button and one large video with native controls.
- [ ] Add assertions that `main.js` wires card click, `showModal()`, playback, backdrop click, and the native dialog `close` event; every dismissal route, including Escape/cancel, must reach one cleanup path that pauses and clears playback, unlocks scrolling, and restores focus.
- [ ] Run `node --test --test-name-pattern="video showcase" tests/seo-pages.test.mjs` and confirm failure because the lightbox markup and behavior do not exist yet.

### Task 2: Implement preview cards and shared player dialog

**Files:**
- Modify: `index.html`
- Modify: `site.css`
- Modify: `main.js`

- [ ] Replace each directly controlled grid video with a keyboard-accessible preview button; preserve the nine source URLs and order.
- [ ] Add one accessible native dialog after the grid, including a close button and a controlled playback video.
- [ ] Style rounded clean preview frames, a dark `:hover`/`:focus-visible` veil, centered circular play icon, and a large responsive 16:9 modal centered over a blurred/dimmed backdrop.
- [ ] In `main.js`, copy the selected URL into the modal video, call `showModal()` and `play()`, route the close button and backdrop through `dialog.close()`, and use the dialog `close` event as the single cleanup path for Escape and every other dismissal route.
- [ ] Run the focused test and confirm it passes.

### Task 3: Regression and browser verification

**Files:**
- Verify: `index.html`
- Verify: `site.css`
- Verify: `main.js`
- Verify: `tests/seo-pages.test.mjs`

- [ ] Run `npm.cmd test` and confirm the full suite passes.
- [ ] In the local browser, verify default cards show no native controls, hover/focus reveals the play icon, Enter and Space activate a focused preview, clicking opens the correct larger video, playback loads, and close button/backdrop/Escape all dismiss it.
- [ ] Verify desktop/tablet/mobile layouts have no horizontal overflow and that focus returns to the originating card.
- [ ] Run `git diff --check -- index.html site.css main.js tests/seo-pages.test.mjs`.
- [ ] Keep all changes uncommitted because the user did not request a commit or push and the working tree contains existing user edits.
