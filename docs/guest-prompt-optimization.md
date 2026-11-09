# Guest video prompt optimization

The homepage and video studio share a checkbox for guests. Signed-in generation
is unchanged. Short prompts default on; long prompts default off. Both JSON and
combined reference-image requests accept the optional boolean `optimizePrompt`:
`false` preserves the original text, `true` explicitly requests optimization, and
omission uses the same automatic length rule on the server.

`app/prompt-optimization-policy.mjs` is shared by the browser and server. It counts
Unicode words for English, Spanish, Russian and other word-separated scripts;
Chinese/Japanese characters and Korean syllable blocks count individually. NFC
normalization handles decomposed Korean and accents consistently. Whitespace,
punctuation and emoji do not count. Automatic optimization is off when
`words / 80 + CJK characters / 150 >= 1`, so mixed scripts combine proportionally.
These are initial product thresholds, not evidence of quality or AI authorship.
Long automatic prompts never call DeepSeek. A manual toggle overrides the rule
for subsequent edits and is preserved with draft handoffs; automatic drafts omit
the choice so it can still adapt to edited text. Longer automatic prompts show a
small explanatory note while keeping the checkbox available.

The existing video route verifies the guest, validates references, rate-limits,
and atomically reserves five seconds before invoking DeepSeek. There is no public
standalone rewrite endpoint. The original textarea is not overwritten. Failed,
timed-out or invalid rewrites use the original prompt and report `fallback` via
`x-seedance-prompt-optimization`, shown under the checkbox. Successful submissions
also return `promptOptimization: { status: 'optimized', prompt }` in a no-store JSON
body. This is the exact text sent to the video provider, not the system instructions
or reference URLs. Homepage and studio show a collapsed "Optimized · View prompt
used" disclosure with copy support; the original textarea is never overwritten.
It appears after submission without another confirmation, and resets on a new
generation or a checkbox change. The disclosure is not persisted across reloads.
While a new optimized request is being prepared/submitted, the checkbox area says
the optimized prompt will appear there when ready. This waiting note clears on
submission failure or completion, and is not shown when resuming an existing task.
Optimization does not
add a credit charge; the normal video task settlement/refund rules still apply.

## Configuration

- `DEEPSEEK_API_KEY` is a server secret. Use `.env.local` and the ignored
  `.dev.vars` used by the local Worker; restart the dev server after adding it.
- Production requires this secret on the existing Worker before enabling the
  updated UI. Deploy the Worker, homepage bundle and shared studio modules together.
- No key, raw provider response or prompt is written to application logs or
  included in client bundles. Do not run bulk secret sync for this change.
- Model: `deepseek-flash`, non-thinking, at most 2,000 output tokens and a
  12-second text-only timeout; image modes allow 30 seconds for image retrieval and processing. A reference image is sent only after ownership validation,
  using the same short-lived URL supplied to the video provider.

## Prompt rules and sources

Reviewed 2026-11-09. The adapter uses MiniMax's T2VA/I2VA base-mode structure,
English descriptions with original dialogue/text, numbered shots and five-second
timing. Text mode develops a brief idea into a feasible subject/action/setting/camera
description, while preserving detailed prompts. Multi-image mode clarifies each
user-assigned image role, subject interactions and action order. Frames mode clarifies
the continuous movement and necessary viewpoint transition between fixed endpoints;
with only a first frame, no ending is invented. Both reference-based modes allow
supported connective wording, but prohibit unrelated events, guessed image roles,
new characters and contradictions of explicit constraints. Two-frame optimization
is labeled FL2VA in the DeepSeek request. Legacy single-image requests retain the
previous light-edit policy. Image-mode soundscape and music use N/A unless requested.
Reference images use high detail to avoid the low-detail 512-pixel input reduction.
These are model instructions, not a guarantee of semantic correctness; quality still
requires comparison. Guest multi-image mode accepts one to five numbered references;
it does not treat the first reference as an opening frame. Frames mode requires a
first frame and accepts an optional last frame, with both endpoint roles preserved.

- [MiniMax H3 prompt-writing skill](https://github.com/MiniMax-AI/MiniMax-H3/tree/main/skills/h3-prompt-writing)
- [MiniMax base-mode guide](https://github.com/MiniMax-AI/MiniMax-H3/blob/main/skills/h3-prompt-writing/references/base-en.txt)
- [DeepSeek chat API](https://api-docs.deepseek.com/api/create-chat-completion/)
- [DeepSeek image inputs](https://api-docs.deepseek.com/guides/vision/)

The checks cover boolean transport, first-frame mapping, malformed/oversized
responses, timeout fallback, signed-in bypass, and validation/reservation ordering.
Use a simulated video supplier in browser checks; live prompt checks do not submit
a video or spend guest seconds. Better video quality still needs a separate
side-by-side generation comparison.

## Local image-to-video testing

Local Vite development uses Cloudflare's documented Turnstile test key pair in ignored `.dev.vars`, with `TURNSTILE_HOSTNAMES=127.0.0.1,localhost`. The dummy Siteverify response is accepted only when Vite's compile-time `DEV` flag is true, the request is on loopback, both keys exactly match Cloudflare's public test pair, the token is the official dummy token, and Siteverify returns success. Production continues requiring the exact real action and hostname.

Reference uploads also require a working public image bridge for Yir. Run `scripts/local-video-reference-bridge.mjs` with `LOCAL_VIDEO_APP_ORIGIN` set to the active Vite origin and `LOCAL_VIDEO_REFERENCE_PORT` set to a spare local port. Point a temporary HTTPS tunnel only at that image bridge, then put its HTTPS origin in local `YIR_PUBLIC_REFERENCE_ORIGIN`. The bridge serves only GET/HEAD requests for opaque reference-image IDs; it does not expose auth, billing or generation endpoints. Tunnel addresses expire and must be renewed when testing resumes.

Reference: https://developers.cloudflare.com/turnstile/troubleshooting/testing/

Optimizer requests must use `redirect: manual`: Cloudflare Workers rejects the Node-supported `error` mode before sending the request. Non-2xx responses (including redirects) still fall back without forwarding credentials. Frame alignment is assembled by the server from the validated first/last frame roles, rather than depending on a model's timestamp spelling. Fallback diagnostics contain only a fixed reason, mode, elapsed time and optional HTTP status, never prompts, image URLs, response bodies or credentials.

Guest uploads send the selected mode and all images in a single multipart generation
request, preserving upload order and using one Turnstile verification. The backend
enforces zero images for text, one to five for references, and one or two for frames.
Signed-in requests retain their existing reference-ID upload flow.
