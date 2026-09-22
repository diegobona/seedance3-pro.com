# Pose SEO Cases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Publish six traceable pose-reference / generated-image examples and an original case study based on actual outputs.

**Architecture:** Capture the currently deployed single-mannequin editor through its visible controls. Generate with the user-authorized developer API quota through the site's existing provider adapter. Preserve the original reference files, exact submitted prompt, settings and first generated output. Disclose that this is an API case study using live-editor references, not six production-workbench transactions. Add only evidence-backed examples to the existing static landing page and one focused case study; do not deploy unrelated Worker changes.

**Tech Stack:** Existing browser editor, `scripts/tuzi-image.mjs` provider adapter, JSON evidence manifest, static HTML/CSS, Node tests and Cloudflare Pages.

**Workspace:** `C:/Users/zhouw/.codex/worktrees/pose-seo-cases/Seedance3`, branch `codex/pose-seo-cases`, base `230aa7589b7574dbdea5cdafb5ca7a57805c59aa`.

**Scope:** This is the next stage of `docs/research/2026-09-22-pose-seo-research.md`. Six first-attempt images; one image per request; no automatic paid retries or model-comparison claims. The live editor has three presets and one mannequin. Repository-only multiple-mannequin support is excluded.

### Task 1: Prepare evidence and references

- [x] Audit native image request path, provider settings, account and credit requirements, export limitations.
- [ ] Prepare six references as three camera-comparison pairs: crossed arms front/low; kneeling three-quarter/high; jogging side/three-quarter. Use the same unchanged body pose within each pair; record actual camera framing and any zoom changes.
- [ ] Save original attached PNG references and editor screenshots under `media/pose-cases/2026-09-22/`; record capture method, viewport, dimensions and SHA-256 in `cases.json`.
- [ ] Use one shared character/style prompt; preserve the actual automatic pose prefix. Fix model, quantity=1, 1K and output aspect/size. Do not imply seed control if none is exposed.

### Task 2: Generate and evaluate

- [x] User selected the existing developer API quota and a hard total limit of **US$1**, including potentially billed failures. No production-account login is needed for this authorized route.
- [ ] Verify the maximum per-request charge for the exact endpoint/model/settings and confirm six initial requests fit before generating. Reserve that upper bound before every submission; ambiguous or potentially billed failures remain reserved. Stop if the remaining budget cannot safely cover the next request, even if fewer than six usable outputs exist. No automatic paid retries.
- [ ] Submit six sequential initial requests using the shared adapter and the existing provider credential. Target `https://api.tu-zi.com/v1/images/edits`, requested model `gpt-image-2`, `quality=medium`, `n=1`, `size=1024x1024`, `response_format=b64_json`, no seed. Save the first output and available provider billing evidence immediately. Record an estimate as an estimate; no trial accounts or balance changes.
- [ ] Record non-secret endpoint, exact requested model/settings (including omitted defaults), full prompt, reference hash, request timestamps/IDs where available, HTTP outcome and billing evidence. Public study identifies live-editor references and developer-API outputs; it does not independently authenticate the provider's underlying model implementation. Never store credentials or signed asset URLs in published evidence.
- [ ] Treat timeout/ambiguous delivery as unresolved; never automatically duplicate a potentially billed request. Save errors as evidence.
- [ ] Inspect every reference/output pair. Record pose, anatomy and framing on separate 0/1/2 scales, with concrete observations and unassessable occlusions. Six examples are exploratory evidence, not a success-rate benchmark.

### Task 3: Publish supported findings

- [ ] Create optimized display copies only after preserving originals. Maintain original aspect ratio and avoid retouching outputs. Use appropriate artifact/image tools for any transformation.
- [ ] Add a small case gallery to `pose-to-image.html` / `pose-to-image.css`, linking to a distinct case study. Include honest captions, prompt/settings and attempts. Keep weak first results in the study with their limitations.
- [ ] Create `pose-reference-camera-angle-examples.html` using the shared article shell. Write findings only after inspecting actual outputs. Add the article to `blog.html` using existing CMS card markers and to `sitemap.xml`; use final extensionless canonical URLs.
- [ ] Extend related links in the existing pose tutorial. Do not publish empty case cards, invented outcomes, or draft evaluation scores.

### Task 4: Verify and release

- [ ] Check manifest/image dimensions/hashes, JSON-LD, canonical URLs, links, assets and accessible image descriptions.
- [ ] Run appropriate existing SEO/blog checks; update an intentional blog-card expectation only for the real new article. Run the full existing test suite once the content integration is complete.
- [ ] Review desktop/mobile layout and image loading. Obtain independent factual/spec and code-quality reviews.
- [ ] Publish through the existing GitHub -> Cloudflare Pages mechanism after review. Verify exact production SHA and final HTTP/canonical/content state.

### Explicitly later

- Search Console ownership/access and actual indexing baseline remain unavailable; do not claim indexing.
- Original video production and channel outreach follow usable cases. No external messages or submissions are authorized by this stage.

## Execution record

- Six original live-editor references and screenshots preserved; one identical prompt, no zoom changes within pairs.
- Six first API requests succeeded; zero retries. Provider logs show six applied charges of USD 0.04, total USD 0.24. Requested 1024 square; actual PNGs 1254 square. Private ledger retained outside Git.
- Article, output review records, landing gallery, Blog card, tutorial inlink, and sitemap entry implemented. Original PNGs used with lazy loading; display derivatives deferred to avoid altering evidence.
- Runner received independent review and 14 behavioral tests. Final full existing suite: 173/173 pass. Desktop 1440 and mobile 390 previews have no horizontal overflow.
- Release verification pending at this commit; Search Console indexing remains unverified.
