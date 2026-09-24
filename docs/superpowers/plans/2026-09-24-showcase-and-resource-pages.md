# Showcase and Resource Pages Implementation Plan

**Goal:** Turn the existing showcase into a gallery of real site examples, connect published tools and content from the homepage, and publish honest Coming Soon resource pages.

**Architecture:** Keep the established static homepage and showcase URL. Reuse the MiniMax H3 videos, GPT Image 2 example images, and Pose demonstration already present on the site. Add server-rendered TanStack routes for the prompt guide and two model case indexes so their deep URLs are served reliably by the Worker; keep these thin pages noindex and out of the sitemap.

**Tech stack:** Static HTML/CSS/JS, TanStack React Start, Cloudflare Worker routes, Node tests.

## Tasks

1. Write failing tests for real showcase media, navigable live pages, Coming Soon route metadata, sitemap exclusion, and Worker route coverage.
2. Replace `showcase.html` placeholder scenario cards with video, image, and Pose sections, reusing current media and the existing video dialog behavior; add focused styles.
3. Expand the homepage navigation and footer with links to the available H3, GPT Image 2, Pose, Showcase, and Blog pages. Add relevant Showcase links on model landing pages.
4. Add `/prompt-guide`, `/prompts/minimax-h3/videos`, and `/prompts/gpt-image-2/images` as noindex Coming Soon pages with links back to active tools, then route them through the Worker.
5. Update the URL map, run focused and full tests, build, and inspect rendered pages on desktop and mobile.

**Out of scope:** Changing the existing Features/FAQ capability statements, creating prompt or case detail pages, adding pricing/API pages, and deployment.
