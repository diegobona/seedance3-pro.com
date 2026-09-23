import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { captureTransformBasis, applyPivotTransform } from "./pose-transform.mjs";
import mannequinUrl from "./pose-assets/anyposes-female-rig.fbx?url";
import studio02Url from "./pose-assets/anyposes-studio-02.fbx?url";
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
import { POSE_LIBRARY, presetPreview, setActorColor, setActorMirrored } from './pose-library.mjs';
import { PROP_CATALOG, createProp } from './pose-props.mjs';
import { encodeSharedScene, decodeSharedScene } from './pose-share.mjs';
import { createModelCache } from './pose-model-cache.mjs';
import { ANIMAL_CATALOG, ANIMAL_HANDLE_SPECS, ANIMAL_PRESETS, createAnimal, applyAnimalPreset, animalIcon } from './pose-animals.mjs';

const MAX_HISTORY = 40;
const MODEL_CATALOG = {
  "studio-01": { label: "Female", url: mannequinUrl },
  "studio-02": { label: "Male", url: studio02Url },
  ...ANIMAL_CATALOG,
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
  const presetGrid = container.querySelector('.pose-preset-grid');
  if (presetGrid) presetGrid.innerHTML = POSE_LIBRARY.map(p => `<button type="button" data-pose-preset="${p.key}" data-category="${p.category}" title="${p.label}"><span class="pose-preset-diagram">${presetPreview(p)}</span>${p.label}</button>`).join('');
  let presetButtons = Array.from(container.querySelectorAll("[data-pose-preset]"));
  const downloadButton = container.querySelector('[data-pose-action="download"]');
  const copyButton = container.querySelector('[data-pose-action="copy"]');
  const mirrorButton = container.querySelector('[data-pose-action="mirror"]');
  const bodyColor = container.querySelector('#pose-body-color');
  const backgroundColor = container.querySelector('#pose-background-color');
  let sceneAspect = 'auto';
  const shareButton = container.querySelector('[data-pose-action="share"]');
  const shareField = container.querySelector('#pose-share-link');
  const objectSelect = container.querySelector('#pose-scene-object');
  const propButtons = Array.from(container.querySelectorAll('[data-pose-prop]'));
  const modelButtons = Array.from(container.querySelectorAll("[data-pose-model]"));
  modelButtons.forEach(button => {
    const preview = button.querySelector('[data-animal-preview]');
    if (preview) preview.innerHTML = animalIcon(button.dataset.poseModel);
  });
  const addButton = container.querySelector('[data-pose-action="add"]');
  const removeButton = container.querySelector('[data-pose-action="remove"]');
  const objectToolbar = container.querySelector("#pose-object-toolbar");
  const selectedLabel = container.querySelector("#pose-selected-label");
  const toolButtons = Array.from(container.querySelectorAll("[data-pose-tool]"));
  const cleanups = [];
  const undoStack = [];
  const redoStack = [];
  const handles = [];
  let bonesByName = new Map();
  let presetBindings = [];
  const actorRecords = new Map();
  let actors = [];
  let selectedId = null;
  let selectedModel = "studio-02";
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
  let activeTool = "pose";
  let gizmoDrag = null;
  let emptyPress = null;

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

  const transform = new TransformControls(camera, renderer.domElement);
  // Route pointer events ourselves so IK, gizmos and orbit never start together.
  transform.disconnect();
  renderer.domElement.style.touchAction = "none";
  transform.setSize(1.15);
  const transformPivot = new THREE.Object3D();
  const transformHelper = transform.getHelper();
  scene.add(transformPivot, transformHelper);
  transform.detach();

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

  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x0b0d0d, roughness: 0.94 });
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
    return { ...captureSceneState(actors, selectedId), background: scene.background.getHexString() };
  }

  function applySnapshot(snapshot) {
    if (!snapshot) return;
    const restored = restoreSceneState(actorRecords, snapshot);
    actors = restored.actors;
    if (snapshot.background) changeBackground('#' + snapshot.background);
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
    if (actor?.kind === 'prop' && activeTool === 'pose') activeTool = 'translate';
    if (bodyColor) bodyColor.value = actor?.color ?? '#d9d9d9';
    if (hoveredHandle) hoveredHandle.scale.setScalar(1);
    hoveredHandle = null;
    renderPresetLibrary(actor);
    createHandles();
    updateSceneButtons();
    updateHandlePositions();
    syncTransformTool();
  }

  function syncTransformTool() {
    objectToolbar.hidden = !mannequin;
    selectedLabel.textContent = actorRecords.get(selectedId)?.label ?? "";
    toolButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.poseTool === activeTool)));
    transform.detach();
    if (!mannequin || activeTool === "pose") return;
    mannequin.updateMatrixWorld(true);
    const hips = boneFor("mixamorig:Hips") || boneFor('AnimalRoot');
    if (hips) hips.getWorldPosition(transformPivot.position);
    else mannequin.getWorldPosition(transformPivot.position);
    transformPivot.quaternion.copy(mannequin.quaternion);
    transformPivot.scale.setScalar(1);
    transformPivot.updateMatrixWorld(true);
    transform.setMode(activeTool);
    transform.setSpace(activeTool === "scale" ? "local" : "world");
    transform.attach(transformPivot);
    transformHelper.updateMatrixWorld(true);
  }

  function selectTool(tool) {
    if (!mannequin || modelLoading || poseCaptureInFlight) return;
    finishDrag();
    activeTool = tool;
    updateHandlePositions();
    syncTransformTool();
    const hints = {
      pose: "Drag a joint to pose · Click another character to select it",
      translate: "Drag an arrow or plane to move · Drag the center to move freely",
      rotate: "Drag a colored ring to rotate the selected object",
      scale: "Drag a scale handle to resize proportionally",
    };
    setHint(hints[tool]);
  }

  function updateSceneButtons() {
    const busy = modelLoading || poseCaptureInFlight;
    const isFigure = Boolean(mannequin && actorRecords.get(selectedId)?.kind !== 'prop');
    addButton.disabled = busy;
    removeButton.disabled = busy || !mannequin;
    toolButtons.forEach((button) => { button.disabled = busy || !mannequin || (button.dataset.poseTool === 'pose' && !isFigure); });
    presetButtons.forEach((button) => { button.disabled = busy || !isFigure; });
    resetButton.disabled = busy || !isFigure;
    usePoseButton.disabled = busy || !actors.length;
    for (const button of [downloadButton, copyButton]) if (button) button.disabled = busy || !actors.length;
    if (mirrorButton) mirrorButton.disabled = busy || !isFigure;
    if (bodyColor) bodyColor.disabled = busy || !mannequin;
    if (shareButton) shareButton.disabled = busy || !actors.length;
    propButtons.forEach(button => { button.disabled = busy || actors.length >= 30; });
    addButton.disabled = busy || actors.length >= 30;
    if (objectSelect) {
      objectSelect.replaceChildren(new Option('Select an object', ''), ...actors.map(actor => new Option(actor.label, actor.id)));
      objectSelect.value = selectedId ?? '';
      objectSelect.disabled = busy;
    }
    updateHistoryButtons();
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
    if (!mannequin || activeTool !== "pose") {
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
    // Work in the parent's coordinates so mirrored and scaled rigs keep correct IK.
    joint.parent.worldToLocal(scratchJointPosition);
    joint.parent.worldToLocal(scratchEffectorPosition);
    scratchToTarget.copy(target);
    joint.parent.worldToLocal(scratchToTarget);
    scratchToEffector.subVectors(scratchEffectorPosition, scratchJointPosition);
    scratchToTarget.sub(scratchJointPosition);
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
    handles.forEach(handle => { scene.remove(handle); disposeObject(handle); });
    handles.length = 0;
    const specs = actorRecords.get(selectedId)?.kind === 'animal' ? ANIMAL_HANDLE_SPECS : RAGDOLL_HANDLE_SPECS;
    const handleMaterialByColor = new Map();
    for (const spec of specs) {
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
    if (!pointerFromEvent(event)) return;
    emptyPress = null;
    if (mannequin && activeTool !== "pose") {
      transformHelper.updateMatrixWorld(true);
      transform.pointerHover(pointer);
      if (transform.axis) {
        event.preventDefault();
        event.stopImmediatePropagation();
        controls.enabled = false;
        gizmoDrag = {
          pointerId: event.pointerId,
          before: captureSnapshot(),
          basis: captureTransformBasis(mannequin, transformPivot),
        };
        transform.pointerDown({ x: pointer.x, y: pointer.y, button: 0 });
        renderer.domElement.setPointerCapture(event.pointerId);
        return;
      }
    }
    const handle = pickedHandle(event);
    if (!handle) {
      const hit = raycaster.intersectObjects(actors.map(({ model }) => model), true)[0]?.object;
      if (hit) {
        let root = hit;
        while (root.parent && root.parent !== scene) root = root.parent;
        const actor = actors.find(({ model }) => model === root);
        if (actor && actor.id !== selectedId) {
          selectActor(actor.id);
          setHint(`${actor.label} selected · choose Pose, Move, Rotate or Scale`);
        }
      } else {
        emptyPress = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      }
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
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
    if (modelLoading || poseCaptureInFlight) return;
    if (emptyPress && Math.hypot(event.clientX - emptyPress.x, event.clientY - emptyPress.y) > 5) emptyPress = null;
    if (gizmoDrag) {
      if (event.pointerId !== gizmoDrag.pointerId || !pointerFromEvent(event)) return;
      event.stopImmediatePropagation();
      transform.pointerMove({ x: pointer.x, y: pointer.y, button: -1 });
      applyPivotTransform(mannequin, transformPivot, gizmoDrag.basis, activeTool, transform.axis ?? "XYZ");
      return;
    }
    if (mannequin && activeTool !== "pose" && pointerFromEvent(event)) {
      transform.pointerHover(pointer);
      renderer.domElement.style.cursor = transform.axis ? "grab" : "default";
      return;
    }
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
    event.stopImmediatePropagation();
    if (!raycaster.ray.intersectPlane(dragPlane, dragPoint)) return;
    dragPoint.add(dragOffset);
    drag.handle.position.copy(dragPoint);
    solveChainToTarget(drag.handle.userData.spec, dragPoint);
    updateHandlePositions();
  }

  function finishDrag(event) {
    if (gizmoDrag) {
      if (event?.pointerId !== undefined && event.pointerId !== gizmoDrag.pointerId) return;
      const completed = gizmoDrag;
      gizmoDrag = null;
      transform.pointerUp({ button: 0 });
      if (renderer.domElement.hasPointerCapture(completed.pointerId)) renderer.domElement.releasePointerCapture(completed.pointerId);
      controls.enabled = true;
      pushHistory(completed.before);
      syncTransformTool();
      setHint("Transform applied · drag again to refine · Undo to restore");
      return;
    }
    if (emptyPress && event?.type === "pointerup" && event.pointerId === emptyPress.pointerId) {
      emptyPress = null;
      selectActor(null);
      setHint("Click a character to select it · Drag empty space to orbit");
      return;
    }
    if (event?.type === "pointercancel") emptyPress = null;
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
    setHint("Drag a joint handle · Drag empty space to orbit · Scroll to zoom");
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

  function renderPresetLibrary(actor) {
    const animal = actor?.kind === 'animal';
    const library = animal ? ANIMAL_PRESETS : POSE_LIBRARY;
    const category = container.querySelector('#pose-preset-category');
    category.replaceChildren(...(animal ? ['All','Animals'] : ['All','Standing','Gesture','Action','Seated','Floor']).map(value => new Option(value,value)));
    presetGrid.innerHTML = library.map(p => `<button type="button" data-pose-preset="${p.key}" data-category="${p.category}" title="${p.label}"><span class="pose-preset-diagram">${animal ? animalIcon(actor.modelKey) : presetPreview(p)}</span>${p.label}</button>`).join('');
    presetButtons = Array.from(presetGrid.querySelectorAll('[data-pose-preset]'));
  }

  function resetPose() {
    if (!neutralSnapshot) return;
    const before = captureSnapshot();
    restoreNeutralPose();
    updateHandlePositions();
    syncTransformTool();
    pushHistory(before);
    clearActivePreset();
    setHint("Neutral pose restored · drag a handle to refine it");
  }

  function applyPreset(name) {
    const actor = actorRecords.get(selectedId);
    const animal = actor?.kind === 'animal';
    const preset = (animal ? ANIMAL_PRESETS : POSE_LIBRARY).find((candidate) => candidate.key === name);
    if (!neutralSnapshot || !preset) return;
    const before = captureSnapshot();
    const facing = mannequin.quaternion.clone();
    const mirrored = Boolean(actor.mirrored);
    setActorMirrored(actor, false);
    mannequin.quaternion.fromArray(neutralSnapshot.quaternion);
    restoreNeutralPose();
    if (animal) applyAnimalPreset(bonesByName, name);
    for (const binding of presetBindings) {
      applyPresetDirection(
        binding,
        ANYPOSES_REFERENCE_DIRECTIONS[binding.key],
        preset.directions[binding.key]
      );
    }
    placePresetOnGround();
    setActorMirrored(actor, mirrored);
    mannequin.quaternion.copy(facing);
    mannequin.updateMatrixWorld(true);
    updateHandlePositions();
    syncTransformTool();
    pushHistory(before);
    presetButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.posePreset === name));
    setHint(`${preset.label} · drag a handle to refine it`);
  }

  function restoreNeutralPose() {
    applyBoneTransforms(mannequinBones, neutralSnapshot.bones);
    mannequin.updateMatrixWorld(true);
  }

  function removeSelectedActor() {
    if (!mannequin || modelLoading || poseCaptureInFlight) return;
    finishDrag();
    const before = captureSnapshot();
    mannequin.visible = false;
    actors = actors.filter(({ id }) => id !== selectedId);
    selectActor(actors.at(-1)?.id ?? null);
    pushHistory(before);
    setHint(actors.length ? "Object removed · Undo to restore it" : "Choose a model and add a character to begin");
  }

  function frameScene() {
    if (!actors.length) return;
    const bounds = new THREE.Box3();
    const point = new THREE.Vector3();
    for (const actor of actors) {
      actor.model.updateMatrixWorld(true);
      actor.bones.forEach((bone) => bounds.expandByPoint(bone.getWorldPosition(point)));
      if (actor.kind === 'prop' || actor.kind === 'animal') bounds.union(new THREE.Box3().setFromObject(actor.model));
    }
    if (bounds.isEmpty()) return;
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const distance = Math.max(7, size.y / (2 * tangent), size.x / (2 * tangent * camera.aspect)) * 1.35 + size.z / 2;
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

  function changeBackground(color) {
    scene.background.set(color);
    scene.fog.color.set(color);
    groundMaterial.color.set(color);
    if (backgroundColor) backgroundColor.value = color;
  }

  function registerProp(kind, model = createProp(kind)) {
    const id = String(nextActorId++);
    const actor = { id, kind: 'prop', modelKey: kind, label: `${PROP_CATALOG[kind]} · ${id}`, model, bones: [], color: '#8997a8' };
    model.position.fromArray(nextActorPosition(actors));
    scene.add(model);
    actors.push(actor); actorRecords.set(id, actor);
    selectActor(id);
    return actor;
  }

  function addProp(kind) {
    if (modelLoading || poseCaptureInFlight || actors.length >= 30) return;
    finishDrag();
    const before = captureSnapshot();
    registerProp(kind);
    frameScene(); syncTransformTool();
    pushHistory(before);
    setHint(`${PROP_CATALOG[kind]} added · use Move, Rotate or Scale to place it`);
  }

  async function shareScene() {
    if (modelLoading || poseCaptureInFlight || !actors.length) return;
    finishDrag();
    shareButton.disabled = true;
    try {
      const saved = { ...captureSnapshot(), version: 1, aspect: sceneAspect,
        camera: { position: camera.position.toArray(), target: controls.target.toArray() } };
      const encoded = await encodeSharedScene(saved);
      if (destroyed) return;
      const url = new URL(window.location.href);
      url.search = '?model=pose-to-image';
      url.hash = `pose=${encoded}`;
      shareField.hidden = false;
      shareField.value = url.href;
      try {
        await navigator.clipboard.writeText(url.href);
        setHint('Link copied · anyone with it can open and edit this scene');
      } catch {
        shareField.focus(); shareField.select();
        setHint('Your scene link is ready · copy the selected link');
      }
    } catch {
      setHint('Unable to create a link · try a smaller scene or a current browser');
    } finally { if (!destroyed) updateSceneButtons(); }
  }

  function mirrorPose() {
    if (!mannequin || actorRecords.get(selectedId)?.kind === 'prop' || modelLoading || poseCaptureInFlight) return;
    finishDrag();
    const before = captureSnapshot();
    const actor = actorRecords.get(selectedId);
    setActorMirrored(actor, !actor.mirrored);
    updateHandlePositions();
    syncTransformTool();
    pushHistory(before);
    setHint('Pose mirrored · Undo to restore');
  }

  function setCameraView(view) {
    if (poseCaptureInFlight || modelLoading) return;
    frameScene();
    const distance = camera.position.distanceTo(controls.target);
    const directions = { front:[0,0,1], back:[0,0,-1], left:[-1,0,0], right:[1,0,0], high:[0,1,1], three:[1,.25,1] };
    camera.position.copy(controls.target).add(new THREE.Vector3(...(directions[view] ?? directions.front)).normalize().multiplyScalar(distance));
    camera.lookAt(controls.target);
    controls.update();
    setHint('Camera view updated · drag empty space to fine-tune');
  }

  async function useCurrentPose(mode = 'use') {
    if (!actors.length || poseCaptureInFlight || modelLoading) return;
    finishDrag();
    poseCaptureInFlight = true;
    controls.enabled = false;
    updateSceneButtons();
    usePoseButton.textContent = "Capturing pose…";
    const handleVisibility = handles.map((handle) => handle.visible);
    const gridVisible = grid.visible;
    const gizmoVisible = transformHelper.visible;
    const originalSize = renderer.getSize(new THREE.Vector2());
    const pixelRatio = renderer.getPixelRatio();
    try {
      const capture = capturePoseReference({
        canvas: renderer.domElement,
        beforeCapture() {
          handles.forEach((handle) => { handle.visible = false; });
          grid.visible = false;
          transformHelper.visible = false;
          renderer.setPixelRatio(1);
          renderer.setSize(Math.round(1600 * Math.min(1, camera.aspect)), Math.round(1600 / Math.max(1, camera.aspect)), false);
          renderer.render(scene, camera);
        },
        afterCapture() {
          handles.forEach((handle, index) => { handle.visible = handleVisibility[index]; });
          grid.visible = gridVisible;
          transformHelper.visible = gizmoVisible;
          renderer.setPixelRatio(pixelRatio);
          renderer.setSize(originalSize.x, originalSize.y, false);
          renderer.render(scene, camera);
        },
      });
      if (mode === 'copy' && navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': capture.then(file => new Blob([file], { type:'image/png' })) })]);
        setHint('Image copied · paste it into your image tool');
      } else {
        const file = await capture;
        if (destroyed) return;
        if (mode === 'download' || mode === 'copy') {
          const url = URL.createObjectURL(file);
          const link = document.createElement('a');
          link.href = url; link.download = 'seedance-pose-reference.png';
          document.body.append(link); link.click(); link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          setHint(mode === 'copy' ? 'Clipboard unavailable · PNG downloaded instead' : 'PNG downloaded · ready to use anywhere');
        } else {
          await onUsePose?.(file);
          setHint("Pose reference captured · continue in the image workspace");
        }
      }
    } catch {
      if (!destroyed) setHint(mode === 'copy' ? 'Copy unavailable · use Download PNG instead' : "The pose could not be captured · please try again");
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

  listen(renderer.domElement, "pointerdown", onPointerDown, true);
  listen(renderer.domElement, "pointermove", onPointerMove, true);
  listen(renderer.domElement, "pointerup", finishDrag);
  listen(renderer.domElement, "pointercancel", finishDrag);
  listen(renderer.domElement, "lostpointercapture", finishDrag);
  listen(undoButton, "click", undo);
  listen(redoButton, "click", redo);
  listen(resetButton, "click", resetPose);
  listen(usePoseButton, "click", () => useCurrentPose());
  listen(downloadButton, 'click', () => useCurrentPose('download'));
  listen(copyButton, 'click', () => useCurrentPose('copy'));
  listen(mirrorButton, 'click', mirrorPose);
  listen(shareButton, 'click', shareScene);
  listen(objectSelect, 'change', () => selectActor(objectSelect.value));
  propButtons.forEach(button => listen(button, 'click', () => addProp(button.dataset.poseProp)));
  listen(bodyColor, 'change', () => {
    if (!mannequin || poseCaptureInFlight) return;
    const before = captureSnapshot();
    setActorColor(actorRecords.get(selectedId), bodyColor.value);
    pushHistory(before);
  });
  listen(backgroundColor, 'change', () => {
    if (poseCaptureInFlight) return;
    const before = captureSnapshot();
    changeBackground(backgroundColor.value); pushHistory(before);
  });
  container.querySelectorAll('[data-pose-palette]').forEach(button => listen(button, 'click', () => {
    if (!mannequin || poseCaptureInFlight || modelLoading) return;
    const before = captureSnapshot();
    const [figure, background] = button.dataset.posePalette.split(',');
    setActorColor(actorRecords.get(selectedId), figure);
    bodyColor.value = figure;
    changeBackground(background); pushHistory(before);
  }));
  listen(container.querySelector('#pose-preset-category'), 'change', event => {
    presetButtons.forEach(button => { button.hidden = event.target.value !== 'All' && button.dataset.category !== event.target.value; });
  });
  container.querySelectorAll('[data-pose-view]').forEach(button => listen(button, 'click', () => setCameraView(button.dataset.poseView)));
  listen(addButton, "click", () => addMannequin(selectedModel));
  listen(removeButton, "click", removeSelectedActor);
  modelButtons.forEach((button) => listen(button, "click", () => {
    selectedModel = button.dataset.poseModel;
    modelButtons.forEach((candidate) => {
      const active = candidate.dataset.poseModel === selectedModel;
      candidate.classList.toggle("is-active", active);
      candidate.setAttribute("aria-pressed", String(active));
    });
  }));
  toolButtons.forEach((button) => listen(button, "click", () => selectTool(button.dataset.poseTool)));
  listen(presetGrid, 'click', event => {
    const button = event.target.closest('[data-pose-preset]');
    if (button && !button.disabled) applyPreset(button.dataset.posePreset);
  });

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
    if (controls.enabled) controls.update();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(animate);
  }

  function prepareMannequin(object, modelKey) {
    const animal = Object.hasOwn(ANIMAL_CATALOG, modelKey);
    mannequin = normalizeMannequin(object, animal ? ANIMAL_CATALOG[modelKey].height : 7.25);
    bonesByName = new Map();
    mannequinBones = [];
    presetBindings = [];
    const boneIndex = buildPreferredBoneIndex(mannequin);
    for (const [name, bone] of boneIndex.byName) bonesByName.set(name, bone);
    mannequinBones.push(...boneIndex.bones);
    if (!animal) preparePresetBindings();

    mannequin.traverse((objectPart) => {
      if (!objectPart.isMesh) return;
      objectPart.castShadow = true;
      objectPart.receiveShadow = true;
      const originalMaterials = Array.isArray(objectPart.material) ? objectPart.material : [objectPart.material];
      const polishedMaterials = originalMaterials.map((material) => {
        const next = material;
        if (!next.userData.fixedColor) next.color?.lerp?.(new THREE.Color(0xe2ded2), 0.38);
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
      id, modelKey, kind: animal ? 'animal' : 'mannequin', label: `${MODEL_CATALOG[modelKey].label} · ${id}`,
      model: mannequin, bones: mannequinBones, byName: bonesByName,
      bindings: presetBindings, neutral: neutralSnapshot,
    };
    setActorColor(actor, '#d9d9d9');
    const [x, , z] = nextActorPosition(actors);
    mannequin.position.x += x;
    mannequin.position.z += z;
    actors.push(actor);
    actorRecords.set(id, actor);
    selectActor(id);
    frameScene();
  }

  presetButtons.forEach((button) => { button.disabled = true; });
  resetButton.disabled = true;
  usePoseButton.disabled = true;
  updateHistoryButtons();
  resize();
  animate();

  const loader = new FBXLoader();
  const modelCache = createModelCache(key => Object.hasOwn(ANIMAL_CATALOG,key) ? createAnimal(key) : loader.loadAsync(MODEL_CATALOG[key].url));
  async function addMannequin(modelKey, initial = false) {
    if (modelLoading || poseCaptureInFlight || actors.length >= 30 || !MODEL_CATALOG[modelKey]) return;
    finishDrag();
    modelLoading = true;
    updateSceneButtons();
    if (loading) loading.hidden = actors.length > 0;
    const loadingTimer = setTimeout(() => {
      if (loading && !destroyed) {
        loading.hidden = false;
        loading.innerHTML = "<span></span> Loading character…";
      }
    }, 180);
    try {
      const object = await modelCache.get(modelKey);
      if (destroyed) {
        disposeObject(object);
        return;
      }
      const before = captureSnapshot();
      prepareMannequin(object, modelKey);
      if (!initial) pushHistory(before);
      setHint("Select a character · Drag its handles to pose · Drag empty space to orbit");
    } catch {
      if (!destroyed) setHint("This character could not be loaded · click Add character to retry");
    } finally {
      clearTimeout(loadingTimer);
      modelLoading = false;
      if (!destroyed) {
        if (loading) loading.hidden = true;
        updateSceneButtons();
      }
    }
  }
  async function initializeScene() {
    const encoded = new URLSearchParams(window.location.hash.slice(1)).get('pose');
    if (!encoded) { await addMannequin(selectedModel, true); return; }
    modelLoading = true;
    updateSceneButtons();
    const objects = [];
    try {
      const saved = await decodeSharedScene(encoded);
      // Load everything before replacing the scene; a broken link must not leave a partial scene.
      for (const actor of saved.actors) {
        const object = actor.kind === 'prop' ? createProp(actor.modelKey) : await modelCache.get(actor.modelKey);
        objects.push(object);
      }
      if (destroyed) { objects.forEach(disposeObject); return; }
      const idMap = new Map();
      saved.actors.forEach((actor, index) => {
        if (actor.kind === 'prop') registerProp(actor.modelKey, objects[index]);
        else prepareMannequin(objects[index], actor.modelKey);
        idMap.set(actor.id, selectedId);
      });
      applySnapshot({ ...saved, selectedId: idMap.get(saved.selectedId), actors: saved.actors.map(actor => ({ ...actor, id: idMap.get(actor.id) })) });
      sceneAspect = saved.aspect;
      canvasHost.style.aspectRatio = saved.aspect;
      canvasHost.classList.toggle('pose-fixed-aspect', saved.aspect !== 'auto');
      resize();
      controls.target.fromArray(saved.camera.target);
      camera.position.fromArray(saved.camera.position);
      const distance = camera.position.distanceTo(controls.target);
      controls.maxDistance = Math.max(36, distance * 2);
      camera.far = Math.max(80, distance * 4);
      scene.fog.near = distance + 12; scene.fog.far = distance + 35;
      camera.updateProjectionMatrix();
      camera.lookAt(controls.target); controls.update();
      setHint('Shared scene opened · select any object to keep editing');
    } catch {
      objects.filter(object => !object.parent).forEach(disposeObject);
      modelLoading = false;
      await addMannequin(selectedModel, true);
      setHint('This share link could not be opened · a fresh scene is ready');
    } finally {
      modelLoading = false;
      if (!destroyed) { if (loading) loading.hidden = true; updateSceneButtons(); }
    }
  }
  initializeScene();

  return () => {
    if (destroyed) return;
    destroyed = true;
    modelCache.dispose();
    cancelAnimationFrame(frameId);
    while (cleanups.length) cleanups.pop()();
    controls.dispose();
    transform.dispose();
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
