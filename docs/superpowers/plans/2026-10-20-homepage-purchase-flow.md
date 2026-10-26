# Homepage purchase flow implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Preserve the current shared dirty workspace; no commits or resets are part of this task.

**Goal:** Let users try, sign in, buy the existing USD 4.99 / 500-credit pack, and resume creation from the homepage without entering the workspace.

**Architecture:** Keep the static homepage and its generator. Add a lazy browser auth popup backed by the existing Better Auth service. A shared homepage purchase controller saves the existing IndexedDB draft before OAuth or Stripe navigation, uses the existing checkout helper with an allowlisted homepage return target, and verifies payment through owner-scoped billing history. Account and generator consumers refresh from shared auth/payment events.

**Tech Stack:** Plain browser ES modules, Better Auth client, Vite, existing Cloudflare Worker/D1 Stripe endpoints, Node tests and isolated Playwright fixtures.

## Accepted behavior

- Guest top action remains Try for free. Signed-in action becomes Buy credits. Keep existing balance/avatar and avoid another package card.
- Guest allowance exhausted: main action opens homepage register/login popup. Signed-in insufficient balance: same main action buys 500 credits for US$4.99 rather than becoming disabled.
- One-time pack price, credit count, purchased-credit permanence remain consistent. Daily guest usage merges into the daily allowance; no additional free grant or supplier-cost disclosure.
- Checkout goes directly to Stripe, returns to the original language homepage, restores prompt, all nine references, mode, duration and ratio, and refreshes balance. Never automatically generate after payment or login.
- Closing or cancelling auth clears purchase intent; an ordinary later login cannot initiate checkout. Guard repeat clicks. OAuth callback resumes only explicit, fresh, same-path purchase intent.
- Keep pricing details available in footer/account menu as Credits / 积分包; do not add a primary navigation item or mandatory billing-page stop.
- Payment query parameters alone do not prove payment. Match returned session against authenticated server billing history; pending webhook results remain pending and bounded polling refreshes the balance only after verification.

## Tasks

- [x] Backend: test and add optional exact '/' and '/zh/' returnTo support in src/lib/stripe-payments.ts; preserve existing billing checkout destinations and all payment validation.
- [x] Auth module: implement app/home-auth.mjs plus standalone Vite build and focused verification. Reuse existing auth API/client, localized modes, Google/email, cancellation and focus behavior.
- [x] Homepage controller: extend assets/credit-checkout.mjs only with optional returnTo; add app/home-purchase.mjs for single-flight auth/checkout, draft-save event contract, cancellation/OAuth intent and history verification.
- [x] Generator: update app/home-video.mjs and EN/ZH HTML to expose correct state actions, preserve draft before navigation, refresh auth/balance safely and retain explicit paid-only fallback when daily free budget is exhausted but purchased credits exist.
- [x] Shared header: make existing Try for free switch to Buy credits on homepage, open homepage auth from account login, add localized Credits details links in footer/account menu. Version static assets and sync shared navigation.
- [x] Verification: reproduce missing exhausted-account purchase behavior first; run focused network/state/backend tests, build/typecheck, and mocked browser flows for guest-to-login, exhausted-to-Stripe, return/restore, cancel, duplicate clicks, EN/ZH/mobile and delayed fulfillment.
- [x] Review and release: independently review integration, fix blockers, stage only public assets, dry-run Worker, deploy Worker then Pages, verify live UI/assets with API-intercepted browser flows. No real payment or generation during QA.


## Verification and release

- Build and TypeScript check passed.
- 52 focused frontend/auth/reference tests passed; 23 Stripe/accounting tests passed.
- Eight homepage purchase browser scenarios passed locally and against the deployed public assets with all payment/auth/generation APIs intercepted.
- Six existing multi-reference browser scenarios passed.
- Seven live public assets exactly matched release files; both localized homepages contain the new controls.
- Independent review blockers resolved. No real payment or generation was made during QA.
- Worker: b1c528c7-fdc4-4645-b074-9dca32acca8f. Pages: 940e8270.
