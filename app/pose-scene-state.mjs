import { captureBoneTransforms, applyBoneTransforms } from "./pose-rig-index.mjs";
import { Box3, Group, Vector3 } from "three";

// Keep asset-origin correction inside a child so scene translation and rotation
// always use a mannequin-centered pivot, regardless of the FBX source origin.
export function normalizeMannequin(object, height = 7.25) {
  const bounds = new Box3().setFromObject(object);
  object.scale.setScalar(height / Math.max(1, bounds.getSize(new Vector3()).y));
  object.updateMatrixWorld(true);
  const normalized = new Box3().setFromObject(object);
  const center = normalized.getCenter(new Vector3());
  object.position.x -= center.x;
  object.position.y -= normalized.min.y;
  object.position.z -= center.z;
  const model = new Group();
  model.add(object);
  model.updateMatrixWorld(true);
  return model;
}

export function captureSceneState(actors, selectedId) {
  return {
    selectedId,
    actors: actors.map(({ id, model, bones }) => ({
      id,
      position: model.position.toArray(),
      quaternion: model.quaternion.toArray(),
      bones: captureBoneTransforms(bones),
    })),
  };
}

export function restoreSceneState(records, snapshot) {
  const actors = [];
  records.forEach(({ model }) => { model.visible = false; });
  for (const saved of snapshot.actors) {
    const actor = records.get(saved.id);
    if (!actor) continue;
    actor.model.visible = true;
    actor.model.position.fromArray(saved.position);
    actor.model.quaternion.fromArray(saved.quaternion);
    applyBoneTransforms(actor.bones, saved.bones);
    actor.model.updateMatrixWorld(true);
    actors.push(actor);
  }
  const selectedId = actors.some(({ id }) => id === snapshot.selectedId)
    ? snapshot.selectedId : actors[0]?.id ?? null;
  return { actors, selectedId };
}

export function nextActorPosition(actors) {
  for (let slot = 0; ; slot += 1) {
    const x = slot === 0 ? 0 : Math.ceil(slot / 2) * 4 * (slot % 2 ? 1 : -1);
    if (actors.every(({ model }) => Math.hypot(model.position.x - x, model.position.z) >= 3.5)) {
      return [x, 0, 0];
    }
  }
}
