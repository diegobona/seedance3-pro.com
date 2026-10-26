import { canonicalModelPath } from './seo-routes.mjs';
import { localeFromPath, localizedPath } from './site-locale.mjs';

export const DEFAULT_MODEL_ID = "gpt-image-2-5-1k";

export function normalizeModelId(modelId, availableModelIds, fallback = DEFAULT_MODEL_ID) {
  return availableModelIds.has(modelId) ? modelId : fallback;
}

export function buildModelUrl(currentUrl, modelId) {
  const url = new URL(currentUrl);
  const path = canonicalModelPath(modelId, localeFromPath(url.pathname));
  if (path) { url.pathname = path; url.searchParams.delete('model'); }
  else { url.pathname = localizedPath('/app/', localeFromPath(url.pathname)); url.searchParams.set('model', modelId); }
  return `${url.pathname}${url.search}${url.hash}`;
}
