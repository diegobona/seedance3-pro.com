const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export async function prepareImageForVideo({ image, width, height, fetchImpl = fetch, signal }) {
  let response;
  if (UUID.test(image.animateId || "")) {
    response = await fetchImpl(`/api/images/animate?image=${image.animateId}`, { method: "POST", credentials: "same-origin", signal });
  } else {
    let source;
    try {
      source = await fetchImpl(image.dataUrl || image.url, { signal, credentials: "omit" });
    } catch { throw new Error("Could not transfer this image. Save it, then upload it as a reference in H3."); }
    if (!source.ok) throw new Error("This image link is unavailable. Save and upload the image in H3 instead.");
    const blob = await source.blob();
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type) || !blob.size || blob.size > 10 * 1024 * 1024) {
      throw new Error("The reference must be a PNG, JPEG or WebP image up to 10 MB.");
    }
    response = await fetchImpl('/api/videos/references', {
      method: 'POST', credentials: 'same-origin', headers: { 'content-type': blob.type }, body: blob, signal,
    });
  }
  const result = await response.json();
  if (!response.ok || !result.success || !UUID.test(result.id || '')) {
    throw Object.assign(new Error(result.message || 'Image transfer failed. Please try again.'), { status: response.status });
  }
  const aspectRatio = height > width ? '9:16' : '16:9';
  return `/app/video/minimax-h3?reference=${result.id}&aspect_ratio=${encodeURIComponent(aspectRatio)}`;
}

export async function loadVideoReference(id, { fetchImpl = fetch, signal } = {}) {
  if (!UUID.test(id || '')) throw new Error('Invalid reference image link. Please choose an image again.');
  const response = await fetchImpl(`/api/videos/references?id=${id}`, { signal });
  if (!response.ok) throw new Error('This reference image expired. Please upload it again.');
  const blob = await response.blob();
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type) || !blob.size || blob.size > 10 * 1024 * 1024) throw new Error('The reference image could not be loaded.');
  return new File([blob], 'generated-image-reference', { type: blob.type });
}
