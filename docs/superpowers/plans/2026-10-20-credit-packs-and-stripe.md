# Daily credits and Stripe packs implementation plan

> **For agentic workers:** Use test-driven development and narrowly scoped parallel implementation. Existing uncommitted H3 and referral changes must be preserved.

**Goal:** Daily 15 shared free credits for every real account, one credit per image or video second, a CNY 1 daily free supplier-cost limit, and a USD 4.99 / 500-credit one-time Stripe pack.

**Architecture:** Retain the existing D1 balance and reservation ledger. Add atomic cost reservations and guest/account reconciliation; keep persistent balances distinct from daily credits. Stripe purchases are server-priced, authenticated, webhook-verified and fulfilled once. UI shows separate balances and explicit debit composition.

**Tech Stack:** TanStack Start, React, Cloudflare Workers/D1, TypeScript, Web Crypto, Stripe Checkout.

**Authorization:** User approved implementation and subsequently authorized production deployment after validation. No subscriptions, real test charges, or speculative provider generations. Stripe dashboard account is `acct_1USWJ8Ch02ZYT6pO` (seedance3pro); verify configured account before live setup. Preserve the current working branch and pre-existing changes.

## Approved behavior

- Daily 15 credits, Asia/Shanghai midnight, expires daily, including purchasers.
- Guest lifetime 2 images + 10 seconds; today's spent/reserved guest allowance counts toward the same 15 when linked to a signed-in account.
- Current image models cost 1 credit/output; H3 768p costs 1 credit/second.
- USD 4.99 buys 500 nonexpiring credits; no bonus or recurring payments.
- Free first, then permanent credits; display debit before submission.
- Supplier free cost cap CNY 1 per identifiable user/day including pending work and potentially billed failures. Maintain independent cost and credit records. Paid-only continuation must be explicit if free budget is exhausted.
- Confirmed generation failures refund original credit source; expired daily refunds never inflate today's grant. Partial image delivery charges delivered outputs only.
- Payment success verified server-side, exactly once; cancellation grants nothing. Refund/reversal handling cannot leave both money and spendable corresponding credits.
- Order/credit history, EN/ZH pricing, existing GPT2 hiding and Anyposes redirects retained.

## File boundaries and sequence

### Ledger and budget
- D1 migration `0005_credit_budget.sql`, D1/Neon credit stores, daily SQL, guest stores, generation credit policy, focused D1 tests.
- Add balance breakdown and cost reservation support without breaking existing task-store contracts.
- Test concurrent debits, all-account daily refresh, cross-day refunds, cost cap after billed failures, guest reconciliation, and split free/paid use.

### Payments
- New `src/lib/stripe-*.ts`, `src/db/stripe-*.ts`, API billing routes, D1 migration `0006_stripe_payments.sql`, payment tests.
- Server owns amount/currency/credits. Checkout requires same-origin authenticated request. Verify signed bounded webhook input, correct account mode, currency/amount and purchase owner. Fulfillment transaction is idempotent.
- Expose `/api/billing/checkout` POST, `/api/billing/history` GET, `/api/billing/webhook` POST. Checkout response `{url}`; history response documented with UI owner.
- Fail closed without Stripe configuration. Test mode first. Never log secrets.

### User interface
- Account balance separates `dailyRemaining` and `paidRemaining`, purchase button, billing page, generation debit preview, English/Chinese copy and pricing.
- Build against the existing balance endpoint with additive fields. Billing page calls API contracts above.
- Cover guest/user display, purchase redirect/status and debit split.

### Integration (root)
- Generation routes supply model-specific costs, reconcile guest identity before balance/generation, enforce partial success/refund semantics.
- Update binding declarations and example environment, documentation, route generation, migrations and compatibility tests.
- Inspect Stripe dashboard access using available tools; configure test/live only through authorized access. Report missing keys if unavailable, without exposing them.
- Test D1 migration on existing balances, backend tests, UI hydration and build; review deployment artifacts.
- Deploy only verified artifacts and required compatible migrations. If external Stripe credentials are unavailable, keep purchase safely disabled and accurately report the remaining activation step.

## Execution checklist

- [x] Review plan against approved behavior and current database.
- [x] Write failing tests for accounting/budget and payment invariants.
- [x] Implement ledger/budget/guest changes and verify.
- [x] Implement Stripe checkout, fulfillment, history and refund/reversal protections.
- [x] Implement UI and generation integration.
- [x] Verify runtime, migrations, build and independent review.
- [x] Configure Stripe test environment and run end-to-end test when credentials are available.
- [x] Deploy authorized verified changes; activate live payments only with validated live configuration.

Release evidence is recorded in `docs/stripe-payments.md`. Independent review
found three claimed-guest resource access regressions; all were fixed and verified
against real route handlers and isolated D1 before deployment. Live Stripe
permission checks used unpaid, immediately expired sessions. Production public
webhook delivery was verified with a real expiration event, without a charge.
