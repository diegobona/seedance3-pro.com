# Shared network free credits

Effective from the 0010 rollout: each trusted request IP shares 10 free credits per Beijing calendar day across images, videos, guests and registered accounts. Registered accounts retain their separate 5-credit daily allowance; guest lifetime allowances are not renewed. Purchased credit portions do not count. Exceeding the network budget rejects the whole request and never silently switches to purchased credits.

The generation routes HMAC the Cloudflare `CF-Connecting-IP` with the server secret and the `daily-free-network` namespace. Neither browser device headers nor `X-Forwarded-For` select the budget. A reservation stores the request network snapshot; changing the account's IP cannot move earlier usage. Historical reservations lack request IPs and are not backfilled from login records.

The D1 trigger checks the shared day/network budget atomically with account debit and video task creation, before calling either supplier. Pending and settled reservations count. Failed/refunded reservations release network allowance; partial images count only delivered credits after settlement. Existing supplier-cost retry limits remain separate and retain failed-attempt costs.

This is an exact-IP control, not a unique-person limit. Shared networks share this allowance; changing networks can bypass that layer. No two-account registration restriction or device restriction is added in this phase.
