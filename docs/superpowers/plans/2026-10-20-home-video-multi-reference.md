# Homepage H3 reference parity implementation plan

**Goal:** Match the homepage Image to Video input to the existing H3 workspace: 1–9 references, each PNG/JPEG/WebP <=10 MB, ordered preview/removal and lossless draft handoff. Generation continues through the existing shared client/API and duration-based credits.

**Root cause:** `home-video.mjs` keeps a single `file`, reads `input.files[0]`, and sends a one-element array. Homepage markup lacks `multiple`; `studio-handoff.mjs` and workspace restoration also only retain one file. The shared request helper and server already accept nine.

**Architecture:** Reuse shared reference validation, replace homepage scalar state with an ordered list, and extend IndexedDB-backed handoff to multiple keys while reading legacy one-file drafts. Keep file bytes out of URLs/session metadata. Preserve atomic selection validation and clean up replaced/failed draft files.

- [x] Add failing multi-file handoff/rollback/legacy tests and shared reference-validation tests.
- [x] Implement shared validation, multi-file handoff and workspace restoration.
- [x] Update EN/ZH homepage input, preview grid, paste/append/remove, immutable submission snapshot and count/cost display.
- [x] Verify focused unit tests and browser flows for 1/9/10 references, invalid files, paste/removal, no quantity surcharge, text-mode exclusion and nine-file workspace handoff. No provider calls or real generation.
- [x] Build/typecheck, review, deploy Pages and Worker artifacts as required, and verify public bundle/markup parity.

## Release evidence

Worker `4e2739f4-2ad1-48d9-bd03-21f4e2d22afe` and Pages `b0baccea` are live. The Worker was published first so its backward-compatible handoff reader was ready before the multi-file homepage. EN/ZH generator markup and exact public JS/CSS parity passed; homepage news/schema rewrites are intentionally excluded from generator parity checks.

Build/typecheck, 29 focused unit tests and six browser scenarios passed. Browser checks cover one-to-nine append with identical duration cost, invalid tenth/batch/oversized files, individual removal and multi-image paste, guest nine-image generation, hidden-reference exclusion in text mode, nine-file ordered handoff with prompt/duration/ratio, and pending submission immutability. All generation/upload requests in QA were intercepted, with no provider call or user charge. Independent review found no release blocker; six unrelated old image-model menu fixture failures were recorded in an expanded pre-existing suite rather than changing product menus.
