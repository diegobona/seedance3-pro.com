# CompShare H3 first-frame channel

The existing H3 image trial can submit one image as the first frame through
CompShare. Text-to-video stays on AutoDL, and GPT image generation is unchanged.
The existing 480p trial, guest 10-second lifetime allowance (5-second default,
10-second maximum), signed-in 5/10/15-second choices, daily credits, ownership
checks, and reservation/refund rules continue to apply. There is no new quota
or pricing system and no database migration.

## Server credential and activation

Create an API key from the **API** button in the CompShare video workbench, as
described in the [official H3 API guide](https://www.compshare.cn/docs/minimax-h3/api/minimax-h3-video-api).
The key uses the `sk-ml-` prefix. Save it only on the server as:

```dotenv
COMPSHARE_API_KEY=<your CompShare key>
```

Use the ignored `.env.local` for local development and the existing Worker secret
sync/deployment process for production. Do not paste the key into chat, source
files, client environment variables, or browser code. `AUTODL_TOKEN` remains
necessary for text generation and existing AutoDL tasks.

Source `wrangler.jsonc` selects `compshare` with `vars.H3_REFERENCE_PROVIDER`.
Before deployment, configure the production key and confirm that its account has
available H3 points. Regenerate bindings with `npm run cf-typegen`, run the local
checks/build, and deploy the complete change through the normal release process. The adapter, generate route,
status route, and reconciler must ship together. Missing selected-channel keys
return 503 before a guest is provisioned or credits are reserved. Unknown channel
values fail closed.

## Request and result contract

`POST https://cp.compshare.cn/minimax/v2/video_generation` sends JSON with
`Authorization: Bearer <COMPSHARE_API_KEY>`, `Accept: application/json`, and
`Idempotency-Key: seedance-video:<reserved local task UUID>`:

```json
{
  "model": "MiniMax-H3",
  "content": [
    { "type": "text", "text": "User motion prompt" },
    {
      "type": "image_url",
      "image_url": { "url": "https://seedance3-pro.com/api/videos/references?id=<owned UUID>" },
      "role": "first_frame"
    }
  ],
  "resolution": "480P",
  "duration": 5,
  "ratio": "16:9",
  "use_context_ir": true
}
```

Only one image is supported; no tail-frame content is sent. The selected 16:9 or
9:16 ratio is preserved. The adapter validates nonempty prompts up to 7,000
characters, 5/10/15-second durations, 480p, an HTTPS image URL, and a local UUID
before fetching. Public generation input accepts only owned image UUIDs; URLs
are constructed after the existing R2 ownership/expiry checks.

The accepted response is `{ "task_id": "..." }`. Persisted workflow marker
`compshare:minimax-h3:first-frame` identifies this channel in the existing
`workflow_id` text column. Neither prompts nor reference URLs are persisted there.

`GET https://cp.compshare.cn/minimax/v2/query/video_generation/<encoded task ID>`
expects `{ "task": { "id": "...", "status": "...", "content": { "url": "..." } } }`.
The returned ID must match. Exact `queued` and `running` states remain pending;
`succeeded` needs a usable HTTPS MP4 URL; `failed` and `cancelled` refund once.
Unknown statuses remain pending. Cached terminal results do not require a key.

Fetch uses a 15-second timeout and Workers-supported `redirect:'manual'`.
Every 3xx response is rejected without following its Location, forwarding
credentials, or resubmitting. Streamed response bodies are bounded to 256 KiB
for success or 64 KiB for errors. Upstream messages are never
relayed. Submission transport/read uncertainty is marked ambiguous; the server
does not retry POST or fall back to another provider. Polling transport errors,
408/425/429/5xx, missing keys and 401/403 schedule retries, using only bounded
numeric Retry-After values. Existing task expiry remains the recovery boundary.

## Rollback and validation

Set `vars.H3_REFERENCE_PROVIDER` back to `autodl` and release through the normal
process to route **new** image jobs to AutoDL. Already accepted CompShare tasks
continue querying CompShare from their recorded marker. Keep their key configured
until those tasks have finished or expired. Historical AutoDL text and reference
workflow IDs always query AutoDL, independent of the current switch.

Offline transport, dispatcher, protected route, reconciler and D1 lifecycle tests
use injected fetch functions and synthetic task responses. A workerd/Miniflare
suite imports the real adapter and uses native fetch with all outbound destinations
intercepted, matching compatibility date `2026-09-18` and `nodejs_compat`. It covers
POST/GET transport compatibility and redirect rejection without any real network
requests. Together the tests cover contract,
bounded/secret-safe errors, mixed-provider batches, ownership, stable local IDs,
settlement/refund idempotency, guest scope and idle zero-SQL behavior. They do not
prove live generation quality or first-frame fidelity. Live validation requires
the real key and an explicitly bounded generation through the existing quota path.
