# Search page and URL map

This map records the page that owns each search intent. Primary navigation and `sitemap.xml` include published pages and the clearly labeled Muse and Seedance 3.0 workspaces and Prompt Libraries. Other upcoming resources can appear in the footer while remaining noindex.

| Intent | Canonical URL | Status |
| --- | --- | --- |
| Seedance 3 brand and platform | `/` | Published, indexable |
| Seedance 2.5 video workspace | `/app/video/seedance-2-5` | Functional direct URL; hidden from navigation, noindex, absent from sitemap |
| MiniMax H3 text-to-video and image-to-video tool | `/app/video/minimax-h3` | Published, indexable |
| GPT Image 2 generation and editing tool | `/app/image/gpt-image-2` | Published, indexable |
| GPT Image 2.5 generation and editing tool | `/app/image/gpt-image-2-5-1k` and `/zh/app/image/gpt-image-2-5-1k` | Tuzi routing alias `gpt-image-2.5-1k`; independently selectable, indexable, included in bilingual sitemap; 5 credits/image per image |
| Muse Video workspace | `/app/video/muse-video` | Editable workspace preview; generation unavailable, indexable, included in bilingual sitemap |
| Muse Image workspace | `/app/image/muse-image` | Editable workspace preview; generation unavailable, indexable, included in bilingual sitemap |
| Seedance 3.0 workspace | `/app/video/seedance-3` | Editable workspace preview; generation coming soon, indexable, included in bilingual sitemap |
| AI pose generator | `/pose-to-image` | Published, indexable; primary phrase in Title/H1; existing URL retained |
| Pose reference examples | `/pose-reference-camera-angle-examples` | Published, indexable; existing URL retained |
| Generic and Pose workspace | `/app/` and `/app/?model=pose-to-image` | Functional, noindex |
| Nano Banana 2 Lite model information | `/nano-banana-2-lite` | Tool unavailable; noindex, absent from sitemap |
| Creative showcase | `/showcase` | Published, indexable; editable Pose scenes featured above the Video Prompt Library |
| Blog and existing articles | `/blog` and existing article URLs | Published; existing URLs retained |
| Prompt guide | `/prompt-guide` | Coming Soon page; noindex, absent from sitemap |
| MiniMax H3 Prompt Library | `/minimax-h3-prompts` | Published, indexable; original H3 examples inside the studio layout |
| GPT Image 2 Prompt Library | `/gpt-image-2-prompts` | Published, indexable; original images inside the studio layout |
| AI Christmas photo prompts | `/ai-christmas-photo-prompt` | Seasonal photo template collection; indexable, included in bilingual sitemap |
| Muse Video Prompt Library | `/muse-video-prompts` | Starter video templates with workspace prefill; no generated examples, indexable, included in bilingual sitemap |
| Muse Image Prompt Library | `/muse-image-prompts` | Starter image templates with workspace prefill; no generated examples, indexable, included in bilingual sitemap |
| Seedance 3.0 Prompt Library | `/seedance-3-0-prompts` | Reserved Coming Soon content inside the studio layout; indexable, included in bilingual sitemap |
| Original H3 video cases | `/minimax-h3-prompts/{slug}` | Five published, indexable video-first modal pages; linked from Showcase |
| Original GPT Image 2 cases | `/gpt-image-2-prompts/{slug}` | Five published, indexable image-first modal pages; linked from the GPT Image 2 showcase |
| Seedance 3.0 prompt/case | `/seedance-3-0-prompts/{slug}` | Reserved until a verified example exists |

The two former model guides, `/minimax-h3-ai-video-generator.html` and `/gpt-image-2.html`, redirect to the new tool pages. The former library URLs `/prompts/minimax-h3/videos` and `/prompts/gpt-image-2/images` redirect to the model-specific prompt indexes. The five former H3 detail URLs under `/prompts/minimax-h3/videos/` also redirect to their matching `/minimax-h3-prompts/{slug}` pages. Legacy `/app/?model=minimax-h3` and `/app/?model=gpt-image-2` links redirect too when the query contains only the model. Query URLs carrying other state remain usable in the generic workspace. The Worker owns these redirects and the Coming Soon resource routes; deployment must include the updated `wrangler.jsonc` routes.

Published tool pages contain the generation interface, visible explanation, steps, FAQs and links to related tools. Their introductory copy stays independent of changing specifications; the generation controls display the current options and limits. Each page emits its own title, description, H1, canonical, social metadata and index directive from server-rendered HTML. The generic workspace remains noindex because its model-query variants use the same interface without a stable, distinct search intent.

GPT Image 2.5 is the website label for Tuzi's `gpt-image-2.5-1k` routing alias, rather than an announcement of an official model release. Its English and Chinese pages use self canonicals and reciprocal language alternates. Homepage navigation and the dedicated model card link directly to its workspace and show the website's five-credit cost without inferring a dollar price. Existing GPT Image 2 example images remain attributed to GPT Image 2; the new route uses the site's brand mark for social metadata.

The legacy pricing page is noindex and absent from the sitemap; direct access remains available. Existing pricing and API-related articles retain their separate editorial URLs. A dedicated API product page is deferred.

The prompt guide remains Coming Soon, noindex, and absent from the sitemap. The Seedance 3.0 prompt index remains clearly labeled Coming Soon and is indexable alongside its workspace in the bilingual sitemap. The H3 video index and five detail pages use the original prompts recorded in `media/showcase-h3/2026-09-25/generation.json`; each detail URL is directly accessible and renders as a large modal over a subdued video gallery. The GPT Image 2 index and five detail pages use the prompts in `src/data/gpt-image-cases.json`, with original API images and optimized WebP assets in `media/showcase-gpt-image-2/2026-09-26/`. Both model showcases share the same card hover actions and Try Now handoff to the matching generator.

## Contextual internal links

The Christmas photo prompt collection uses a year-independent URL with a `/zh` edition. It is featured below the homepage hero, in the Explore footer and studio prompt-library navigation, and from the GPT Image 2 image library. Its original photo templates cover portraits, couples, families, pets and cards; handoff links preserve the prompt and supported aspect ratio in the image workspace.

Muse and Seedance 3.0 workspaces and libraries have indexable `/zh` equivalents, with both languages included in `sitemap.xml`. Studio and preview navigation link to these pages. Muse `/app/?model=...` aliases redirect to the matching preview, preserving prompt drafts and other query parameters.

Model generators and Prompt Libraries link to relevant prompting or pose-reference tutorials. Those tutorials link back to published tools, libraries and selected original cases using descriptive text. Case dialogs retain related works, their parent library and prompt handoff to the generator, and include a Home breadcrumb. The Blog index offers video, image and pose workflow entry points. These links render in HTML and use the canonical extensionless destinations.

The Pose landing uses “AI Pose Generator” as its primary Title/H1 phrase. Its body explains the 3D editor, pose references and camera angles. The landing, `/pose-reference-camera-angle-examples` and `/how-to-control-character-poses-in-seedance-with-3d-pose-references` link to each other in both languages. Its FAQPage schema matches the six visible questions and answers, with localized URLs and text. This markup describes the content; [Google no longer displays FAQ rich results](https://developers.google.com/search/updates).
