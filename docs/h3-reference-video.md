# H3 reference-image video generation

The H3 studio supports text-to-video and reference-to-video. Reference mode accepts
1–9 PNG, JPEG or WebP images, at most 10 MiB each, including for guests. File
selection, clipboard paste, generated-image handoff and API validation enforce
the nine-image limit. Invalid selections are rejected before any upload; empty,
duplicate or invalid reference IDs are rejected before credit reservation.
Both modes use 768p and one credit per output second, independent of image count. Guests
receive 10 lifetime video seconds, default to 5 seconds, and may choose 5 or 10.
Signed-in users retain the existing 5/10/15-second settings and daily credits.
Both modes support 16:9, 9:16 and 1:1. References retain the complete source inside
a 768P frame (1344×768, 768×1344 or 768×768), replacing the previous 480P preparation.
The homepage retains its simple one-image picker; the H3 workspace supports nine.

## Provider contract

- `vars.H3_REFERENCE_PROVIDER=autodl-upgraded` selects `minimax_h3_zm_u24` for new
  reference jobs. It sends `prompt`, `duration`, mapped `768p横` / `768p竖` /
  `768p(1:1)` and ordered `ref_image_0` through `ref_image_8` as applicable. It uses
  reference conditioning, without a strict first-frame guarantee.
- The retained `autodl` setting uses historical workflow
  `minimax_h3_image_audio_to_video_v2_15s` with its old single-image adapter contract.
- CompShare is inactive for new jobs, but its code and credentials are retained.
  The `compshare` setting uses marker `compshare:minimax-h3:first-frame`, using
  `MiniMax-H3`, one image with `role:first_frame`, `480P`, the selected duration
  and 16:9/9:16 ratio, and `use_context_ir:true`. Its prompt limit is 7,000 characters.
  A full rollback must restore the old 480P/single-image client and route gates as
  well as this setting; changing the setting alone does not upgrade that adapter.
- Text workflow remains `minimax_h3_lightx2v_no_pic`.
- All polling paths use each task's stored workflow, including after a switch
  or rollback. Existing credit reservation/refund and activity-gated reconciliation
  remain in use. No new quota tables or migrations are needed.
- AutoDL's public upgraded-workflow config lists 768P at ¥0.05/output second at
  peak and ¥0.04 off peak, without a per-reference price. This is a published
  configuration snapshot, not a guarantee of actual image fidelity or billing.
- Contract sources: [AutoDL upgraded workflow](https://www.autodl.art/large-model/comfyui/minimax_h3_zm_u24),
  [CompShare](https://www.compshare.cn/docs/minimax-h3/api/minimax-h3-video-api).

## Reference storage

Authenticated POST `/api/videos/references` accepts one raw image body and returns
an opaque UUID. File size is bounded while reading, the MIME type and file signature
are checked, and uploads are rate limited to 20 per user per minute.

The private R2 bucket `seedance3-video-references` is bound as `VIDEO_REFERENCES`.
Objects use the `references/` prefix and carry their owner's ID and a 24-hour expiry.
A bucket lifecycle rule `expire-references` removes objects after one day.
GET `/api/videos/references?id=<uuid>` serves the short-lived image for the provider,
without session credentials or an index/list endpoint. Treat these opaque URLs
as bearer links. Responses are no-store and noindex; expired URLs return 404.

Generation accepts only UUIDs, never user-supplied remote URLs. Before reserving
credits, it validates ownership and at least one hour of remaining lifetime,
then constructs the provider URLs on the canonical production domain.
The task records the correct workflow ID without persisting prompts or reference URLs.

## Verification

The 2026-10-20 release is live on Worker version
`e9e35466-d761-4bf5-a705-fffd153220d9` and Pages deployment `045710f8`.
Both bilingual homepages and H3 workspaces serve 768P; the workspace accepts nine
images and the homepage bundle matches the locally built artifact. An isolated
guest submitted two public reference images through the protected upload and
generation routes. AutoDL `minimax_h3_zm_u24` returned a 1344×768 H.264 video at
24 FPS with AAC audio (5.17-second container for a five-second request), after
146 seconds of provider execution. The task settled once for five application
credits; the synthetic guest retained five of its original ten seconds. The
output combined the origami fox subject and observatory background. The isolated
guest, task, credit reservation and two temporary R2 references were removed after
verification, without consuming a real visitor’s trial allowance. This one
trial verifies multi-reference integration, not a cross-provider quality ranking.
Published peak pricing predicts ¥0.25 for the request; actual provider billing
was not independently exposed in the result metadata.

83 focused JavaScript and 67 focused TypeScript/D1 tests passed, as did the
build/typecheck and deployment dry run. Full-suite baseline comparison found no
new failing tests; unrelated pre-existing snapshot/model/news tests remain
failing (24 JavaScript and 7 TypeScript, with live Neon tests disabled).

Offline tests cover the CompShare request/status contract, persisted provider
routing, D1 settlement/refund idempotency, guest scope, ownership, and idle activity.
They do not establish live CompShare generation quality or first-frame fidelity.
The earlier 2026-09-26 live AutoDL multi-reference test predates the current
one-image restriction and does not validate the CompShare channel.

Run `npm run cf-typegen` after changing Worker bindings.

## Generated image handoff

Every GPT Image 2 result (including Pose reference outputs) has an **Animate this
image** action beside its download link. The selected image is uploaded to the
same temporary reference storage before navigating to H3. Portrait images select
9:16; other images select 16:9. The video prompt starts empty with motion/camera
guidance. Transferring an image does not create a video task or charge credits.

Inline image results use the existing reference upload endpoint. For URL results,
image generation stores a user-bound provider source descriptor, and POST
`/api/images/animate?image=<uuid>` transfers its bytes server-side without relying
on browser CORS. That endpoint accepts only stored IDs, checks ownership and
expiry, and follows no redirects. Both source descriptors and uploaded reference
images expire under the existing one-day R2 lifecycle policy.
