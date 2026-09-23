import { clone } from 'three/addons/utils/SkeletonUtils.js';

function release(root) {
  root.traverse(part => {
    part.geometry?.dispose();
    part.skeleton?.dispose();
    for (const material of (Array.isArray(part.material) ? part.material : [part.material])) {
      if (!material) continue;
      for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
      material.dispose();
    }
  });
}

// Keep parsed templates pristine. Each scene object owns its bones and GPU resources.
export function createModelCache(load) {
  const templates = new Map();
  let disposed = false;
  function templateFor(key) {
    if (disposed) return Promise.reject(new Error('Model cache disposed'));
    if (!templates.has(key)) {
      const pending = Promise.resolve().then(() => load(key)).catch(error => { templates.delete(key); throw error; });
      templates.set(key, pending);
    }
    return templates.get(key);
  }
  return {
    preload(key) { return templateFor(key).then(() => undefined); },
    async get(key) {
      const template = await templateFor(key);
      if (disposed) throw new Error('Model cache disposed');
      const copy = clone(template);
      copy.traverse(part => {
        if (!part.isMesh) return;
        part.geometry = part.geometry.clone();
        const copyMaterial = material => {
          const next = material.clone();
          for (const [key,value] of Object.entries(next)) if (value?.isTexture) next[key] = value.clone();
          return next;
        };
        part.material = Array.isArray(part.material) ? part.material.map(copyMaterial) : copyMaterial(part.material);
      });
      return copy;
    },
    dispose() {
      disposed = true;
      templates.forEach(pending => { void pending.then(release, () => {}); });
      templates.clear();
    },
  };
}
