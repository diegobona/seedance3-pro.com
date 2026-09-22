import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import mannequinUrl from "./pose-assets/anyposes-female-rig.fbx?url";
import studio02Url from "./pose-assets/anyposes-studio-02.fbx?url";
import studio01Preview from "./pose-assets/studio-01-preview.png";
import studio02Preview from "./pose-assets/studio-02-preview.png";
import { captureSceneState, restoreSceneState, nextActorPosition, normalizeMannequin } from "./pose-scene-state.mjs";
import { RAGDOLL_HANDLE_SPECS } from "./pose-ragdoll-config.mjs";
import {
  applyBoneTransforms,
  buildPreferredBoneIndex,
  captureBoneTransforms,
  normalizedBoneName,
} from "./pose-rig-index.mjs";
import { ANYPOSES_PRESETS, ANYPOSES_REFERENCE_DIRECTIONS } from "./pose-presets.mjs";
import { capturePoseReference } from "./pose-transfer.mjs";

const MAX_HISTORY = 40;
const MODEL_CATALOG = {
  "studio-01": { label: "Studio 01", url: mannequinUrl, preview: studio01Preview },
  "studio-02": { label: "Studio 02", url: studio02Url, preview: studio02Preview },
};
const PRESET_BONE_BINDINGS = [
  { key: "spine", bone: "mixamorig:Spine", child: "mixamorig:Spine1" },
  { key: "leftArm", bone: "mixamorig:LeftArm", child: "mixamorig:LeftForeArm" },
  { key: "leftForeArm", bone: "mixamorig:LeftForeArm", child: "mixamorig:LeftHand" },
  { key: "rightArm", bone: "mixamorig:RightArm", child: "mixamorig:RightForeArm" },
  { key: "rightForeArm", bone: "mixamorig:RightForeArm", child: "mixamorig:RightHand" },
  { key: "leftUpLeg", bone: "mixamorig:LeftUpLeg", child: "mixamorig:LeftLeg" },
  { key: "leftLeg", bone: "mixamorig:LeftLeg", child: "mixamorig:LeftFoot" },
  { key: "rightUpLeg", bone: "mixamorig:RightUpLeg", child: "mixamorig:RightLeg" },
  { key: "rightLeg", bone: "mixamorig:RightLeg", child: "mixamorig:RightFoot" },
];

function disposeObject(root) {
  root?.traverse?.((object) => {
    object.geometry?.dispose?.();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.filter(Boolean).forEach((material) => {
      for (const value of Object.values(material)) {
        if (value?.isTexture) value.dispose();
      }
      material.dispose?.();
    });
  });
}

function cloneSnapshot(model, bones) {
  return {
    position: model.position.toArray(),
    quaternion: model.quaternion.toArray(),
    bones: captureBoneTransforms(bones),
  };
}

function snapshotSignature(snapshot) {
  return JSON.stringify(snapshot);
}

