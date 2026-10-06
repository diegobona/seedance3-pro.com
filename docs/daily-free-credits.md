# Daily free credits

Free accounts receive 15 credits per Asia/Shanghai calendar day. Unused daily
credits expire at midnight and do not accumulate. Image and video generation
share the same allowance; current charges remain 5 credits per image and one
credit per video second.

The balance endpoint and both reservation paths refresh the allowance on access,
using the database clock. No scheduled job or client-supplied date is needed.
Open workspaces reload balances at Beijing midnight and on window focus.
The shared reset instant is displayed in each visitor's browser timezone,
including its timezone abbreviation and daylight saving offset. UI text refers
to expiry at the next reset, rather than implying a midnight reset in every zone.

`credit_balance` remains the total balance. `daily_free_credits` tracks its
expiring portion, while `daily_credit_date` identifies the grant day. On first
access after migration, up to 15 remaining legacy trial credits are classified
as the daily portion; balances above that amount remain non-expiring. Paid
accounts retain their balances without a daily grant.

Reservations record the free portion used and its day. Same-day refunds restore
the original portions once. A later refund restores only non-expiring credits;
yesterday's free credits cannot enlarge today's allowance. Video failure, expiry
and stale image reservation recovery use the same rules.

Apply `npm run db:migrate` before deploying the Worker. Migration 0005 adds
columns and constraints without changing existing balances. Changes to the
daily amount or timezone must update the server policy and frontend refresh
schedule together.
