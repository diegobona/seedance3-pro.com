# Plausible Analytics

Activated for `seedance3-pro.com` on 2026-10-22 in the existing Plausible account alongside `pixal3d.net`.

- Dashboard: https://plausible.io/seedance3-pro.com
- Reporting timezone: `Asia/Shanghai` (confirmed in General settings).
- Outbound links, file downloads and form submissions: enabled, matching Pixal3D.
- Public script: `https://plausible.io/js/pa-PZq2HOzqSHoOSYMX7k2Ws.js`.

The script URL is public installation configuration, not a secret or API credential. Get a replacement from this site's Plausible installation screen if needed; do not reuse Pixal3D's script identifier.

## Integration

`src/lib/plausible.ts` contains the official script URL and initialization snippet. The production React document in `src/routes/__root.tsx` installs them once. Plausible handles client-side navigation automatically; no manual pageview events are added.

`src/server.ts` applies the same snippet to public Pages HTML, including documents composed with live Seedance news. `HTMLRewriter` streams the result and removes stale content length and ETag headers. This avoids a second static Pages deployment. The wrapper skips non-production hosts, admin pages, HEAD requests, redirects, non-success responses and non-HTML content. APIs, assets, authentication and generation behavior are unchanged by the integration.

React development builds omit the scripts. The default tracker ignores localhost; localhost capture is not enabled. No user identifiers or custom application events are sent by this integration.

## Deployment and verification

Worker: `seedance3-blog-cms-worker`, version `3e416b7f-b1a6-4b79-a581-7251fb422e54`. Published with the existing generated Vite config and `wrangler deploy --keep-vars`; no secrets or bindings were changed.

Verified:

- Production build and TypeScript check passed.
- Existing static proxy tests: 6 passed.
- Worker runtime checks: 9 scenarios covering injection, single tracker/init, Chinese content, preserved headers and exclusions.
- Live English/Chinese homepage, blog and React workspace samples: HTTP 200, exactly one tracker and one initializer. The public tracker URL returns HTTP 200.
- Ordinary Edge browser: hydrated image workspace has one tracker and one initializer, with no captured console errors or warnings.
- Plausible's official checker displayed **Tracking is active on your site**. General settings show installation **Completed**.

The dashboard was still at zero during initial verification. Installation checks are not historical traffic; statistics accumulate from activation and do not backfill earlier visits.

Ignored verification artifacts are under `.private/plausible-*` and `.private/verify-plausible.mjs`. Screenshot: `C:/Users/zhouw/.codex/visualizations/2026/10/22/01a1640d-c17e-7190-ab35-3152d073f49f/plausible-seedance3-live.png`.

References: [Plausible script installation](https://plausible.io/docs/plausible-script), [automatic SPA navigation tracking](https://plausible.io/docs/spa-support), [Cloudflare HTMLRewriter](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/).
