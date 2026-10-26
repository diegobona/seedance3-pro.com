# Daily free credits

All signed-in accounts, including purchasers, receive 5 credits per Asia/Shanghai calendar day. Unused daily
credits expire at midnight and do not accumulate. Image and video generation
share the same allowance; current charges are 1 credit per delivered image and one
credit per video second at 768p.

The daily allowance covers at most 5 delivered images (up to 3 per request)
or one 5-second video, with images and videos sharing the same 5 credits.
Controls disable quantities and durations above the available balance. Purchased
credits can fund additional outputs, including the supported 10- and 15-second video options.

The balance endpoint and both reservation paths refresh the allowance on access,
using the database clock. No scheduled job or client-supplied date is needed.
Open workspaces reload balances at Beijing midnight and on window focus.
The shared reset instant is displayed in each visitor's browser timezone,
including its timezone abbreviation and daylight saving offset. UI text refers
to expiry at the next reset, rather than implying a midnight reset in every zone.

`credit_balance` remains the total balance. `daily_free_credits` tracks its
expiring portion, while `daily_credit_date` identifies the grant day. On first
access after migration, up to 15 remaining legacy trial credits are removed
before the new 5-credit daily allowance is granted; balances above the historical
15-credit trial amount remain non-expiring. Paid
accounts retain their permanent balances and also receive the daily grant.

Reservations record the free portion used and its day. Same-day refunds restore
the original portions once. A later refund restores only non-expiring credits;
yesterday's free credits cannot enlarge today's allowance. Video failure, expiry
and stale image reservation recovery use the same rules.

Production uses D1. Apply `wrangler d1 migrations apply seedance3-production --remote`
under the write-maintenance guard before deploying the new Worker. D1 migration
0005 adds the cost ledger and guest reconciliation and converts guest image
balances and reservations from five-credit units to one-credit units. Migration
0006 adds Stripe orders and exactly-once fulfillment/reversal triggers. Migration
0007 reduces today's remaining daily allowance by up to 5 credits, preserves the
permanent balance and replaces debit, refund and partial-settlement triggers with
the previous 10-credit policy. Migration 0009 reduces today's remaining registered
allowance by up to another 5 credits, preserving purchased credits and today's usage,
and updates defaults, debits, refunds and partial settlements to the 5-credit policy.
Guest allowances remain unchanged. It also normalizes new rows using SQLite's historical default.
Apply migrations before deploying the matching application policy.

The daily free supplier-cost budget is independently capped at CNY 1. Reservations
use conservative ceilings of CNY 0.03 per image and CNY 0.06 per video second;
pending work and potentially billed failures retain their cost entries even when
credits are returned. Reaching the cap requires waiting for the next Shanghai day
or explicitly choosing purchased credits. Guest image and video identities share
their trusted-network cost budget. On login, today's guest usage is counted
toward the account's 5 credits, and the claimed guest allowance cannot be reused.

USD 4.99 purchases 500 permanent credits. See [Stripe credit packs](stripe-payments.md)
for payment verification, refund holds, and operational reconciliation.
