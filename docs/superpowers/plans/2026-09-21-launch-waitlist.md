# Launch Waitlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a signed-in user exhausts the free trial, show the $0.01/sec launch offer and let them join a persisted launch notification list that promises 5 bonus credits.

**Architecture:** Add an idempotent Neon waitlist table keyed by user ID, expose authenticated GET/POST handlers through TanStack Start, and connect a small browser controller to an exhausted-credit panel. The click records explicit notification consent; sending the launch email and granting the promised credits remain launch-time operations tracked by nullable fulfillment timestamps.

**Tech Stack:** TanStack Start, Cloudflare Workers, Better Auth, Drizzle ORM/Neon, vanilla browser modules, Node test runner.

---

### Task 1: Waitlist domain and persistence

**Files:**
- Create: `src/lib/launch-waitlist-response.ts`
- Create: `src/db/launch-waitlist.ts`
- Modify: `src/db/schema.ts`
- Create: `tests/launch-waitlist-route.test.ts`
- Modify: `tests/auth-schema.test.mjs`

- [x] Write failing tests for authentication, status lookup, idempotent enrollment, and the fixed 5-credit promise.
- [x] Run `npx tsx --test tests/launch-waitlist-route.test.ts tests/auth-schema.test.mjs` and confirm the missing implementation fails.
- [x] Add the `launch_waitlist` schema and minimal response/store implementation.
- [x] Run the focused tests and confirm they pass.

### Task 2: Authenticated Worker route

**Files:**
- Create: `src/routes/api/launch-waitlist.ts`
- Modify (generated): `src/routeTree.gen.ts`
- Modify: `tests/tanstack-auth-structure.test.mjs`

- [x] Add a failing structure test for the authenticated GET/POST route, same-origin mutation check, Neon store, and no-store responses.
- [x] Run the focused structure test and confirm it fails because the route is absent.
- [x] Implement the route with awaited database work and structured generic failures.
- [x] Regenerate the TanStack route tree and rerun the focused test.

### Task 3: Exhausted-trial conversion panel

**Files:**
- Create: `app/launch-waitlist.mjs`
- Create: `tests/launch-waitlist-client.test.mjs`
- Modify: `src/routes/app.tsx`
- Modify: `app/legacy-preview.html`
- Modify: `app/studio.js`
- Modify: `app/studio.css`
- Modify: `tests/studio-routing.test.mjs`

- [x] Write failing controller and markup tests for the exact offer, one-click join, joined state, auth recovery, and zero-balance visibility.
- [x] Run the focused tests and confirm they fail for the missing controller/panel.
- [x] Implement the panel and client controller; wire visibility to the existing credit summary.
- [x] Run the focused tests and confirm they pass.

### Task 4: Migration and focused verification

**Files:**
- Create (generated): next `drizzle/*.sql` migration and metadata snapshot.

- [x] Generate the Drizzle migration with `npm run db:generate`.
- [x] Run the affected Node and TypeScript tests.
- [x] Run `npm run build` once.
- [x] Apply the migration with `npm run db:migrate` and verify the table exists.
- [x] Confirm branch is `main`, the staging area is empty, and no commit was created.
