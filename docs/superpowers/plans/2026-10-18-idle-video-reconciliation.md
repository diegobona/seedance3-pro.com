# Stop idle Neon reconciliation

**Goal:** Scheduled video work must not create a Neon store or run SQL when there are no pending video submissions/tasks. Existing settlement, refunds and two-hour expiry remain intact.

**Design:** Reuse the existing private R2 binding with a separate persistent activity prefix. Generate and store a unique local task ID before reserving credits. A tracked task-store removes markers only after confirmed terminal transitions. Cron lists R2 first and exits on an empty initialized index; while tasks are active, run the existing reconciler and clean only the captured marker snapshot using batched DB task states. Bootstrap existing unfinished tasks once. Back off database errors and retain uncertain submissions through the normal expiry/recovery window. No new database migration or Cloudflare binding is needed.

- [x] Verify R2 reference lifecycle applies only to `references/`.
- [x] Write failing tests for idle zero-SQL gate, durable submission markers, cleanup races, retries and bootstrap.
- [x] Implement activity index, tracked store and task-driven reconciler; wire start/status paths.
- [x] Verify actual SQL snapshots/allocated IDs with local PostgreSQL, existing credit and provider lifecycle regressions, typecheck and production build.
- [x] Independent review; preserve the earlier guest feature changes.

Deployment preserves already pending jobs via the one-time bootstrap. Neon is quota-suspended, so bootstrap failure persists a retry deadline rather than querying every minute. Independent release from `codex/idle-neon-polling` excludes the un-migrated guest feature.

2026-10-19 verification: 45 selected tests passed, two live-Neon integration tests
skipped; local PostgreSQL settlement and expiry tests passed. Production build,
typecheck and Wrangler dry-run passed. Worker version
`38fd7108-5737-47ed-a255-2330844de365` deployed to 100% at
2026-10-18T16:08:29Z; Chinese video page returns HTTP 200.
