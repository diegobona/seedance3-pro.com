import { t } from './i18n.mjs';
export const MAX_IMAGE_REFERENCES = 16;
export const MAX_REFERENCE_TOTAL_BYTES = 24 * 1024 * 1024;
export function validateImageReferences(files) {
  if (files.length > MAX_IMAGE_REFERENCES) return t('You can attach up to 16 reference images.');
  if (files.some(file => !file || typeof file.size !== 'number' || typeof file.arrayBuffer !== 'function')) return t('Invalid reference image.');
  if (files.some(file => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))) return t('Choose PNG, JPEG or WebP images.');
  if (files.some(file => !file.size || file.size > 10 * 1024 * 1024)) return t('Each reference image must be non-empty and no larger than 10 MB.');
  if (files.reduce((total, file) => total + file.size, 0) > MAX_REFERENCE_TOTAL_BYTES) return t('Reference images must total no more than 24 MB.');
  return '';
}
