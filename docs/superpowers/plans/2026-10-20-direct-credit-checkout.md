# Direct credit-pack checkout implementation plan

> **For agentic workers:** Execute in the existing authorized workspace, preserving prior changes. Follow executing-plans and verification-before-completion; user already authorizes implementation and production publication.

**Goal:** Show the single USD 4.99/500-credit pack in the generator and go directly to Stripe Checkout, while shortening the daily-reset notice.

**Architecture:** Reuse the existing authenticated server-owned Checkout endpoint. Share a small browser request helper between React purchase buttons and static pricing links. React purchase buttons open login when required, resume the explicit purchase intent after email/OAuth login, and prevent duplicate clicks. Keep Pricing for discovery and Billing for order history/payment return. No changes to prices, daily grants, free-budget enforcement, or payment fulfillment.

**Tech stack:** TanStack React, browser fetch/sessionStorage, existing Stripe REST endpoint, Cloudflare Workers/Pages.

## Evidence and decisions

- Leonardo: balance Add Tokens -> purchase popup -> Buy Now: https://intercom.help/leonardo-ai/en/articles/11702713-top-up-tokens
- Comfy: choose amount in the app -> Stripe Checkout -> return to balance: https://github.com/Comfy-Org/docs/blob/main/interface/credits.mdx
- Krea: public Pricing includes one-time compute packs: https://www.krea.ai/pricing
- Recommendation for one fixed pack: show price/output/expiry directly in the generator; skip another selection page. Never imply that competing subscription restrictions apply to this product.

## Tasks

- [x] Write failing tests for authenticated Checkout request, safe Stripe URL handling, error/auth propagation, and short-lived path-bound purchase intent.
- [x] Implement `assets/credit-checkout.mjs` and `src/components/credit-pack-purchase.tsx` with single-flight request and login/OAuth resumption.
- [x] Integrate purchase controls into generator and billing; show 500 images OR 500 seconds, price, and permanent validity in the generator. Shorten the reset notice in SSR and hydrated translations.
- [x] Make both existing Pricing-page purchase links initiate checkout directly, with a login fallback. Keep Pricing and Billing reachable separately.
- [x] Verify focused tests, build/typecheck, desktop/mobile EN/ZH browser flows, rapid clicks, login resume, error/retry, and no unintended purchase from ordinary visits.
- [x] Publish verified Worker and required static assets, check live routes and preserve all production secrets. No real payments or provider generations.

## Release evidence

Worker `f9899262-8246-40fc-bbe8-8dd694f40ec3` and Pages `3956daf0` are live. Build/typecheck and 19 focused tests passed. Fourteen browser scenarios passed, covering EN/ZH desktop/mobile direct checkout, rapid clicks, email login, OAuth-style return, cancelled login, delayed login completion after cancellation, browser back, error/retry, explicit-intent-only auto-start, and static Pricing purchase links.

Independent review found a cancelled-login race; the old build reproduced one unintended checkout after a delayed login response. The fix records and synchronously cancels active login purchase intent; the regression now creates zero checkout sessions. Public HTML and both shared JS assets were verified after deployment. Browser payment calls were intercepted; no real charges or provider generations were made.
