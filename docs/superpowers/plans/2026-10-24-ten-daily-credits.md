# Ten Daily Credits Implementation Plan

> **For agentic workers:** Execute inline using superpowers:executing-plans; the user's existing working changes must be preserved.

**Goal:** Give registered accounts 10 shared daily credits and align image/video limits and public copy.

**Architecture:** Keep one credit per image/video second. Change the shared server policy, signup defaults, D1 credit rules and existing-account daily balances. Use available account credits to disable unaffordable quantities and durations, retaining longer video options for funded accounts.

**Tech Stack:** TypeScript, JavaScript, Drizzle, SQLite/D1, React, Node test runner.

### Task 1: Credit accounting
- [x] Update/add behavioral tests for 10-credit signup, daily renewal, mixed image/video usage and the current daily allowance.
- [x] Run the tests and verify the expected failures.
- [x] Update shared policy/defaults and add D1 migration 0007, applying the ten-credit daily policy.
- [x] Run D1 credit, auth, reconciliation and payment tests.

### Task 2: Generation limits and copy
- [x] Test affordable account image/video selections and 10-credit balance metadata.
- [x] Apply balance-aware controls and update English/Chinese studio, billing, homepage and pricing copy.
- [x] Rebuild generated homepage assets and update current allowance documentation.

### Task 3: Verification
- [x] Run the JavaScript tests, relevant TypeScript/D1 tests, build and type check.
- [x] Review the task's diff and verify no stale current daily-15 copy remains. Deploy after the user explicitly requests release.

## Validation results

- 48 D1, authentication, guest reconciliation and Stripe tests passed.
- 80 focused UI and credit-control tests passed.
- 39 route, billing and image-credit policy tests passed.
- Production build and TypeScript check passed.
- Full JavaScript suite: 430 passed, 34 failed on unrelated page, navigation and previous-model expectations. Logs: `.codex-temp/ten-daily-full-tests.log`.
- After explicit user authorization, production migration 0007, Pages and Worker were published.

## Final scope

The user confirmed there are no paying customers and requested no old-task or refund compatibility work. Removed the added migration-debt field, related triggers and old-task tests. Scope is the 10-credit daily grant, signup defaults, generation limits and bilingual copy.

## Production release — 2026-10-24

- Worker `7a30e6a5-7ae6-4a91-9a20-7fe5c98ce17c` serves 100% of production traffic.
- Pages deployment `15756005` publishes the bilingual copy and client limits.
- Migration `0007_ten_daily_credits.sql` applied; no pending migrations. Today’s stored daily allowance is at most 10, account count is preserved and foreign key checks pass.
- Maintenance is disabled. Homepage, pricing and both image/video workspaces in English and Chinese display 10 credits.
