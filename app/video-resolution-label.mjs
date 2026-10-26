// Display copy only. Request values and provider resolution enums stay unchanged.
export function videoResolutionLabel(text) {
  return String(text).replace(/\b768p\b/gi, '1080P');
}
