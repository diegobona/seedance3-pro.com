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
  const referenceKey = draft.file ? crypto.randomUUID() : null;
  if (referenceKey) await putFile(referenceKey, draft.file);
  const metadata = {
    createdAt: Date.now(), prompt: String(draft.prompt || '').slice(0, 2500),
    duration: [5, 10, 15].includes(Number(draft.duration)) ? Number(draft.duration) : 5,
    aspectRatio: ['16:9', '9:16', '1:1'].includes(draft.aspectRatio) ? draft.aspectRatio : '16:9',
    mode: draft.mode === 'reference' ? 'reference' : 'text', referenceKey,
    taskId: UUID.test(draft.taskId || '') ? draft.taskId : '',
  };
  try { storage.setItem(KEY, JSON.stringify(metadata)); }
  catch (error) { if (referenceKey) await deleteFile(referenceKey).catch(() => {}); throw error; }
  if (UUID.test(previous?.referenceKey || '')) await deleteFile(previous.referenceKey).catch(() => {});
  return metadata;
}

export async function readVideoHandoff({ storage = sessionStorage, consume = true,
  getFile = key => referenceFile('get', key), deleteFile = key => referenceFile('delete', key) } = {}) {
  let draft;
  try { draft = JSON.parse(storage.getItem(KEY) || 'null'); } catch { storage.removeItem(KEY); return null; }
  if (!draft || !Number.isFinite(draft.createdAt) || Date.now() - draft.createdAt > 60 * 60 * 1000
    || !['16:9', '9:16', '1:1'].includes(draft.aspectRatio) || ![5, 10, 15].includes(draft.duration)
    || typeof draft.prompt !== 'string' || draft.prompt.length > 2500
    || (draft.taskId && !UUID.test(draft.taskId)) || (draft.referenceKey && !UUID.test(draft.referenceKey))) {
    storage.removeItem(KEY); return null;
  }
  let file = null;
  if (draft.referenceKey) {
    file = await getFile(draft.referenceKey);
    if (!(file instanceof Blob) || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
      || !file.size || file.size > 10 * 1024 * 1024) throw new Error('The reference image could not be restored. Please choose it again.');
    if (!(file instanceof File)) file = new File([file], 'reference-image', { type: file.type });
  }
  if (consume) {
    storage.removeItem(KEY);
    if (draft.referenceKey) await deleteFile(draft.referenceKey).catch(() => {});
  }
  return { ...draft, file };
}
