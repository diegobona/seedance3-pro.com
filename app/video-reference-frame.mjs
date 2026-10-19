import { t } from './i18n.mjs';

// Match the provider's native 480P sizes, including its slightly wider 16:9 frame.
const FRAMES = Object.freeze({
  '16:9': { width: 864, height: 480 },
  '9:16': { width: 480, height: 864 },
  '1:1': { width: 480, height: 480 },
});

export function videoReferenceFrameSize(aspectRatio) {
  if (typeof aspectRatio !== 'string' || !Object.hasOwn(FRAMES, aspectRatio)) {
    throw new RangeError(t('Choose a supported video aspect ratio.'));
  }
  return { ...FRAMES[aspectRatio] };
}

export function videoReferenceLayout(imageWidth, imageHeight, aspectRatio) {
  const { width, height } = videoReferenceFrameSize(aspectRatio);
  if (![imageWidth, imageHeight].every(value => Number.isFinite(value) && value > 0)) {
    throw new RangeError(t('Could not prepare the reference image. Please choose it again.'));
  }
  const scale = Math.min(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  return { width, height, drawX: Math.max(0, (width - drawWidth) / 2),
    drawY: Math.max(0, (height - drawHeight) / 2), drawWidth, drawHeight };
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw signal.reason instanceof Error
    ? signal.reason : new DOMException(t('Video polling was aborted.'), 'AbortError');
}

async function decodeReferenceImage(file) {
  if (typeof globalThis.createImageBitmap === 'function') {
    const image = await globalThis.createImageBitmap(file, { imageOrientation: 'from-image' });
    return { image, width: image.width, height: image.height, close: () => image.close() };
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    image.onload = image.onerror = null;
    return { image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}

export async function prepareVideoReferenceFrame(file, {
  aspectRatio = '16:9', signal, decodeImage = decodeReferenceImage,
  createCanvas = () => document.createElement('canvas'),
} = {}) {
  throwIfAborted(signal);
  // Validate before allocating a decoded image or a canvas.
  videoReferenceFrameSize(aspectRatio);
  let decoded;
  let canvas;
  try {
    decoded = await decodeImage(file);
    throwIfAborted(signal);
    const fit = videoReferenceLayout(decoded.width, decoded.height, aspectRatio);
    canvas = createCanvas();
    canvas.width = fit.width;
    canvas.height = fit.height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas unavailable');
    context.fillStyle = '#000000';
    context.fillRect(0, 0, fit.width, fit.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(decoded.image, fit.drawX, fit.drawY, fit.drawWidth, fit.drawHeight);
    const prepared = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    throwIfAborted(signal);
    if (!prepared || prepared.type !== 'image/png' || !prepared.size || prepared.size > 10 * 1024 * 1024) {
      throw new Error('Image encoding failed');
    }
    return prepared;
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new Error(t('Could not prepare the reference image. Please choose it again.'));
  } finally {
    try { decoded?.close?.(); }
    finally { if (canvas) { canvas.width = 0; canvas.height = 0; } }
  }
}
