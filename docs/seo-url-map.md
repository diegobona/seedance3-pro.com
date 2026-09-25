# Search page and URL map

This map records the page that owns each search intent. Primary navigation and `sitemap.xml` focus on published, useful pages; clearly labeled upcoming resources can appear in the footer while remaining noindex.

| Intent | Canonical URL | Status |
| --- | --- | --- |
| Seedance 3 brand and platform | `/` | Published, indexable |
| Seedance 2.5 video workspace | `/app/video/seedance-2-5` | Published, indexable; first primary navigation item |
| MiniMax H3 text-to-video tool | `/app/video/minimax-h3` | Published, indexable |
| GPT Image 2 generation and editing tool | `/app/image/gpt-image-2` | Published, indexable |
| Pose to Image explanation | `/pose-to-image` | Published, indexable; existing URL retained |
| Pose reference examples | `/pose-reference-camera-angle-examples` | Published, indexable; existing URL retained |
| Generic and Pose workspace | `/app/` and `/app/?model=pose-to-image` | Functional, noindex |
| Nano Banana 2 Lite model information | `/nano-banana-2-lite.html` | Published guide; tool unavailable |
| Creative showcase | `/showcase.html` | Published, indexable; editable Pose scenes featured above the Video Prompt Library |
| Blog and existing articles | `/blog.html` and existing article URLs | Published; existing URLs retained |
| Prompt guide | `/prompt-guide` | Coming Soon page; noindex, absent from sitemap |
| MiniMax H3 showcase and prompt index | `/minimax-h3-prompts` | Published, indexable; five original H3 examples |
| GPT Image 2 showcase and prompt index | `/gpt-image-2-prompts` | Coming Soon page; noindex, absent from sitemap |
| Seedance 3.0 showcase and prompt index | `/seedance-3-0-prompts` | Reserved Coming Soon page; noindex, absent from sitemap |
| Original H3 video cases | `/minimax-h3-prompts/{slug}` | Five published, indexable video-first modal pages; linked from Showcase |
| Other individual prompt/case | `/{model}-prompts/{slug}` | Reserved until a verified example exists |

The two former model guides, `/minimax-h3-ai-video-generator.html` and `/gpt-image-2.html`, redirect to the new tool pages. The former library URLs `/prompts/minimax-h3/videos` and `/prompts/gpt-image-2/images` redirect to the model-specific prompt indexes. The five former H3 detail URLs under `/prompts/minimax-h3/videos/` also redirect to their matching `/minimax-h3-prompts/{slug}` pages. Legacy `/app/?model=minimax-h3` and `/app/?model=gpt-image-2` links redirect too when the query contains only the model. Query URLs carrying other state remain usable in the generic workspace. The Worker owns these redirects and the Coming Soon resource routes; deployment must include the updated `wrangler.jsonc` routes.

Published tool pages contain the generation interface, visible explanation, steps, FAQs and links to related tools. Their copy states the current trial limits. Each page emits its own title, description, H1, canonical, social metadata and index directive from server-rendered HTML. The generic workspace remains noindex because its model-query variants use the same interface without a stable, distinct search intent.

The existing pricing page and existing API-related article were not modified in this phase. A dedicated API product page is deferred.

The prompt guide, GPT Image 2 prompt index, and Seedance 3.0 prompt index remain Coming Soon, noindex, and absent from the sitemap. The H3 video index and five detail pages use the original prompts recorded in `media/showcase-h3/2026-09-25/generation.json`; each detail URL is directly accessible and renders as a large modal over a subdued video gallery. Showcase links to these detail URLs while retaining click-to-play on its video tiles.