export function initializePoseStudio({ container, canvasHost, onUsePose }) {
  if (!container || !canvasHost) return () => {};

  const loading = canvasHost.querySelector("#pose-canvas-loading");
  const hint = canvasHost.querySelector("#pose-canvas-hint");
  const undoButton = container.querySelector('[data-pose-action="undo"]');
  const redoButton = container.querySelector('[data-pose-action="redo"]');
  const resetButton = container.querySelector('[data-pose-action="reset"]');
  const usePoseButton = container.querySelector('[data-pose-action="use"]');
  const presetButtons = Array.from(container.querySelectorAll("[data-pose-preset]"));
  const modelButtons = Array.from(container.querySelectorAll("[data-pose-model]"));
  const addButton = container.querySelector('[data-pose-action="add"]');
  const removeButton = container.querySelector('[data-pose-action="remove"]');
  const frameButton = container.querySelector('[data-pose-action="frame"]');
  const actorList = container.querySelector("#pose-actor-list");
  const actorCount = container.querySelector("#pose-actor-count");
  const placementButtons = Array.from(container.querySelectorAll("[data-pose-move], [data-pose-turn]"));
  const cleanups = [];
  const undoStack = [];
  const redoStack = [];
  const handles = [];
  let bonesByName = new Map();
  let presetBindings = [];
  const actorRecords = new Map();
  let actors = [];
  let selectedId = null;
  let selectedModel = "studio-01";
  let nextActorId = 1;
  let modelLoading = false;
  let mannequin = null;
  let mannequinBones = [];
  let neutralSnapshot = null;
  let destroyed = false;
  let frameId = 0;
  let drag = null;
  let hoveredHandle = null;
  let poseCaptureInFlight = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0d0d);
  scene.fog = new THREE.Fog(0x0b0d0d, 16, 30);

  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 80);
  camera.position.set(0, 4.2, 15);

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.className = "pose-webgl-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  canvasHost.prepend(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 4, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minDistance = 7;
  controls.maxDistance = 36;
  controls.minPolarAngle = Math.PI * 0.18;
  controls.maxPolarAngle = Math.PI * 0.8;

  scene.add(new THREE.HemisphereLight(0xf3f6f0, 0x26291e, 2.35));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.6);
  keyLight.position.set(6, 12, 8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -8;
  keyLight.shadow.camera.right = 8;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -2;
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xd8ff73, 2.2);
  rimLight.position.set(-7, 8, -5);
  scene.add(rimLight);

  const grid = new THREE.GridHelper(22, 22, 0x63782e, 0x242824);
  grid.material.opacity = 0.4;
  grid.material.transparent = true;
  scene.add(grid);

  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x101312, roughness: 0.94 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(10.8, 64), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const dragPlane = new THREE.Plane();
  const dragPoint = new THREE.Vector3();
  const dragOffset = new THREE.Vector3();
  const cameraDirection = new THREE.Vector3();
  const scratchJointPosition = new THREE.Vector3();
  const scratchEffectorPosition = new THREE.Vector3();
  const scratchToEffector = new THREE.Vector3();
  const scratchToTarget = new THREE.Vector3();
  const scratchAxis = new THREE.Vector3();
  const scratchParentQuaternion = new THREE.Quaternion();
  const scratchRotation = new THREE.Quaternion();
  const scratchPresetReference = new THREE.Vector3();
  const scratchPresetDirection = new THREE.Vector3();
  const scratchPresetWorldDirection = new THREE.Vector3();
  const scratchPresetParentDirection = new THREE.Vector3();
  const scratchPresetDelta = new THREE.Quaternion();
  const scratchPresetLocalDelta = new THREE.Quaternion();

  function setHint(message) {
    if (hint) hint.textContent = message;
  }

  function updateHistoryButtons() {
    undoButton.disabled = modelLoading || poseCaptureInFlight || undoStack.length === 0;
    redoButton.disabled = modelLoading || poseCaptureInFlight || redoStack.length === 0;
  }

  function captureSnapshot() {
    return captureSceneState(actors, selectedId);
  }

  function applySnapshot(snapshot) {
    if (!snapshot) return;
    const restored = restoreSceneState(actorRecords, snapshot);
    actors = restored.actors;
    selectActor(restored.selectedId);
    clearActivePreset();
  }

  function selectActor(id) {
    finishDrag();
    const actor = actors.find((candidate) => candidate.id === id);
    selectedId = actor?.id ?? null;
    mannequin = actor?.model ?? null;
    mannequinBones = actor?.bones ?? [];
    bonesByName = actor?.byName ?? new Map();
    presetBindings = actor?.bindings ?? [];
    neutralSnapshot = actor?.neutral ?? null;
    if (hoveredHandle) hoveredHandle.scale.setScalar(1);
    hoveredHandle = null;
    clearActivePreset();
    renderActorList();
    updateHandlePositions();
  }

  function updateSceneButtons() {
    const busy = modelLoading || poseCaptureInFlight;
    addButton.disabled = busy;
    removeButton.disabled = busy || !mannequin;
    frameButton.disabled = busy || !actors.length;
    placementButtons.forEach((button) => { button.disabled = busy || !mannequin; });
    presetButtons.forEach((button) => { button.disabled = busy || !mannequin; });
    resetButton.disabled = busy || !mannequin;
    usePoseButton.disabled = busy || !actors.length;
    updateHistoryButtons();
  }

  function renderActorList() {
    actorList.replaceChildren();
    for (const actor of actors) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.poseActor = actor.id;
      button.setAttribute("aria-pressed", String(actor.id === selectedId));
      const thumbnail = document.createElement("img");
      thumbnail.src = MODEL_CATALOG[actor.modelKey].preview;
      thumbnail.alt = "";
      const label = document.createElement("span");
      label.textContent = actor.label;
      button.append(thumbnail, label);
      actorList.append(button);
    }
    actorCount.textContent = `${actors.length} mannequin${actors.length === 1 ? "" : "s"}`;
    updateSceneButtons();
  }

  function pruneRemovedActors() {
    const retained = new Set(actors.map(({ id }) => id));
    for (const snapshot of [...undoStack, ...redoStack]) {
      snapshot.actors.forEach(({ id }) => retained.add(id));
    }
    for (const [id, actor] of actorRecords) {
      if (retained.has(id)) continue;
      scene.remove(actor.model);
      disposeObject(actor.model);
      actorRecords.delete(id);
    }
  }

  function pushHistory(snapshot) {
    const current = captureSnapshot();
    if (!snapshot || !current || snapshotSignature(snapshot) === snapshotSignature(current)) return;
    undoStack.push(snapshot);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
    pruneRemovedActors();
    updateHistoryButtons();
  }

  function undo() {
    const previous = undoStack.pop();
    if (!previous) return;
    redoStack.push(captureSnapshot());
    applySnapshot(previous);
    updateHistoryButtons();
    setHint("Pose change undone");
  }

  function redo() {
    const next = redoStack.pop();
    if (!next) return;
    undoStack.push(captureSnapshot());
    applySnapshot(next);
    updateHistoryButtons();
    setHint("Pose change restored");
  }

  function effectorFor(spec) {
    return bonesByName.get(spec.effector) || bonesByName.get(normalizedBoneName(spec.effector)) || null;
  }

  function boneFor(name) {
    return bonesByName.get(name) || bonesByName.get(normalizedBoneName(name)) || null;
  }

  function updateHandlePositions() {
    if (!mannequin) {
      handles.forEach((handle) => { handle.visible = false; });
      return;
    }
    mannequin.updateMatrixWorld(true);
    for (const handle of handles) {
      if (drag?.handle === handle) continue;
      const effector = effectorFor(handle.userData.spec);
      handle.visible = Boolean(effector);
      if (effector) effector.getWorldPosition(handle.position);
    }
  }

  function rotateJointToward(joint, effector, target, maxAngle) {
    joint.getWorldPosition(scratchJointPosition);
    effector.getWorldPosition(scratchEffectorPosition);
    scratchToEffector.subVectors(scratchEffectorPosition, scratchJointPosition);
    scratchToTarget.subVectors(target, scratchJointPosition);
    if (scratchToEffector.lengthSq() < 1e-8 || scratchToTarget.lengthSq() < 1e-8) return false;
    scratchToEffector.normalize();
    scratchToTarget.normalize();
    const cosine = THREE.MathUtils.clamp(scratchToEffector.dot(scratchToTarget), -1, 1);
    let angle = Math.acos(cosine);
    if (angle < 0.0002) return false;
    scratchAxis.crossVectors(scratchToEffector, scratchToTarget);
    if (scratchAxis.lengthSq() < 1e-9) return false;
    scratchAxis.normalize();
    angle = Math.min(angle, maxAngle);
    joint.parent.getWorldQuaternion(scratchParentQuaternion).invert();
    scratchAxis.applyQuaternion(scratchParentQuaternion).normalize();
    scratchRotation.setFromAxisAngle(scratchAxis, angle);
    joint.quaternion.premultiply(scratchRotation).normalize();
    mannequin.updateMatrixWorld(true);
    return true;
  }

  function solveChainToTarget(spec, target) {
    const effector = effectorFor(spec);
    if (!effector) return;
    if (spec.key === "pelvis") {
      effector.getWorldPosition(scratchEffectorPosition);
      mannequin.position.add(scratchToTarget.subVectors(target, scratchEffectorPosition));
      mannequin.updateMatrixWorld(true);
      return;
    }

    const chain = spec.chain
      .map((name) => bonesByName.get(name) || bonesByName.get(normalizedBoneName(name)))
      .filter(Boolean);
    const stepAngles = [0.22, 0.14, 0.08, 0.035];
    for (let iteration = 0; iteration < 7; iteration += 1) {
      effector.getWorldPosition(scratchEffectorPosition);
      if (scratchEffectorPosition.distanceToSquared(target) < 0.0008) break;
      let improved = false;
      for (const maxAngle of stepAngles) {
        for (const joint of chain) {
          improved = rotateJointToward(joint, effector, target, maxAngle) || improved;
        }
      }
      if (!improved) break;
    }
  }

  function createHandles() {
    const handleMaterialByColor = new Map();
    for (const spec of RAGDOLL_HANDLE_SPECS) {
      if (!effectorFor(spec)) continue;
      let material = handleMaterialByColor.get(spec.color);
      if (!material) {
        material = new THREE.MeshBasicMaterial({
          color: spec.color,
          depthTest: false,
          depthWrite: false,
          transparent: true,
          opacity: 0.94,
        });
        handleMaterialByColor.set(spec.color, material);
      }
      const visibleRadius = spec.radius * 1.28;
      const handle = new THREE.Mesh(new THREE.SphereGeometry(visibleRadius, 18, 12), material);
      handle.name = `Ragdoll handle · ${spec.label}`;
      handle.renderOrder = 999;
      handle.userData.spec = spec;
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(visibleRadius * 1.52, 14, 10),
        new THREE.MeshBasicMaterial({
          color: spec.color,
          wireframe: true,
          transparent: true,
          opacity: 0.3,
          depthTest: false,
        })
      );
      halo.userData.spec = spec;
      halo.renderOrder = 998;
      handle.add(halo);
      handles.push(handle);
      scene.add(handle);
    }
    canvasHost.dataset.ragdollHandleCount = String(handles.length);
    updateHandlePositions();
  }

  function pointerFromEvent(event) {
    const bounds = renderer.domElement.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return false;
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return true;
  }

  function pickedHandle(event) {
    if (!pointerFromEvent(event)) return null;
    const hit = raycaster.intersectObjects(handles.filter((handle) => handle.visible), true)[0]?.object;
    if (!hit) return null;
    return hit.parent?.userData?.spec ? hit.parent : hit;
  }

  function onPointerDown(event) {
    if (event.button !== 0 || modelLoading || poseCaptureInFlight) return;
    const handle = pickedHandle(event);
    if (!handle) {
      const hit = raycaster.intersectObjects(actors.map(({ model }) => model), true)[0]?.object;
      if (hit) {
        let root = hit;
        while (root.parent && root.parent !== scene) root = root.parent;
        const actor = actors.find(({ model }) => model === root);
        if (actor && actor.id !== selectedId) {
          selectActor(actor.id);
          setHint(`${actor.label} selected · drag a handle to pose it`);
        }
      }
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    renderer.domElement.setPointerCapture?.(event.pointerId);
    controls.enabled = false;
    camera.getWorldDirection(cameraDirection);
    dragPlane.setFromNormalAndCoplanarPoint(cameraDirection, handle.position);
    raycaster.ray.intersectPlane(dragPlane, dragPoint);
    dragOffset.subVectors(handle.position, dragPoint);
    drag = { handle, pointerId: event.pointerId, before: captureSnapshot() };
    handle.scale.setScalar(1.26);
    canvasHost.classList.add("is-dragging-pose");
    setHint(`Moving ${handle.userData.spec.label} · release to set the pose`);
  }

  function onPointerMove(event) {
    if (!drag) {
      const handle = pickedHandle(event);
      if (handle !== hoveredHandle) {
        if (hoveredHandle) hoveredHandle.scale.setScalar(1);
        hoveredHandle = handle;
        if (hoveredHandle) hoveredHandle.scale.setScalar(1.12);
      }
      renderer.domElement.style.cursor = handle ? "grab" : "grab";
      return;
    }
    if (event.pointerId !== drag.pointerId || !pointerFromEvent(event)) return;
    if (!raycaster.ray.intersectPlane(dragPlane, dragPoint)) return;
    dragPoint.add(dragOffset);
    drag.handle.position.copy(dragPoint);
    solveChainToTarget(drag.handle.userData.spec, dragPoint);
    updateHandlePositions();
  }

  function finishDrag(event) {
    if (!drag || (event?.pointerId !== undefined && event.pointerId !== drag.pointerId)) return;
    const completed = drag;
    drag = null;
    controls.enabled = true;
    if (renderer.domElement.hasPointerCapture?.(completed.pointerId)) {
      renderer.domElement.releasePointerCapture(completed.pointerId);
    }
    completed.handle.scale.setScalar(hoveredHandle === completed.handle ? 1.12 : 1);
    canvasHost.classList.remove("is-dragging-pose");
    pushHistory(completed.before);
    updateHandlePositions();
    setHint("Drag any of the 13 handles · Drag empty space to orbit · Scroll to zoom");
  }

  function preparePresetBindings() {
    presetBindings.length = 0;
    mannequin.updateMatrixWorld(true);
    for (const spec of PRESET_BONE_BINDINGS) {
      const bone = boneFor(spec.bone);
      const child = boneFor(spec.child);
      if (!bone || !child) continue;
      const bonePosition = bone.getWorldPosition(new THREE.Vector3());
      const childPosition = child.getWorldPosition(new THREE.Vector3());
      const restWorldDirection = childPosition.sub(bonePosition).normalize();
      const parentWorldInverse = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      const restParentDirection = restWorldDirection.clone().applyQuaternion(parentWorldInverse).normalize();
      presetBindings.push({
        ...spec,
        bone,
        restLocalQuaternion: bone.quaternion.clone(),
        restWorldDirection,
        restParentDirection,
      });
    }
  }

  function applyPresetDirection(binding, referenceDirection, poseDirection) {
    scratchPresetReference.fromArray(referenceDirection).normalize();
    scratchPresetDirection.fromArray(poseDirection).normalize();
    scratchPresetDelta.setFromUnitVectors(scratchPresetReference, scratchPresetDirection);
    scratchPresetWorldDirection.copy(binding.restWorldDirection).applyQuaternion(scratchPresetDelta).normalize();
    binding.bone.parent.getWorldQuaternion(scratchParentQuaternion).invert();
    scratchPresetParentDirection.copy(scratchPresetWorldDirection).applyQuaternion(scratchParentQuaternion).normalize();
    scratchPresetLocalDelta.setFromUnitVectors(binding.restParentDirection, scratchPresetParentDirection);
    binding.bone.quaternion.copy(scratchPresetLocalDelta.multiply(binding.restLocalQuaternion)).normalize();
    mannequin.updateMatrixWorld(true);
  }

  function placePresetOnGround() {
    mannequin.traverse((part) => {
      if (part.isSkinnedMesh) part.computeBoundingBox?.();
    });
    const bounds = new THREE.Box3().setFromObject(mannequin);
    if (Number.isFinite(bounds.min.y)) {
      mannequin.position.y -= bounds.min.y;
      mannequin.updateMatrixWorld(true);
    }
  }

  function clearActivePreset() {
    presetButtons.forEach((button) => button.classList.remove("is-active"));
  }

  function resetPose() {
    if (!neutralSnapshot) return;
    const before = captureSnapshot();
    restoreNeutralPose();
    updateHandlePositions();
    pushHistory(before);
    clearActivePreset();
    setHint("Neutral pose restored · drag a handle to refine it");
  }

  function applyPreset(name) {
    const preset = ANYPOSES_PRESETS.find((candidate) => candidate.key === name);
    if (!neutralSnapshot || !preset) return;
    const before = captureSnapshot();
    const facing = mannequin.quaternion.clone();
    mannequin.quaternion.fromArray(neutralSnapshot.quaternion);
    restoreNeutralPose();
    for (const binding of presetBindings) {
      applyPresetDirection(
        binding,
        ANYPOSES_REFERENCE_DIRECTIONS[binding.key],
        preset.directions[binding.key]
      );
    }
    placePresetOnGround();
    mannequin.quaternion.copy(facing);
    mannequin.updateMatrixWorld(true);
    updateHandlePositions();
    pushHistory(before);
    presetButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.posePreset === name));
    setHint(`${preset.label} · Anyposes preset ${preset.sourceCode} · drag a handle to refine it`);
  }

  function restoreNeutralPose() {
    applyBoneTransforms(mannequinBones, neutralSnapshot.bones);
    mannequin.position.y = neutralSnapshot.position[1];
    mannequin.updateMatrixWorld(true);
  }

  function changePlacement(button) {
    if (!mannequin || modelLoading || poseCaptureInFlight) return;
    const before = captureSnapshot();
    const direction = button.dataset.poseMove;
    if (direction === "left") mannequin.position.x -= 0.5;
    if (direction === "right") mannequin.position.x += 0.5;
    if (direction === "back") mannequin.position.z -= 0.5;
    if (direction === "front") mannequin.position.z += 0.5;
    if (button.dataset.poseTurn) mannequin.rotateY(THREE.MathUtils.degToRad(Number(button.dataset.poseTurn)));
    mannequin.updateMatrixWorld(true);
    updateHandlePositions();
    pushHistory(before);
    setHint("Position updated · use Fit scene to see all mannequins");
  }

  function removeSelectedActor() {
    if (!mannequin || modelLoading || poseCaptureInFlight) return;
    finishDrag();
    const before = captureSnapshot();
    mannequin.visible = false;
    actors = actors.filter(({ id }) => id !== selectedId);
    selectActor(actors.at(-1)?.id ?? null);
    pushHistory(before);
    setHint(actors.length ? "Mannequin removed · Undo to restore it" : "Choose a model and add a mannequin to begin");
  }

  function frameScene() {
    if (!actors.length) return;
    const bounds = new THREE.Box3();
    const point = new THREE.Vector3();
    for (const actor of actors) {
      actor.model.updateMatrixWorld(true);
      actor.bones.forEach((bone) => bounds.expandByPoint(bone.getWorldPosition(point)));
    }
    if (bounds.isEmpty()) return;
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const distance = Math.max(16, size.y / (2 * tangent), size.x / (2 * tangent * camera.aspect)) * 1.35 + size.z / 2;
    controls.maxDistance = Math.max(36, distance * 2);
    camera.far = Math.max(80, distance * 4);
    scene.fog.near = distance + 12;
    scene.fog.far = distance + 35;
    camera.updateProjectionMatrix();
    controls.target.copy(center);
    camera.position.set(center.x, center.y + 0.15, center.z + distance);
    camera.lookAt(controls.target);
    controls.update();
  }

  async function useCurrentPose() {
    if (!actors.length || poseCaptureInFlight || modelLoading) return;
    finishDrag();
    poseCaptureInFlight = true;
    controls.enabled = false;
    updateSceneButtons();
    usePoseButton.textContent = "Capturing pose…";
    const handleVisibility = handles.map((handle) => handle.visible);
    const gridVisible = grid.visible;
    try {
      const file = await capturePoseReference({
        canvas: renderer.domElement,
        beforeCapture() {
          handles.forEach((handle) => { handle.visible = false; });
          grid.visible = false;
          renderer.render(scene, camera);
        },
        afterCapture() {
          handles.forEach((handle, index) => { handle.visible = handleVisibility[index]; });
          grid.visible = gridVisible;
          renderer.render(scene, camera);
        },
      });
      if (destroyed) return;
      await onUsePose?.(file);
      setHint("Pose reference captured · continue in GPT Image 2");
    } catch {
      if (!destroyed) setHint("The pose could not be captured · please try again");
    } finally {
      poseCaptureInFlight = false;
      if (!destroyed) {
        controls.enabled = true;
        updateSceneButtons();
        usePoseButton.textContent = "Use this pose";
      }
    }
  }

  function listen(target, type, listener, options) {
    target?.addEventListener(type, listener, options);
    cleanups.push(() => target?.removeEventListener(type, listener, options));
  }

  listen(renderer.domElement, "pointerdown", onPointerDown);
  listen(renderer.domElement, "pointermove", onPointerMove);
  listen(renderer.domElement, "pointerup", finishDrag);
  listen(renderer.domElement, "pointercancel", finishDrag);
  listen(renderer.domElement, "lostpointercapture", finishDrag);
  listen(undoButton, "click", undo);
  listen(redoButton, "click", redo);
  listen(resetButton, "click", resetPose);
  listen(usePoseButton, "click", useCurrentPose);
  listen(addButton, "click", () => addMannequin(selectedModel));
  listen(removeButton, "click", removeSelectedActor);
  listen(frameButton, "click", frameScene);
  listen(actorList, "click", (event) => {
    if (modelLoading || poseCaptureInFlight) return;
    const button = event.target.closest("[data-pose-actor]");
    if (button) selectActor(button.dataset.poseActor);
  });
  modelButtons.forEach((button) => listen(button, "click", () => {
    selectedModel = button.dataset.poseModel;
    modelButtons.forEach((candidate) => {
      const active = candidate.dataset.poseModel === selectedModel;
      candidate.classList.toggle("is-active", active);
      candidate.setAttribute("aria-pressed", String(active));
    });
  }));
  placementButtons.forEach((button) => listen(button, "click", () => changePlacement(button)));
  presetButtons.forEach((button) => listen(button, "click", () => applyPreset(button.dataset.posePreset)));

  function resize() {
    const width = Math.max(1, canvasHost.clientWidth);
    const height = Math.max(1, canvasHost.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvasHost);
  cleanups.push(() => resizeObserver.disconnect());

  function animate() {
    if (destroyed) return;
    controls.update();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(animate);
  }

  function prepareMannequin(object, modelKey) {
    mannequin = normalizeMannequin(object);
    bonesByName = new Map();
    mannequinBones = [];
    presetBindings = [];
    const boneIndex = buildPreferredBoneIndex(mannequin);
    for (const [name, bone] of boneIndex.byName) bonesByName.set(name, bone);
    mannequinBones.push(...boneIndex.bones);
    preparePresetBindings();

    mannequin.traverse((objectPart) => {
      if (!objectPart.isMesh) return;
      objectPart.castShadow = true;
      objectPart.receiveShadow = true;
      const originalMaterials = Array.isArray(objectPart.material) ? objectPart.material : [objectPart.material];
      const polishedMaterials = originalMaterials.map((material) => {
        const next = material.clone();
        next.color?.lerp?.(new THREE.Color(0xe2ded2), 0.38);
        if ("roughness" in next) next.roughness = 0.72;
        if ("metalness" in next) next.metalness = 0.02;
        return next;
      });
      objectPart.material = Array.isArray(objectPart.material) ? polishedMaterials : polishedMaterials[0];
    });

    mannequin.updateMatrixWorld(true);
    scene.add(mannequin);
    neutralSnapshot = cloneSnapshot(mannequin, mannequinBones);
    const id = String(nextActorId++);
    const actor = {
      id, modelKey, label: `${MODEL_CATALOG[modelKey].label} · ${id}`,
      model: mannequin, bones: mannequinBones, byName: bonesByName,
      bindings: presetBindings, neutral: neutralSnapshot,
    };
    const [x, , z] = nextActorPosition(actors);
    mannequin.position.x += x;
    mannequin.position.z += z;
    actors.push(actor);
    actorRecords.set(id, actor);
    selectActor(id);
    if (!handles.length) createHandles();
    frameScene();
  }

  presetButtons.forEach((button) => { button.disabled = true; });
  resetButton.disabled = true;
  usePoseButton.disabled = true;
  updateHistoryButtons();
  resize();
  animate();

  const loader = new FBXLoader();
  async function addMannequin(modelKey, initial = false) {
    if (modelLoading || poseCaptureInFlight || !MODEL_CATALOG[modelKey]) return;
    finishDrag();
    modelLoading = true;
    updateSceneButtons();
    if (loading) {
      loading.hidden = false;
      loading.innerHTML = "<span></span> Preparing mannequin…";
    }
    try {
      const object = await loader.loadAsync(MODEL_CATALOG[modelKey].url);
      if (destroyed) {
        disposeObject(object);
        return;
      }
      const before = captureSnapshot();
      prepareMannequin(object, modelKey);
      if (!initial) pushHistory(before);
      setHint("Select a mannequin · Drag its handles to pose · Drag empty space to orbit");
    } catch {
      if (!destroyed) setHint("This mannequin could not be loaded · click Add mannequin to retry");
    } finally {
      modelLoading = false;
      if (!destroyed) {
        if (loading) loading.hidden = true;
        updateSceneButtons();
      }
    }
  }
  addMannequin(selectedModel, true);

  return () => {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frameId);
    while (cleanups.length) cleanups.pop()();
    controls.dispose();
    renderer.dispose();
    handles.forEach((handle) => disposeObject(handle));
    actorRecords.forEach(({ model }) => disposeObject(model));
    grid.geometry.dispose();
    grid.material.dispose();
    keyLight.shadow.dispose();
    ground.geometry.dispose();
    groundMaterial.dispose();
    delete canvasHost.dataset.ragdollHandleCount;
    renderer.domElement.remove();
  };
}
