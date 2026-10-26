# Stripe credit packs

One authenticated real account can buy 500 nonexpiring credits for USD 4.99 through one-time Checkout. Purchasing does not change the account plan or the daily grant. The browser cannot choose the owner, price, quantity, currency, amount, or credits.

## Configuration

Apply D1 migrations `0005_credit_budget.sql` and `0006_stripe_payments.sql` before enabling billing. Runtime configuration:

| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | Secret (`sk_`) or restricted (`rk_`) API key for the selected mode; never expose to the browser |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this endpoint in the same mode |
| `STRIPE_PRICE_ID` | Active one-time USD price with `unit_amount=499` |
| `STRIPE_MODE` | `test` or `live`, matching the API key and all payment resources |
| `STRIPE_ACCOUNT_ID` | Optional account pin, checked using `GET /v1/account`; intended account `acct_1USWJ8Ch02ZYT6pO` |

Missing or invalid configuration disables checkout. Test mode is accepted only on `localhost`, `127.0.0.1`, or `[::1]`; public hostnames disable checkout and reject webhook fulfillment in test mode. Never install test credentials against the public production database. Local Stripe CLI forwarding can exercise the localhost endpoint against a separate local D1 database.

For a restricted runtime key, grant account/price/PaymentIntent/charge read access and Checkout Session read/write access, including access to expanded payment resources. Provisioning products, prices, and webhook endpoints uses separate setup permissions. Refund and dispute events are handled without issuing financial mutations; a key-permission failure disables the affected operation with a generic 503 and never grants credits.

The REST client pins API version `2025-02-24.acacia`. Create a **snapshot**, **your account** webhook endpoint at `/api/billing/webhook`, using these events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired` (acknowledged without issuing credits; used for a no-charge public delivery check)
- `charge.refunded`
- `refund.created`
- `refund.updated`
- `charge.dispute.created`
- `charge.dispute.funds_withdrawn`

Checkout is card-only, with one line item and no promotions, automatic tax, or adaptive currency conversion. Setup never makes a real charge. Verification uses Stripe test-mode payments/refunds; live permission and transport probes create unpaid Checkout Sessions and immediately expire them.

## HTTP contract

All responses use `Cache-Control: no-store`. Errors use `{ "error": "...", "code": "..." }`.

`POST /api/billing/checkout` requires an authenticated account and an `Origin` matching the request URL. Optional JSON `{ "locale": "zh" }` selects the Chinese return page. Returns `{ "url": "https://checkout.stripe.com/..." }`. Known errors include `AUTH_REQUIRED` (401), `INVALID_ORIGIN` (403), `BILLING_HOLD` (403), and `BILLING_UNAVAILABLE` (503).

`GET /api/billing/history` returns only the signed-in account's latest 50 orders:

```json
{
  "checkoutEnabled": true,
  "billingHold": false,
  "orders": [{
    "id": "internal-order-id",
    "sessionId": "cs_...",
    "createdAt": "2026-10-20T00:00:00.000Z",
    "status": "paid",
    "amount": 499,
    "currency": "usd",
    "credits": 500,
    "revokedCredits": 0
  }]
}
```

Order status is `pending`, `paid`, or `reversed`. Cancellation or failed payment leaves an uncredited pending record. The success redirect is not proof of payment; show confirmation only once the history record is paid.

`POST /api/billing/webhook` reads at most 256 KiB of raw UTF-8 payload, verifies a Stripe HMAC-SHA256 signature using Web Crypto and a five-minute timestamp tolerance, and rejects the wrong mode or account. The handler retrieves the current Checkout Session and expanded line item, PaymentIntent, and charge before fulfillment. It matches the server's persisted order owner, price, mode, amount, currency, and quantity. Current refunds or disputes block fulfillment even if their separate webhook has not arrived.

## Atomicity and reversals

`stripe_order` stores immutable purchase terms and credited/revoked/actually removed credit counters. Unique session and PaymentIntent identifiers prevent a payment from funding two orders. D1 transactions and state-transition triggers apply a grant once; an update failure rolls back the event and order together. `stripe_event` stores processed identifiers without raw payment payloads. `stripe_reversal` records PaymentIntent tombstones so a refund or dispute arriving before the completion event cannot grant credits later.

Any pending or successful refund (including a partial refund), or a dispute, conservatively reverses the entire pack, removes up to 500 available permanent credits, preserves daily credits, and sets the account's `billing_hold=1`. No new generation or checkout is allowed while held. This is deliberate because an aggregate permanent balance cannot identify exactly which purchased pack funded each past generation. Repeated reversal events remove no additional credits.

Failed/canceled refund updates and a won dispute **do not automatically clear** a hold or restore credits. Support must reconcile the financial outcome first. This includes unused full refunds: the conservative implementation still requires review.

Before manually releasing an account, review all its `stripe_order` rows, the corresponding Stripe PaymentIntents/refunds/disputes, `stripe_reversal`, generation reservations (including pending and subsequently refunded reservations), and current permanent balance. The difference between `credited_credits` and `removed_credits` on a reversed order identifies credits that were not removed at reversal; resolve any still-spendable returned credits or consumed-credit debt and settle pending tasks before removing the hold. Record the reconciliation and any balance adjustment as an audited administrative operation. Never clear `billing_hold` solely because the available balance is nonnegative, the refund failed, or a single dispute closed.

## Verification

Run `npx tsx --test tests/stripe-payments.test.ts`. The tests use isolated local Miniflare D1 databases and mocked Stripe HTTP responses. They cover signature tampering/expiry, mode isolation, owner isolation, server pricing, duplicate/concurrent fulfillment, transaction rollback, refund replay, out-of-order reversal, consumed balance protection, guest rejection, and oversized payload rejection.

Implementation references: [Stripe webhooks](https://docs.stripe.com/webhooks), [Checkout creation](https://docs.stripe.com/api/checkout/sessions/create), [Checkout retrieval](https://docs.stripe.com/api/checkout/sessions/retrieve), [refunds](https://docs.stripe.com/refunds), and [D1 transactional batch execution](https://developers.cloudflare.com/d1/worker-api/d1-database/).

## Release verification — 2026-10-20

Worker version `d40a0d6e-c886-448a-8993-37691a15ec69` and Pages deployment
`fd951be1` are live. D1 migrations 0005 and 0006 were applied with the maintenance
guard active; account/reservation counts were preserved, balance checks passed,
and `foreign_key_check` returned no violations. Maintenance is disabled.

The real Stripe test-mode hosted Checkout completed and was refunded. Replayed
completion events granted exactly 500 once; replayed refunds revoked the pack
once and held the account. Those test payment events were retrieved through the
Stripe API and locally signed for isolated-D1 replay. Separately, a real live-mode
`checkout.session.expired` event was delivered to the public production endpoint
and acknowledged (`pending_webhooks=0`, with this endpoint the sole subscriber).
No real payment was made. This verifies public delivery independently of the
test-mode accounting test.

English/Chinese browser checks cover guest login, authenticated purchase enablement,
and Checkout navigation. Production checks cover billing/pricing/model routes,
Anyposes redirection, anonymous request rejection, invalid signature rejection,
and static deployment parity. Review regressions cover claimed guest identity
handling for generation, polling, and image-to-video transfers.

Build/typecheck and the focused accounting, payment, UI, and guest regression
suites passed. This release does not claim a clean full repository suite:
previous broad JavaScript runs include unrelated stale homepage/SEO assertions.
Secrets and detailed QA evidence remain in ignored local files.
