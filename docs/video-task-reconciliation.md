# Video activity and Neon idle usage

The minute schedule still handles legacy CMS work. Video reconciliation first
lists the existing private `VIDEO_REFERENCES` R2 bucket under the separate prefix
`video-reconciliation/v1/`. Once bootstrapped, an empty task index returns before
creating a database client or executing SQL. No periodic Neon sweep runs while
the video system is idle.

## Submission and recovery

The start route generates a task UUID and awaits an R2 marker before the atomic
Neon reservation. The same UUID is inserted into `video_generation_task`, so a
crash after reservation leaves a discoverable marker. If R2 cannot record it,
no credits are reserved and no provider request is submitted. Insufficient credit
removes the unused marker; ambiguous database outcomes retain recovery.

Start/status routes and the background reconciler remove markers after confirmed
success, failure, submission failure or expiry. R2 deletion errors cannot roll
back settlement/refunds: cron repairs stale terminal markers with a batched SQL
status read. It deletes only markers in its captured snapshot, preserving new
concurrent submissions. Submitting, queued, leased and not-yet-due tasks retain
their markers, including the original two-hour expiry/refund mechanism.

An uncertain submission with no database row retains its marker for three hours
before a successful SQL lookup may remove it as an orphan. This is a conservative
recovery margin beyond task expiry, not a substitute for an indefinitely delayed
database transaction timeout.

## First deployment and database outages

Bootstrap discovers at most 100 existing unfinished tasks per invocation and
persists a cursor only after all markers in that page are written. A failed page
retries from the last completed cursor. Expiry and provider reconciliation still
run between pages. Only the final page writes the initialized sentinel. Each R2
snapshot captures at most 200 task markers, and marker removals use batched deletes;
the global SQL expiry/claim operations continue to cover all unfinished jobs.
After an empty bootstrap, later idle ticks execute zero SQL.

Database/bootstrap failures persist a retry deadline in R2: 1, 2, 4, 8, then at
most once every 15 minutes. Failed activity reads do not fall back to querying
Neon. Provider retries keep the existing per-task backoff. Successful passes clear
the database cooldown. Existing quota exhaustion is not reversed by this change.

## Storage and deployment

No database migration, new binding or new bucket is required. The live
`expire-references` lifecycle rule was checked on 2026-10-18: it applies only to
`references/`. The reconciliation prefix and its initialized sentinel must remain
excluded from lifecycle expiry. R2 bindings provide strongly consistent list,
write and delete operations; no cache or eventually consistent shared idle flag
is used.

This first rollout takes advantage of the already confirmed Neon HTTP 402 quota
suspension: keep SQL blocked while deploying the tracked writer to 100% of traffic
and letting previous generation requests finish. Failed bootstrap cannot initialize
the index; its first successful scan happens after database recovery. Do not roll
back to an untracked writer after initialization. For a rollout while SQL is live,
drain old writers before bootstrap, or reset both the `initialized` and `bootstrap`
control objects and rescan after the old writers have finished. A paginated scan
alone cannot discover a legacy insert committed behind its cursor after the scan.

Run `npx tsx --test tests/video-task-activity.test.ts tests/video-task-activity-db.test.ts tests/video-task-reconciler.test.ts`.
The SQL integration tests use local PostgreSQL (PGlite), without paid generation
requests or the quota-suspended live Neon database.
