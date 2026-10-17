# Tuzi image models

The existing authenticated `/api/images/generate` endpoint supports two allowlisted website models. Both use the server-only `TUZI_API_KEY`, the shared image rate limit, and the existing five-credit-per-image trial policy. They share the existing daily credit pool; failed or invalid generation results refund the reservation.

| Website ID | Tuzi model ID | Quality | References | Square output |
| --- | --- | --- | --- | --- |
| `gpt-image-2` | `gpt-image-2` | `medium` | Up to 16 | 1024x1024 |
| `gpt-image-2-5-1k` | `gpt-image-2.5-1k` | `low` | Up to 16 | 1254x1254 |

The new model is a [Tuzi routing alias](https://api.tu-zi.com/pricing?vendor=OpenAI&model=gpt-image-2.5-1k), not an official OpenAI model ID. Its provider prices depend on the token group and account tier; they are separate from the site's trial credit policy. Sixteen references and one to three output images are this site's limits.

As of 2026-10-17, both image tools accept up to 16 references, with the limit shown in the upload area rather than sidebar tooltips. This matches the [OpenAI image edit API](https://developers.openai.com/api/reference/resources/images/methods/edit) limit. The Tuzi `gpt-image-2.5-1k` route has not been live-tested with 16 references; the shared request handler is verified locally with a mocked provider.

`app/image-models.mjs` is the shared source for provider mapping, dimensions, reference limits and credit costs. New requests send the website ID in the `model` form field and `x-seedance-image-model` header. Unknown IDs, duplicate fields, disagreement between header and body, and sizes from the wrong model are rejected. Legacy requests without a model retain GPT Image 2.

## Fixed sizes for GPT Image 2.5

| Aspect ratio | Pixels |
| --- | --- |
| 1:1 | 1254x1254 |
| 3:2 / 2:3 | 1536x1024 / 1024x1536 |
| 3:4 / 4:3 | 1086x1448 / 1448x1086 |
| 4:5 / 5:4 | 1122x1402 / 1402x1122 |
| 16:9 / 9:16 | 1672x941 / 941x1672 |
| 21:9 / 9:21 | 1915x821 / 821x1915 |

The synchronous `/v1/images/generations` request uses the exact provider alias, `n`, fixed `size`, `quality: low` and `response_format: b64_json`. For this alias, one reference uses a data URL string in `image`; multiple references use an `images` array. This follows [Tuzi's public synchronous tester](https://api.tu-zi.com/assets/index-CfkeVexi.js). The quality default follows its [GPT Image parameter template](https://api.tu-zi.com/assets/modelQuickStartConfig-DClOzv4l.js). GPT Image 2 retains its existing `image` array protocol.

## Verification and release

On 2026-10-15, live requests using the existing Tuzi credential succeeded for a 1254x1254 text image, a 1536x1024 single-reference edit, and two output images using two references. One multi-reference attempt encountered a transport failure; a separate diagnostic attempt succeeded. No automatic generation retry was added.

Protected integration tests exercise authentication, preflight rejection, exact model selection, multi-image credit reservation, successful settlement and failure refunds. Browser checks cover both languages, eleven aspect ratios, prompt prefill, four-reference counts, quantity/cost updates and mobile layout. The local Express proxy accepts the five text fields now sent by the client.

Deploy the current static site through the existing Pages pipeline and update the TanStack Worker with `npm run deploy:worker`. New pages are `/app/image/gpt-image-2-5-1k` and `/zh/app/image/gpt-image-2-5-1k`, both indexable and present in the bilingual sitemap. Existing GPT Image 2 examples keep their original attribution.
