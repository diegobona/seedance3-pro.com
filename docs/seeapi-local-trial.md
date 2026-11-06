# SeeAPI guest trial

Production uses `GUEST_VIDEO_PROVIDER=seeapi` from `wrangler.jsonc`, with
`SEEAPI_API_KEY` stored as a Worker secret. The local bridge override is never
uploaded: production references use the site's public `/api/videos/references`
endpoint and R2 storage. AutoDL remains available for paid and historical tasks.

The local `.dev.vars` selects `GUEST_VIDEO_PROVIDER=seeapi`. Put the new key in
`SEEAPI_API_KEY` in that ignored file; do not put it in browser code or commit it.
AutoDL code and its existing key remain intact. Removing the guest-provider
override restores the old guest dispatch; paid and previously accepted tasks
continue using their saved provider workflow.

The selected model is `minimax-h3-max-turbo`, provider `fal`, with endpoints
`text-to-video` and `image-to-video`. Guest requests use native 768P, exactly five
seconds, and at most one first-frame image. The ten-second guest wallet permits
two successful videos; failed generations return their reserved seconds.

## Local reference images

SeeAPI documents publicly reachable image URLs. It cannot read localhost or
the local R2 simulator, and data-URL support is not assumed.

For an end-to-end local upload test, an HTTPS image-only bridge can be used:

1. Start the local app at port 4310 using the existing development command.
2. Run `node scripts/local-video-reference-bridge.mjs`. It listens on loopback
   port 4313 and exposes only GET/HEAD for valid opaque reference IDs.
3. Point a temporary HTTPS tunnel at port 4313, rather than the app itself.
   The helper does not create or start a tunnel automatically.
4. Set `SEEAPI_PUBLIC_REFERENCE_ORIGIN=https://<temporary-image-host>` in
   `.dev.vars`, then restart the local app. No credentials belong in this URL.
5. Upload one image and generate a five-second video. Stop the image bridge and
   tunnel after the test. Uploaded images retain their existing ownership and
   expiry checks; login, payment and generation endpoints are not bridged.

Without a bridge, the adapter can still be tested with a known public HTTPS
image URL. Actual calls require the user's new SeeAPI key; automated tests use
mock transport and do not consume upstream credits.

The local generation route checks that a reference URL returns image bytes
before reserving credits or calling SeeAPI. An expired tunnel returns
`LOCAL_REFERENCE_UNAVAILABLE`; renew the tunnel, update
`SEEAPI_PUBLIC_REFERENCE_ORIGIN`, and restart the local preview. A browser preview
of the local upload does not prove that the public reference URL is reachable.

## API references

- [Text to video](https://www.seeapi.com/docs/minimax-h3-max-turbo/text-to-video/)
- [Image to video](https://www.seeapi.com/docs/minimax-h3-max-turbo/image-to-video/)
- [Task status and result assets](https://www.seeapi.com/docs/get-task-detail/)
