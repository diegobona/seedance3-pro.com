import { t, localizedErrorMessage } from './i18n.mjs';
import { DEFAULT_IMAGE_MODEL, IMAGE_MODEL_HEADER, getImageModel } from './image-models.mjs';
export async function requestImageGeneration({
  model = DEFAULT_IMAGE_MODEL,
  prompt,
  referenceFile = null,
  referenceFiles = referenceFile ? [referenceFile] : [],
  quantity = 1,
  size,
  fetchImpl = fetch,
  signal
} = {}) {
  const selectedModel = getImageModel(model);
  if (!selectedModel) throw new Error(t('Image model is not supported.'));
  const form = new FormData();
  form.set('model', model);
  form.set("prompt", String(prompt || "").trim());
  form.set("quantity", String(quantity));
  form.set("resolution", "1K");
  form.set("size", String(size || selectedModel.sizes['1:1']));
  for (const file of referenceFiles) {
    form.append("image", file, file.name || "reference.png");
  }

  const response = await fetchImpl("/api/images/generate", {
    method: "POST",
    headers: { "x-seedance-image-quantity": String(quantity), [IMAGE_MODEL_HEADER]: model },
    body: form,
    signal
  });
  const creditCost = Number(response.headers.get("x-seedance-credit-cost"));
  const creditRemaining = Number(response.headers.get("x-seedance-credit-remaining"));
  const credits = Number.isSafeInteger(creditCost) && creditCost > 0
    && Number.isSafeInteger(creditRemaining) && creditRemaining >= 0
    ? { cost: creditCost, remaining: creditRemaining }
    : null;
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(t("Image service returned an invalid response."));
  }
  if (!response.ok || !payload?.success || !payload?.image) {
    const error = new Error(localizedErrorMessage(payload?.message, payload?.code, 'Image generation failed.'));
    error.status = response.status;
    error.code = String(payload?.code || "");
    if (credits) error.credits = credits;
    throw error;
  }
  const images = Array.isArray(payload.images) && payload.images.length
    ? payload.images
    : [payload.image];
  payload.images = images.map(normalizeGeneratedImage);
  payload.image = payload.images[0];
  if (credits) payload.credits = credits;
  return payload;
}

function normalizeGeneratedImage(image) {
  if (image?.url) {
    let url;
    try {
      url = new URL(String(image.url));
    } catch {
      throw new Error(t("Image service returned an invalid image URL."));
    }
    if (url.protocol !== "https:") {
      throw new Error(t("Image service returned an invalid image URL."));
    }
    return { url: url.href, ...(typeof image.animateId === "string" && /^[0-9a-f-]{36}$/.test(image.animateId) ? { animateId: image.animateId } : {}) };
  }
  if (!/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(String(image?.dataUrl || ""))) {
    throw new Error(t("Image service returned invalid image data."));
  }
  return { dataUrl: String(image.dataUrl) };
}
