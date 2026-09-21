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

export function captureBoneTransforms(bones) {
  return bones.map((bone, index) => ({
    index,
    name: bone.name,
    position: bone.position.toArray(),
    quaternion: bone.quaternion.toArray(),
    scale: bone.scale.toArray(),
  }));
}

export function applyBoneTransforms(bones, savedBones) {
  for (const saved of savedBones) {
    const bone = bones[saved.index];
    if (!bone) continue;
    bone.position.fromArray(saved.position);
    bone.quaternion.fromArray(saved.quaternion);
    bone.scale.fromArray(saved.scale);
  }
}
