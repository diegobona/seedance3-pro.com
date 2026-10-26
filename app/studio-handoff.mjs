import { validateVideoReferenceFiles } from './video-generation.mjs';

const KEY = 'seedance:h3:handoff';
export const ACTIVE_VIDEO_TASK_KEY = 'seedance:minimax-h3:active-task';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function referenceFile(mode, key, file) {
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open('seedance-studio-handoff', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('references');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Reference transfer is busy. Please try again.'));
  });
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction('references', mode === 'get' ? 'readonly' : 'readwrite');
      const store = transaction.objectStore('references');
      const request = mode === 'get' ? store.get(key) : mode === 'put' ? store.put(file, key) : store.delete(key);
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('Reference transfer failed.'));
    });
  } finally { database.close(); }
}

export async function saveVideoHandoff(draft, { storage = sessionStorage,
  putFile = (key, file) => referenceFile('put', key, file), deleteFile = key => referenceFile('delete', key) } = {}) {
  let previous;
  try { previous = JSON.parse(storage.getItem(KEY) || 'null'); } catch { /* Replace invalid draft metadata. */ }
  const files = draft.files === undefined ? (draft.file ? [draft.file] : []) : draft.files;
  validateVideoReferenceFiles(files);
  const referenceKeys = files.map(() => crypto.randomUUID());
  const written = [];
  try {
    for (const [index,file] of files.entries()) {
      written.push(referenceKeys[index]);
      await putFile(referenceKeys[index],file);
    }
  } catch (error) {
    await Promise.allSettled(written.map(key => deleteFile(key)));
    throw error;
  }
  const referenceKey = referenceKeys[0] ?? null;
  const metadata = {
    createdAt: Date.now(), prompt: String(draft.prompt || '').slice(0, 2500),
    duration: [5, 10, 15].includes(Number(draft.duration)) ? Number(draft.duration) : 5,
    aspectRatio: ['16:9', '9:16', '1:1'].includes(draft.aspectRatio) ? draft.aspectRatio : '16:9',
    mode: draft.mode === 'reference' ? 'reference' : 'text', referenceKey, referenceKeys,
    taskId: UUID.test(draft.taskId || '') ? draft.taskId : '',
  };
  try { storage.setItem(KEY, JSON.stringify(metadata)); }
  catch (error) { await Promise.allSettled(referenceKeys.map(key => deleteFile(key))); throw error; }
  const oldKeys = new Set([...(Array.isArray(previous?.referenceKeys) ? previous.referenceKeys : []),previous?.referenceKey].filter(key => UUID.test(key || '')));
  await Promise.allSettled([...oldKeys].map(key => deleteFile(key)));
  return metadata;
}

export async function readVideoHandoff({ storage = sessionStorage, consume = true, maxAgeMs=60*60*1000,
  getFile = key => referenceFile('get', key), deleteFile = key => referenceFile('delete', key) } = {}) {
  let draft;
  try { draft = JSON.parse(storage.getItem(KEY) || 'null'); } catch { storage.removeItem(KEY); return null; }
  const keys = Array.isArray(draft?.referenceKeys) ? draft.referenceKeys : draft?.referenceKey ? [draft.referenceKey] : [];
  if (!draft || !Number.isFinite(draft.createdAt) || Date.now() - draft.createdAt > Math.min(24*60*60*1000,Math.max(0,maxAgeMs))
    || !['16:9', '9:16', '1:1'].includes(draft.aspectRatio) || ![5, 10, 15].includes(draft.duration)
    || typeof draft.prompt !== 'string' || draft.prompt.length > 2500
    || (draft.taskId && !UUID.test(draft.taskId)) || (draft.referenceKeys !== undefined && !Array.isArray(draft.referenceKeys))
    || keys.length > 9 || new Set(keys).size !== keys.length || keys.some(key => !UUID.test(key))) {
    storage.removeItem(KEY); return null;
  }
  const files = [];
  for (const [index,key] of keys.entries()) {
    let file = await getFile(key);
    if (!(file instanceof Blob) || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
      || !file.size || file.size > 10 * 1024 * 1024) throw new Error('The reference image could not be restored. Please choose it again.');
    if (!(file instanceof File)) file = new File([file], `reference-image-${index + 1}`, { type: file.type });
    files.push(file);
  }
  if (consume) {
    storage.removeItem(KEY);
    await Promise.allSettled(keys.map(key => deleteFile(key)));
  }
  return { ...draft, files, file: files[0] ?? null };
}
