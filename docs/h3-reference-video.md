# H3 reference-image video generation

The H3 studio supports text-to-video and reference-to-video. The latter accepts
one PNG, JPEG or WebP image, at most 10 MiB. File selection, clipboard paste,
generated-image handoff and API validation all enforce the one-image limit.
Remove the current image before choosing a replacement. A multi-image request is
rejected before uploads, credit reservation or provider submission.
Both modes use the existing 480p trial and one credit per output second. Guests
receive 10 lifetime video seconds, default to 5 seconds, and may choose 5 or 10.
Signed-in users retain the existing 5/10/15-second settings and daily credits.
Reference mode supports 16:9 and 9:16; text mode also supports 1:1.

## Provider contract

- `vars.H3_REFERENCE_PROVIDER` selects the channel for new single-image jobs.
  Source configuration stages `autodl`; change it to `compshare` only after the
  server-side `COMPSHARE_API_KEY` is configured. See [CompShare setup](compshare-first-frame.md).
- AutoDL reference workflow: `minimax_h3_image_audio_to_video_v2_15s`, using
  `prompt`, `duration`, mapped `resolution`, and the single `ref_image_0`.
  This channel treats the image as a reference without a first-frame constraint.
- CompShare reference workflow marker: `compshare:minimax-h3:first-frame`, using
  `MiniMax-H3`, one image with `role:first_frame`, `480P`, the selected duration
  and 16:9/9:16 ratio, and `use_context_ir:true`. Its prompt limit is 7,000 characters.
- Text workflow remains `minimax_h3_lightx2v_no_pic`.
- Both polling paths use each task's stored workflow, including after a switch
  or rollback. Existing credit reservation/refund and activity-gated reconciliation
  remain in use. No new quota tables or migrations are needed.
- Contract sources: [AutoDL](https://www.autodl.art/large-model/comfyui/minimax_h3_image_audio_to_video_v2_15s),
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
