# Manual refund requests

Scope: add a per-order request, account-visible status, administrator review and Gmail notification. No code may create a Stripe refund. Existing refund-policy drafts remain local and unpublished.

- Persist one request per paid order with owner checks and atomic deduplication; save review decisions with actor and version.
- Keep request review separate from actual Stripe refund status. Verified webhooks and administrator-triggered read-only Stripe synchronization supply payment results.
- Add a user reason dialog and status details to Order history, and a protected review page for explicitly configured account IDs.
- Send owner notifications to zw83716@gmail.com through Resend Free, with the recipient fixed on the server. Persist retry state, claim delivery atomically, use a per-request provider idempotency key, and retry from the existing minute scheduler.
- Test cross-account access, CSRF, duplicate submissions, decision authorization, notification failures and retries, Stripe status synchronization, and bilingual UI.
- Verify local UI and mail delivery before releasing. Do not change live refunds or real customer orders as a test.

Email setup: use Resend Free (3,000 emails per month, 100 per day) and notify only zw83716@gmail.com. Set RESEND_API_KEY as a Worker secret and REFUND_EMAIL_FROM=refunds@notify.seedance3-pro.com. Verify notify.seedance3-pro.com in Resend using only its sending DNS records; leave receiving disabled and preserve root Namecheap MX records. The Cloudflare Email Sending paid plan is not required. The attempted free Cloudflare Routing setup was abandoned because the user could not configure a subdomain without an apex MX conflict. No root MX changes were made. Resend key, sender verification and real delivery test are pending. See https://resend.com/pricing and https://resend.com/docs/dashboard/domains/introduction.
