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
| MiniMax H3 video case index | `/prompts/minimax-h3/videos` | Coming Soon page; noindex, absent from sitemap |
| GPT Image 2 image case index | `/prompts/gpt-image-2/images` | Coming Soon page; noindex, absent from sitemap |
| Individual prompt/case | `/prompts/{model}/{media}/{slug}` | Reserved; no route, links or sitemap entry yet |

The two former model guides, `/minimax-h3-ai-video-generator.html` and `/gpt-image-2.html`, redirect to the new tool pages. Legacy `/app/?model=minimax-h3` and `/app/?model=gpt-image-2` links redirect too when the query contains only the model. Query URLs carrying other state remain usable in the generic workspace. The Worker owns these redirects and the Coming Soon resource routes; deployment must include the updated `wrangler.jsonc` routes.

Published tool pages contain the generation interface, visible explanation, steps, FAQs and links to related tools. Their copy states the current trial limits. Each page emits its own title, description, H1, canonical, social metadata and index directive from server-rendered HTML. The generic workspace remains noindex because its model-query variants use the same interface without a stable, distinct search intent.

The existing pricing page and existing API-related article were not modified in this phase. A dedicated API product page is deferred.

The three Coming Soon pages are linked as upcoming resources, but do not claim that entries are already published. Keep them noindex and out of the sitemap until substantive guide or case content replaces their placeholder copy. Do not publish individual detail URLs before individual examples exist.
