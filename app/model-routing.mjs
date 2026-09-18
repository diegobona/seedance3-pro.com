export const DEFAULT_MODEL_ID = "gpt-image-2";

export function normalizeModelId(modelId, availableModelIds, fallback = DEFAULT_MODEL_ID) {
  return availableModelIds.has(modelId) ? modelId : fallback;
}

export function buildModelUrl(currentUrl, modelId) {
  const url = new URL(currentUrl);
  url.searchParams.set("model", modelId);
  return `${url.pathname}${url.search}${url.hash}`;
}
