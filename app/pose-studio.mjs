import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import mannequinUrl from "./pose-assets/anyposes-female-rig.fbx?url";
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
  const cleanups = [];
  const undoStack = [];
  const redoStack = [];
  const handles = [];
  const bonesByName = new Map();
  const presetBindings = [];
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
    undoButton.disabled = undoStack.length === 0;
    redoButton.disabled = redoStack.length === 0;
  }

  function captureSnapshot() {
    return mannequin ? cloneSnapshot(mannequin, mannequinBones) : null;
  }

  function applySnapshot(snapshot) {
  if (!mannequin || !snapshot) return;
  mannequin.position.fromArray(snapshot.position);
  mannequin.quaternion.fromArray(snapshot.quaternion);
  applyBoneTransforms(mannequinBones, snapshot.bones);
  mannequin.updateMatrixWorld(true);
    updateHandlePositions();
  }

  function pushHistory(snapshot) {
    const current = captureSnapshot();
    if (!snapshot || !current || snapshotSignature(snapshot) === snapshotSignature(current)) return;
    undoStack.push(snapshot);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
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
    if (!mannequin) return;
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
    const hit = raycaster.intersectObjects(handles, true)[0]?.object;
    if (!hit) return null;
    return hit.parent?.userData?.spec ? hit.parent : hit;
  }

  function onPointerDown(event) {
    if (event.button !== 0 || !mannequin) return;
    const handle = pickedHandle(event);
    if (!handle) return;
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
    applySnapshot(neutralSnapshot);
    pushHistory(before);
    clearActivePreset();
    setHint("Neutral pose restored · drag a handle to refine it");
  }

  function applyPreset(name) {
    const preset = ANYPOSES_PRESETS.find((candidate) => candidate.key === name);
    if (!neutralSnapshot || !preset) return;
    const before = captureSnapshot();
    applySnapshot(neutralSnapshot);
    for (const binding of presetBindings) {
      applyPresetDirection(
        binding,
        ANYPOSES_REFERENCE_DIRECTIONS[binding.key],
        preset.directions[binding.key]
      );
    }
    placePresetOnGround();
    mannequin.updateMatrixWorld(true);
    updateHandlePositions();
    pushHistory(before);
    presetButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.posePreset === name));
    setHint(`${preset.label} · Anyposes preset ${preset.sourceCode} · drag a handle to refine it`);
  }

  async function useCurrentPose() {
    if (!mannequin || poseCaptureInFlight) return;
    poseCaptureInFlight = true;
    usePoseButton.disabled = true;
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
        usePoseButton.disabled = false;
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
  listen(undoButton, "click", undo);
  listen(redoButton, "click", redo);
  listen(resetButton, "click", resetPose);
  listen(usePoseButton, "click", useCurrentPose);
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

  function prepareMannequin(object) {
    mannequin = object;
    const bounds = new THREE.Box3().setFromObject(mannequin);
    const originalHeight = Math.max(1, bounds.getSize(new THREE.Vector3()).y);
    mannequin.scale.setScalar(7.25 / originalHeight);
    mannequin.updateMatrixWorld(true);
    const normalizedBounds = new THREE.Box3().setFromObject(mannequin);
    const center = normalizedBounds.getCenter(new THREE.Vector3());
    mannequin.position.x -= center.x;
    mannequin.position.y -= normalizedBounds.min.y;
    mannequin.position.z -= center.z;

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
    neutralSnapshot = captureSnapshot();
    createHandles();

    const framedBounds = new THREE.Box3();
    const bonePosition = new THREE.Vector3();
    mannequinBones.forEach((bone) => framedBounds.expandByPoint(bone.getWorldPosition(bonePosition)));
    const framedCenter = framedBounds.getCenter(new THREE.Vector3());
    const framedSize = framedBounds.getSize(new THREE.Vector3());
    const cameraDistance = Math.max(20, framedSize.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.62);
    controls.target.copy(framedCenter).add(new THREE.Vector3(0, -0.12, 0));
    camera.position.set(framedCenter.x, framedCenter.y + 0.15, framedCenter.z + cameraDistance);
    camera.lookAt(controls.target);
    controls.update();

    if (loading) loading.hidden = true;
    presetButtons.forEach((button) => { button.disabled = false; });
    resetButton.disabled = false;
    usePoseButton.disabled = false;
    setHint("Drag any of the 13 handles · Drag empty space to orbit · Scroll to zoom");
  }

  presetButtons.forEach((button) => { button.disabled = true; });
  resetButton.disabled = true;
  usePoseButton.disabled = true;
  updateHistoryButtons();
  resize();
  animate();

  const loader = new FBXLoader();
  loader.load(
    mannequinUrl,
    (object) => {
      if (destroyed) {
        disposeObject(object);
        return;
      }
      prepareMannequin(object);
    },
    undefined,
    () => {
      if (destroyed || !loading) return;
      loading.innerHTML = "<span></span> The Anyposes mannequin could not be loaded.";
      setHint("Refresh the page to try loading the mannequin again");
    }
  );

  return () => {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frameId);
    while (cleanups.length) cleanups.pop()();
    controls.dispose();
    renderer.dispose();
    handles.forEach((handle) => disposeObject(handle));
    disposeObject(mannequin);
    ground.geometry.dispose();
    groundMaterial.dispose();
    delete canvasHost.dataset.ragdollHandleCount;
    renderer.domElement.remove();
  };
}
