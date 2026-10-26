# Blue/cyan brand implementation plan

**Goal:** Adopt the selected C logo and its blue/cyan palette across the existing dark website, preserving layouts, copy and generation/payment behavior.

**Architecture:** Reconstruct the approved mark as native SVG plus raster icons. Keep a shared brand stylesheet and cache-version helper for both static pages and React workspaces; retain legacy accent variable names as compatibility aliases. Convert only UI brand-color literals and inline style blocks, keeping media, generation prompts and semantic error/success colors intact.

**Tech stack:** Existing HTML/CSS, JavaScript modules, React, Vite, Cloudflare Pages and Workers.

- [x] Trace selected C mark; export matching SVG, ICO and Apple icon; inspect 16/32px contrast.
- [x] Add shared brand tokens and primary-button styles, update old lime accent literals and shared asset versioning.
- [x] Synchronize static headers/head metadata and React entry points; preserve all existing page structure and behavior.
- [x] Run existing navigation/auth/workspace checks, build/typecheck, browser QA on desktop/mobile and independent review.
- [x] Prepare a public-only snapshot based on the current production release; verify changed-file manifest, deploy Pages and Worker with existing resources, and verify formal-domain content/assets.

Validation: build/typecheck passed; 53 JavaScript and 20 TypeScript checks passed. Desktop and 390px mobile previews inspected, including enabled/disabled CTAs and login modal. Independent review findings fixed. Public snapshot has 1,587 files with 86 intended changes; static body content matches prior production after removing asset cache versions. All 19 formal-domain document/asset checks passed, including exact hashes for the logo, three icon formats and changed styles/bundles. Browser access to the formal domain timed out; the saved visual proof uses the matching local release preview.

Published Pages deployment: `6ecf8621`. Worker version: `ea689514-644b-4909-aebf-ff4af98faf5b`. Release manifest: `.private/blue-brand-release.json`; visual proof: `.codex-temp/blue-brand-home-preview.png`.

No commits, resets, dependency upgrades, database migrations or changes to media/generation prompts are included.
