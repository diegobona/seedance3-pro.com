# Indexable Model Tool Pages Implementation Plan

**Goal:** Give the two usable models their own crawlable tool pages, preserve Pose pages, and reserve future content URLs without publishing empty pages.

**Architecture:** Reuse the existing React studio for model routes under `/app/video/` and `/app/image/`; render unique server-side model copy, one H1, and self-canonical metadata on each. Keep `/app/` for the Pose editor and generic workflow with `noindex`. Redirect legacy model guide URLs and model query URLs to the new canonical routes. Continue serving the static homepage, Pose pages, blog and existing articles. Exclude future prompt/case routes from navigation, sitemap and index until there is content.

**Tech stack:** TanStack React Start, Cloudflare Worker routes, static HTML, Node tests.

## Work

1. Add tests for model route mapping, metadata/SEO content, legacy redirects, sitemap and noindex boundaries; verify they fail.
2. Extract the existing studio component for reuse, map model URLs to initial model state and make model switching navigate between public model routes.
3. Create model-specific routes with unique content and metadata; add shared presentation styles.
4. Update homepage and relevant static links to the canonical model URLs; add Cloudflare redirects for old model guide and query URLs.
5. Add the new URLs to sitemap, remove redirected guide URLs, and preserve `/pose-to-image` and the pose article URLs. Document deferred URL patterns for `/prompt-guide` and `/prompts/{model}/videos/{slug}`.
6. Verify focused tests, all tests, build and rendered HTML; inspect changed files and report deployment status.

**Out of scope:** Changes to `/pricing.html`, new API page, new prompt guide or case content, publishing or deploying.
