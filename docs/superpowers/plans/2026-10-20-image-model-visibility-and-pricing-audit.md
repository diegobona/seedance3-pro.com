# Image model visibility and pricing audit implementation plan

> **For agentic workers:** Execute the UI changes in this session using test-driven development and verification-before-completion. Request independent read-only pricing and implementation reviews.

**Goal:** Hide GPT Image 2 from promoted model choices, make GPT Image 2.5 the default image tool, and recheck the proposed US$4.99 purchase economics for a Hong Kong Stripe account settling in HKD.

**Architecture:** Separate the browser's current model default from the existing provider compatibility default. Keep historical examples accurately attributed and legacy API requests compatible. Update visible navigation, generic entry points, Pose handoff and prompt reuse links to GPT Image 2.5. Audit prices without changing credit charges or adding payment infrastructure.

**Tech Stack:** TanStack Start/React, browser JavaScript modules, Node test runner, TypeScript, Stripe/AutoDL/Tuzi public pricing and safe read-only account metadata.

**User steering:** Keep the GPT Image 2 page and API usable. For incoming Anyposes links only, redirect to the corresponding GPT Image 2.5 workspace, preserving prompt, ratio, language and referral attribution. Other direct legacy visits remain usable. Include both old and new image paths in referral collection, deduplication and statistics.

## Task 1: Specify and verify the current image default

- [x] Add a behavioral regression for browser image requests without an explicit model and SSR of the default workspace.
- [x] Run those new cases and confirm they fail for the existing GPT Image 2 default.
- [x] Keep `app/image-models.mjs` and model-less server requests compatible; change `app/model-routing.mjs`, `app/image-generation.mjs`, `app/studio.js` and `src/routes/app.tsx` to use GPT Image 2.5 for new browser work.

## Task 2: Remove promoted legacy model entry points

- [x] Remove GPT Image 2 model cards/buttons from the bilingual homepages, workspace shells and related-tool navigation; update counts and generic image links.
- [x] Route Pose handoff, Christmas prompt reuse and historical example reuse into GPT Image 2.5. Preserve original example attribution and historical URL compatibility.
- [x] Update the legacy preview to agree with the current browser default. Do not alter existing backend credit costs or enable payment collection.
- [x] Check each affected entry surface for stale links and verify targeted client/SSR tests and the production build.

## Task 3: Recheck economics independently

- [x] Verify Hong Kong Stripe fees for USD presentment/HKD settlement and distinguish international cards from local cards.
- [x] Verify Tuzi group/currency/quantity semantics and AutoDL workflow-specific pricing; inspect actual credential group only through safe, non-billable reads when available.
- [x] Calculate full-redemption contribution, mixed usage, exchange-rate sensitivity, failed-task and daily-free overhead. State unverified assumptions and distinguish current five-credit trial image policy from the proposed paid-credit policy.
- [x] Request implementation review, address findings, and deliver the local change status with a clear pricing recommendation. Deployment remains a separate action unless authorized by the user.

## Verification and audit evidence

- New browser-default request and default-workspace SSR cases failed for the old default before implementation, then passed for GPT Image 2.5.
- 27 image client/provider tests, 33 SSR/Christmas/credit-boundary tests, 46 partner/referral/visibility/admin JavaScript tests, 12 API/Neon/D1 referral tests and four focused studio routing cases passed. Seven real hydrated Chromium cases covered the current default, direct legacy EN/ZH pages, legacy query drafts, Anyposes EN/ZH redirects with prompt/ratio preservation, and Pixal3D isolation. No generation was submitted.
- Production build and TypeScript checking passed after the partner integration. Independent review found no remaining actionable issue. Broader pre-existing SEO/UI source assertions retain unrelated stale expectations; these are not represented as a passing full suite.
- Existing local Tuzi credential logs identify the exact Image 2.5 route as the `default` group at approximately CNY 0.0200004 per image. Current bounded original Image 2 requests cost approximately CNY 0.028 per call. Provider virtual USD is CNY 0.7, not a market US dollar. Higher-tier/group charges are excluded from the flat image proposal.
- Both current AutoDL workflow metadata documents list 768P at CNY 0.05/second peak and CNY 0.04 off peak. Actual AutoDL account debits were unavailable; deployed Worker secret identity was not compared to local credentials.
- At the budget rates USD/HKD 7.8 and USD/CNY 6.7, a USD 4.99 international-card payment converted to HKD incurs standard Stripe Hong Kong fees of 5.9% plus HKD 2.35, leaving CNY 29.441863 before generation. A proposed 500-paid-credit pack fully spent on Image 2.5 costs CNY 10 and leaves CNY 19.44; fully spent on peak video costs CNY 25 and leaves CNY 4.44. These are contributions before free usage, support, infrastructure, tax and failures, not net profit.
- Existing trial charging remains five credits per image and one per video second. No payment collection, paid-credit policy, deployment or commit was performed. A future 500-image offer requires a paid-credit charging design and preserved free-trial budget.
