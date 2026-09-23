import { PROP_CATALOG } from './pose-props.mjs';
import { ANIMAL_CATALOG } from './pose-animals.mjs';

const ASPECTS = ['auto', '1 / 1', '3 / 4', '9 / 16', '16 / 9'];
const MAX_BYTES = 2_000_000;
const vector = (value, length) => Array.isArray(value) && value.length === length && value.every(n => Number.isFinite(n) && Math.abs(n) <= 1e6);
const transform = value => value && vector(value.position,3) && vector(value.quaternion,4) && Math.hypot(...value.quaternion) > .01 && vector(value.scale,3) && value.scale.every(n => n > 0 && n <= 1000);
const color = value => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);

export function validateSharedScene(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.actors) || !data.actors.length || data.actors.length > 30 || !ASPECTS.includes(data.aspect) || !/^[\da-f]{6}$/i.test(data.background) || !vector(data.camera?.position,3) || !vector(data.camera?.target,3)) throw new Error('Invalid scene');
  const ids = new Set();
  for (const actor of data.actors) {
    if (typeof actor.id !== 'string' || ids.has(actor.id) || !transform(actor) || !color(actor.color) || typeof actor.mirrored !== 'boolean' || !Array.isArray(actor.bones) || actor.bones.length > 300) throw new Error('Invalid object');
    ids.add(actor.id);
    if (actor.kind === 'prop') {
      if (!Object.hasOwn(PROP_CATALOG, actor.modelKey) || actor.bones.length || actor.mirrored) throw new Error('Invalid prop');
    } else if (actor.kind === 'animal') {
      if (!Object.hasOwn(ANIMAL_CATALOG,actor.modelKey)) throw new Error('Invalid animal');
    } else if (actor.kind !== 'mannequin' || !['studio-01','studio-02'].includes(actor.modelKey)) throw new Error('Invalid model');
    if (actor.bones.some(b => !transform(b) || !Number.isInteger(b.index) || b.index < 0 || b.index >= 300)) throw new Error('Invalid pose');
  }
  return data;
}

export async function encodeSharedScene(data) {
  validateSharedScene(data);
  // Bone names are not required for index-based restore. Round insignificant float noise.
  const json = JSON.stringify(data, (key,value) => key === 'name' ? undefined : typeof value === 'number' ? Math.round(value * 100000) / 100000 : value);
  const compressed = await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
  const bytes = new Uint8Array(compressed);
  if (bytes.length > 60000) throw new Error('Scene too large to share');
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/, '');
}

export async function decodeSharedScene(encoded) {
  if (!encoded || encoded.length > 80000 || !/^[\w-]+$/.test(encoded)) throw new Error('Invalid link');
  const bytes = Uint8Array.from(atob(encoded.replaceAll('-','+').replaceAll('_','/')), c => c.charCodeAt(0));
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const chunks = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_BYTES) throw new Error('Scene too large');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return validateSharedScene(JSON.parse(await new Blob(chunks).text()));
}
