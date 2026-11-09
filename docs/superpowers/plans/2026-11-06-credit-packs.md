# Credit packs implementation plan

> For agentic workers: use subagent-driven-development for independent payment and copy tasks; review all changes before completion.

**Goal:** Local-only three-pack pricing and checkout with an absolute promotional display deadline. No deployment, live Stripe mutation, push or production migration.

**Architecture:** A frozen catalog shared by HTML generation, React checkout and server payment validation. A browser-only promotion clock hides promotional elements after the fixed UTC deadline without changing prices. Existing order snapshots remain valid for settlement.

**Tech Stack:** ES modules, React/TanStack, Stripe inline price_data, D1, Node tests, Playwright.

- [x] Catalog/UI: starter 999/700, creator 1999/1450 default/popular, studio 4999/3650 best value. Render shared cards with h2, large video counts and small credits. Link pricing directly to checkout.
- [x] Clock: one Date.UTC(2026,10,20,23,59,0), immediate render, no storage, expiry hides offer/del/countdown only.
- [x] Payment: server whitelist/default Creator; reject supplied pricing fields; local migration preserving historical orders; test exact price, credit grants, retries, expiry independence.
- [x] Copy: shared promo rate, remove retired public copy and prohibited claims, check trial model destination and 1080p support. Preserve historical financial records.
- [x] Verification: targeted tests, typecheck/build, local browser checks for all packs, missing/invalid IDs, both locales and mobile, before/after deadline. Review diff. Leave uncommitted local changes for user.

Validation: production build/typecheck passed; 32 Stripe cases plus pack-only routing case, 4 refund cases, catalog/migration/clock/public copy tests passed. Browser en/zh 1440/390 selection, requests, invalid IDs and deadline checks passed. No real payment, remote Price changes, remote migration or deployment. Trial model alias retained after route/provider inspection.
