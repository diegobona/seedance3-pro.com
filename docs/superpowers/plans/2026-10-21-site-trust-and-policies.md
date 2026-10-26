# Site trust and policies implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement the bounded tasks below. Preserve all existing shared-workspace changes; no commits, resets or production deployment are included.

**Goal:** Correct the Chinese homepage image price and make bilingual operator, support, refund, privacy and service information available before purchase.

**Architecture:** Keep the existing static public pages and React billing/workspace. Share operator/contact/link metadata and footer rendering through a small browser-safe module, create bilingual static policy pages, and link them from synchronized public footers and purchase surfaces. Keep payment and generation behavior unchanged.

**Tech Stack:** Existing JavaScript modules, HTML/CSS, React, Node test runner, Vite and TypeScript.

## Accepted content

- Operator: ColdStone Technology Co., Ltd. (Chinese name supplied by user: ColdStone 科技有限公司). Do not invent incorporation details, address, registration number or affiliations.
- Contact: normalize the user's incomplete Gmail address to zw83716@gmail.com and make it clickable.
- Correct zh/index.html to 1 credit/image, consistent with current pricing and server constants.
- Refunds: request within 7 calendar days for a completely unused purchased pack; duplicate billing and verified non-delivery reviewed separately. No routine partial refunds for used packs; preserve mandatory consumer rights. Manual application by account email/order/date/reason, no card details. Initial support reply target: 2 business days; approved original-method refunds generally reach the bank in 5–10 business days, subject to Stripe/bank processing. Describe existing refund/dispute credit revocation and review holds honestly.
- Privacy: describe only verified collection, local storage, infrastructure/model/payment sharing, retention and email-based rights requests. No unsupported no-training, fixed deletion, security certification or automatic account deletion claims.

## Tasks

- [x] Review current privacy and refund implementation and Stripe primary documentation.
- [x] Add meaningful footer synchronization/idempotence and SSR purchase-link checks; observe the expected missing-support failures.
- [x] Add shared metadata, accessible responsive footer/support styles, bilingual About/Privacy/Refund/Terms pages.
- [x] Correct homepage rate; connect shared public footers, homepage purchase guidance, static pricing and React purchase/billing surfaces.
- [x] Run focused tests, production build/typecheck, local desktop/mobile visual and link checks.
- [x] Obtain independent review, resolve actionable findings, and report exact local/deployment status.

## Verification evidence

- Footer and billing SSR checks failed for the missing contact/policies, then passed after integration. A localization refresh regression failed for stale purchase disclosures and passed after synchronization was corrected.
- 27 JavaScript navigation/checkout/homepage/credit checks and 7 billing/workspace SSR checks passed (34 total).
- Final `npm run build` passed, including TypeScript checking. Build output is retained locally in `.codex-temp/trust-build.log`.
- Checked all 64 static public footers for exactly one trust block and the correct email; all 8 policy URLs and the shared stylesheet returned HTTP 200 locally.
- Browser verification covered homepage-to-refund navigation, Chinese/English switching, readable policy layout, and 390px iframe viewports for Chinese refund and pricing pages, including the purchase-adjacent policy links.
- Independent review identified missing guest-trial disclosure. Both privacy pages now cover guest IDs, IP-derived network identifiers, one-year guest cookies and account reconciliation; review confirmed no remaining material issues.
- No real payment or generation was submitted. No production deployment or commit was performed; existing unrelated work is preserved.

## Production release — 2026-10-21

The user subsequently explicitly authorized publishing to production.

- Repeated production build/typecheck and all 34 focused tests successfully; Worker dry run passed.
- Built a dedicated public-only Pages snapshot (1,467 files), excluding secrets, private files, source working materials, logs and tests. Media copying was restricted to referenced public files.
- Pages production deployment: `ff380369` (`https://ff380369.seedance3-pro-com.pages.dev`).
- Worker production version: `a20b56ee-edd3-41ba-81de-3129786628ea`, deployed with `--keep-vars`; existing secrets and database/resource configuration were preserved. No migrations were run.
- Formal-domain HTTP verification passed for 14 EN/ZH homepage, pricing, billing and policy URLs. Five key public assets exactly match the local release bytes. Verified the corrected Chinese image rate, operator, clickable support email, policy links, seven-day unused-pack refund condition and guest privacy disclosures. Verification uses the site's existing language preference cookie to avoid confusing normal geographic language redirects with content mismatches.
- Independent read-only verification confirmed the live About, Privacy, Refund and Terms content. A final in-app browser capture was attempted twice but timed out; live HTTP/content checks succeeded independently.
- Release evidence and packaging manifest are kept under ignored `.private/trust-*` files. No real payment or generation was submitted, and no commit was made.
