export function normalizedBoneName(name) {
  return String(name || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

export function buildPreferredBoneIndex(root) {
  const byName = new Map();
  const bones = [];

  root?.traverse?.((object) => {
    if (!object?.isBone || !object.name) return;
    bones.push(object);

    for (const key of [object.name, normalizedBoneName(object.name)]) {
      if (key && !byName.has(key)) byName.set(key, object);
    }
  });

  return { byName, bones };
}
