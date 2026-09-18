# TanStack Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add email/password and Google authentication to the Seedance studio, expose session/logout/avatar UI, require authentication for GPT Image 2 generation, and reserve user fields for quotas, credits, and billing.

**Architecture:** Keep the existing static homepage and Blog unchanged. Serve `/app*`, `/app-assets*`, and `/api/*` from one TanStack Start Cloudflare Worker; a custom TanStack server entry delegates existing CMS API requests and cron jobs to `worker.js`, while Better Auth and the protected image endpoint use TanStack server routes. Persist authentication in Neon PostgreSQL through Drizzle and the Neon serverless driver.

**Tech Stack:** TanStack Start, React 19, Better Auth, Drizzle ORM, Neon PostgreSQL, Cloudflare Workers, TypeScript, Node test runner.

---

### Task 1: Add the TanStack Start and Cloudflare foundation

**Files:**
- Modify: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsr.config.json`
- Create: `wrangler.jsonc`
- Create: `src/router.tsx`
- Create: `src/server.ts`
- Create: `src/routes/__root.tsx`
- Create: `src/routes/index.tsx`

- [ ] Write a failing structure test for the custom Worker entry, `/app` route support, and unchanged homepage.
- [ ] Run the test and verify it fails because the TanStack files do not exist.
- [ ] Add the minimal TanStack Start scaffold and custom Cloudflare server entry.
- [ ] Install dependencies and generate the route tree.
- [ ] Run the structure test and TypeScript build.

### Task 2: Add Neon, Drizzle, and Better Auth

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`
- Create: `src/lib/auth.ts`
- Create: `src/lib/auth-client.ts`
- Create: `src/routes/api/auth/$.ts`
- Create: `drizzle.config.ts`
- Create: `drizzle/*`
- Modify: `.gitignore`

- [ ] Write failing tests for the required auth tables and reserved user fields.
- [ ] Run tests and verify they fail because the schema/config do not exist.
- [ ] Define Better Auth core tables plus role, plan, generation counters, credits, payment customer ID, and subscription fields.
- [ ] Configure email/password, optional Google OAuth, database sessions, trusted origins, and TanStack cookies.
- [ ] Generate a Drizzle migration.
- [ ] Run schema tests and TypeScript checks.

### Task 3: Build the studio authentication UI

**Files:**
- Create: `src/routes/app.tsx`
- Create: `src/components/auth-dialog.tsx`
- Create: `src/components/user-menu.tsx`
- Create: `src/styles/auth.css`
- Reuse: `app/studio.css`
- Reuse: `app/studio.js`

- [ ] Write failing UI source tests for login, registration, Google login, avatar, and logout actions.
- [ ] Run tests and verify they fail because the UI does not exist.
- [ ] Port the existing studio markup into the `/app` TanStack route without changing the homepage.
- [ ] Add a login/register dialog, Google button, session-driven avatar, and logout menu.
- [ ] Dynamically initialize the existing studio behavior after hydration.
- [ ] Run UI tests and build.

### Task 4: Require authentication for image generation

**Files:**
- Create: `src/lib/protected-image-generation.ts`
- Create: `src/routes/api/images/generate.ts`
- Modify: `app/image-generation.mjs`
- Modify: `app/studio.js`
- Modify: `worker.js`
- Test: `tests/auth-image-route.test.ts`
- Test: `tests/image-generation.test.mjs`

- [ ] Write a failing unit test proving anonymous generation returns 401 and authenticated generation reaches the provider handler.
- [ ] Run the test and verify the expected failure.
- [ ] Add the session guard and TanStack image server route.
- [ ] Disable the unprotected legacy image route and make the studio open login on 401.
- [ ] Run targeted image/auth tests, TypeScript checks, and the production build.

### Task 5: Configuration and handoff

**Files:**
- Create: `.env.example`
- Create: `docs/auth-setup.md`
- Modify: `package.json`

- [ ] Document `DATABASE_URL`, `BETTER_AUTH_SECRET`, Google OAuth credentials, callback URLs, migration, local development, and deployment.
- [ ] Verify no secret is committed and `.env.local` remains ignored.
- [ ] Run all new tests, the existing image-generation tests, route generation, TypeScript checks, and production build.
- [ ] Record the pre-existing unrelated Blog test failure separately.
