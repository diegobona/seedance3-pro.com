# H3 reference-image video generation

The H3 studio supports text-to-video and reference-to-video. The latter accepts
1–9 PNG, JPEG or WebP files, at most 10 MiB each, and preserves upload order.
Both modes use the existing trial settings: 480p, 5/10/15 seconds, one credit
per output second. Reference mode supports 16:9 and 9:16; text mode also supports 1:1.

## Provider contract

- Reference workflow: `minimax_h3_image_audio_to_video_v2_15s`.
- Input: `prompt`, `duration`, mapped `resolution`, `ref_image_0` through `ref_image_8`.
- Text workflow remains `minimax_h3_lightx2v_no_pic`.
- Both workflows use the existing asynchronous result endpoint and refund/reconciliation logic.
- Contract source: https://www.autodl.art/large-model/comfyui/minimax_h3_image_audio_to_video_v2_15s

## Reference storage

Authenticated POST `/api/videos/references` accepts one raw image body and returns
an opaque UUID. File size is bounded while reading, the MIME type and file signature
are checked, and uploads are rate limited to 20 per user per minute.

The private R2 bucket `seedance3-video-references` is bound as `VIDEO_REFERENCES`.
Objects use the `references/` prefix and carry their owner's ID and a 24-hour expiry.
A bucket lifecycle rule `expire-references` removes objects after one day.
GET `/api/videos/references?id=<uuid>` serves the short-lived image for AutoDL,
without session credentials or an index/list endpoint. Treat these opaque URLs
as bearer links. Responses are no-store and noindex; expired URLs return 404.

Generation accepts only UUIDs, never user-supplied remote URLs. Before reserving
credits, it validates ownership and at least one hour of remaining lifetime,
then constructs the provider URLs on the canonical production domain.
The task records the correct workflow ID without persisting prompts or reference URLs.

## Verification

Focused adapter/client, upload, authorization, credit and reconciliation tests,
TypeScript and production build passed. Browser checks covered mode switching,
multiple file selection, thumbnail removal/renumbering and square-format exclusion.
On 2026-09-26 a disposable test account uploaded two images through the production
API and completed one 5-second multi-reference video. The API charged 5 credits
once, returned a downloadable MP4, and the test account was removed afterward.

Run `npm run cf-typegen` after changing Worker bindings.
