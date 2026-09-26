export const MAX_IMAGE_REFERENCES = 16;
export const MAX_REFERENCE_TOTAL_BYTES = 24 * 1024 * 1024;
export function validateImageReferences(files) {
  if (files.length > MAX_IMAGE_REFERENCES) return 'You can attach up to 16 reference images.';
  if (files.some(file => !file || typeof file.size !== 'number' || typeof file.arrayBuffer !== 'function')) return 'Invalid reference image.';
  if (files.some(file => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))) return 'Choose PNG, JPEG or WebP images.';
  if (files.some(file => !file.size || file.size > 10 * 1024 * 1024)) return 'Each reference image must be non-empty and no larger than 10 MB.';
  if (files.reduce((total, file) => total + file.size, 0) > MAX_REFERENCE_TOTAL_BYTES) return 'Reference images must total no more than 24 MB.';
  return '';
}
