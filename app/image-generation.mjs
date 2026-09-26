export async function requestImageGeneration({
  prompt,
  referenceFile = null,
  quantity = 1,
  size = "1024x1024",
  fetchImpl = fetch,
  signal
} = {}) {
  const form = new FormData();
  form.set("prompt", String(prompt || "").trim());
  form.set("quantity", String(quantity));
  form.set("resolution", "1K");
  form.set("size", String(size));
  if (referenceFile) {
    form.set("image", referenceFile, referenceFile.name || "reference.png");
  }

  const response = await fetchImpl("/api/images/generate", {
    method: "POST",
    headers: { "x-seedance-image-quantity": String(quantity) },
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
    throw new Error("Image service returned an invalid response.");
  }
  if (!response.ok || !payload?.success || !payload?.image) {
    const error = new Error(String(payload?.message || "Image generation failed."));
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
      throw new Error("Image service returned an invalid image URL.");
    }
    if (url.protocol !== "https:") {
      throw new Error("Image service returned an invalid image URL.");
    }
    return { url: url.href, ...(typeof image.animateId === "string" && /^[0-9a-f-]{36}$/.test(image.animateId) ? { animateId: image.animateId } : {}) };
  }
  if (!/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(String(image?.dataUrl || ""))) {
    throw new Error("Image service returned invalid image data.");
  }
  return { dataUrl: String(image.dataUrl) };
}
