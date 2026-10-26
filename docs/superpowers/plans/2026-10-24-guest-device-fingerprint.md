# Guest device fingerprint

Add a first-party, best-effort device signal to the existing IP and signed-cookie trial restrictions. It is not an authentication identifier or a guaranteed hardware ID.

1. Add behavioral D1 tests for changed IP and cookie removal, simultaneous claims, valid-cookie continuation, existing guests and account sign-in.
2. Collect browser-independent OS, GPU, screen, CPU concurrency, timezone and available font signals. Hash locally; server HMACs the digest. Do not send raw characteristics or use a paid external service. Missing/low-information signals retain the existing IP/cookie behavior.
3. Store per-image/per-video device claims with a unique constraint; insert atomically with guest creation. Existing cookies can attach an alias but cannot overwrite another claim. Device matches must never confer resource ownership or transfer guest content to an account.
4. Send the signal on balance, generation, reference upload and image handoff requests. Update the English/Chinese privacy notice.
5. Run focused tests, build and typecheck. Apply additive D1 migration, deploy Worker and public-only Pages stage, then check production without invoking paid generation.

Limits: client signals can be spoofed or hidden; hardware/configuration changes can change a digest, and similar computers can collide. Cross-browser matching depends on browser-exposed signals. Existing IP restriction remains in place.

## Completed validation and release

- Browser module is `assets/guest-device.mjs`, shared by bundles and the public account menu. It must stay under `/assets/`: `/app/*.mjs` is intercepted by workspace document routing. Added a routing regression test after correcting this during deployment.
- Same-PC Edge and Codex Chromium produced identical digests with matching request headers. This validates that browser pair on this computer, not universal cross-browser coverage.
- Six new D1 device scenarios passed, including changed IP without cookies, simultaneous claims, older signed cookies, independent image/video allowances and sign-in. Existing guest D1 suite: 25/25. Initial focused UI suite: 71/71. Added request wiring, Apple renderer normalization, HMAC and public-path tests also pass. Final build, TypeScript and Wrangler dry-run pass.
- Independent review found two account-only balance callers missing the hint; both public account menu and React UserMenu now send it. No device-only ownership or account linking is performed.
- Expanded route checks: 49/51 passed. Two pre-existing `auth-video-route.test.ts` spy expectations omit the existing `paidOnly`/`unitCostMicros` arguments in unchanged video protection code; outside this feature.
- Production migration `0008_guest_device_claims.sql` applied. Worker `2f4e472c-a702-4f1e-8364-49a93711dc07`, Pages `1126d6ae`. Eleven final production checks pass, including exact public JS hashes, bilingual privacy notices, workspaces and read-only guest balances. Foreign-key check passes; maintenance remains off. No paid generation was submitted.
- Release manifest and verification evidence: `.private/device-release.json`, `.private/device-live-checks.json`, `.private/device-database-after.json`. Local diagnostic server stopped after validation.
