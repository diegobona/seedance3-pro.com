export async function requestImageGeneration({
  prompt,
  referenceFile = null,
  fetchImpl = fetch,
  signal
} = {}) {
  const form = new FormData();
  form.set("prompt", String(prompt || "").trim());
  if (referenceFile) {
    form.set("image", referenceFile, referenceFile.name || "reference.png");
  }

  const response = await fetchImpl("/api/images/generate", {
    method: "POST",
    body: form,
    signal
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Image service returned an invalid response.");
  }
  if (!response.ok || !payload?.success || !payload?.image) {
    throw new Error(String(payload?.message || "Image generation failed."));
  }
  if (payload.image.url) {
    let url;
    try {
      url = new URL(String(payload.image.url));
    } catch {
      throw new Error("Image service returned an invalid image URL.");
    }
    if (url.protocol !== "https:") {
      throw new Error("Image service returned an invalid image URL.");
    }
    payload.image = { url: url.href };
  } else if (!/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(String(payload.image.dataUrl || ""))) {
    throw new Error("Image service returned invalid image data.");
  }
  return payload;
}
