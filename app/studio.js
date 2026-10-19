import { t, localizedErrorMessage, currentLocale } from './i18n.mjs';
import { formatCreditResetTime } from './daily-credits.mjs';
import { guestVideoDurationState } from './guest-video.mjs';
import { guestImageQuantityState } from './guest-image.mjs';
import { renderGuestTrialNotice } from './guest-trial-notice.mjs';
import { localizedPath } from './site-locale.mjs';
import { buildModelUrl, normalizeModelId } from "./model-routing.mjs";
import { canonicalModelPath, modelIdFromPath } from "./seo-routes.mjs";
import { requestImageGeneration } from "./image-generation.mjs";
import { createGenerationPreviewController } from "./generation-preview.mjs";
import { getImageModel } from './image-models.mjs';
import { prepareImageForVideo, loadVideoReference } from "./image-to-video.mjs";
import { validateImageReferences } from "./image-references.mjs";
import { pollVideoGenerationTask, requestVideoGeneration } from "./video-generation.mjs";
import { videoReferenceFrameSize } from './video-reference-frame.mjs';
import { readVideoHandoff } from './studio-handoff.mjs';
import { buildPoseReferencePrompt } from "./pose-transfer.mjs";
import { createPoseResultActionsController } from "./pose-result-actions.mjs";
import {
  applyPromptStructure,
  createCreditSummaryController,
  createExampleCarouselController,
  creditCostForDuration,
  creditCostForQuantity,
  examplePromptAt,
  normalizeImageQuantity,
  sizeForAspectRatio
} from "./studio-controls.mjs";

const studioModels = {
  "seedance-2-5": {
    category: "AI VIDEO / TEXT-TO-VIDEO",
    name: "SEEDANCE 2.5",
    status: "Text-to-video",
    symbol: "S2",
    tone: "lime",
    exampleTitle: "Cinematic story scene",
    examplePrompt: "A clear subject, one action, camera movement, lighting, and a clean final shot.",
    type: "video",
    canGenerate: true
  },
  "minimax-h3": {
    category: "AI VIDEO / TEXT-TO-VIDEO",
    name: "MiniMax H3",
    status: "Text-to-video",
    symbol: "H3",
    tone: "cyan",
    exampleTitle: "Cinematic product reveal",
    examplePrompt: "A slow orbital camera, controlled reflections, native room tone, and a clean final composition.",
    type: "video",
    canGenerate: true
  },
  "seedance-3": {
    category: "AI VIDEO / RELEASE TRACKER",
    name: "SEEDANCE 3.0",
    status: "Coming Soon",
    symbol: "S3",
    tone: "lime",
    exampleTitle: "Reference-led story scene",
    examplePrompt: "Plan character identity, camera movement, pacing, and sound as distinct reference roles.",
    type: "video"
  },
  "pose-to-image": {
    category: "AI IMAGE / POSE CONTROL",
    name: "Pose Studio",
    status: "",
    symbol: "P3",
    tone: "lime",
    exampleTitle: "Pose-first character image",
    examplePrompt: "Shape the body language and camera angle first, then describe the character, scene, lighting, and visual style.",
    type: "pose"
  },
  "nano-banana-2-lite": {
    category: "AI IMAGE / FAST DRAFTS",
    name: "Nano Banana 2 Lite",
    status: "Coming Soon",
    symbol: "NB",
    tone: "violet",
    exampleTitle: "Fast campaign variants",
    examplePrompt: "Lock composition and product identity, then vary one background, palette, or crop at a time.",
    type: "image"
  },
  "gpt-image-2-5-1k": {
    category: 'AI IMAGE / GENERATE & EDIT',
    name: 'GPT Image 2.5',
    status: 'Image generator',
    symbol: 'G2.5',
    tone: 'orange',
    exampleTitle: 'Create with GPT Image 2.5',
    examplePrompt: 'Describe the subject, composition and lighting, or add reference images to guide your edit.',
    type: 'image',
    canGenerate: true
  },
  "gpt-image-2": {
    category: "AI IMAGE / GENERATE & EDIT",
    name: "GPT Image 2",
    status: "Image generator",
    symbol: "G2",
    tone: "orange",
    exampleTitle: "Brand-ready layout",
    examplePrompt: "Specify format, hierarchy, exact copy, safe areas, and the visual elements that must remain unchanged.",
    type: "image",
    canGenerate: true
  }
};

const defaultImageGenerationLabel = "Generate image · 5 credits";
const activeVideoTaskStorageKey = "seedance:minimax-h3:active-task";

export function clipboardReferenceImages(clipboardData) {
  const itemFiles = Array.from(clipboardData?.items || [])
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean);
  // Some browsers provide only files; using both lists would duplicate images.
  return itemFiles.length ? itemFiles : Array.from(clipboardData?.files || [])
    .filter((file) => file.type.startsWith("image/"));
}

export function handleReferenceImagePaste(event, addImages) {
  if (event.defaultPrevented) return false;
  const files = clipboardReferenceImages(event.clipboardData);
  if (!files.length || !addImages(files)) return false;
  event.preventDefault();
  return true;
}

export function initializeStudio() {
  const cleanups = [];
  let destroyed = false;
  let imageTransferInFlight = false;
  const imageAnimateButtons = new Set();
  const imageTransferAbortController = new AbortController();

  function listen(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    cleanups.push(() => target.removeEventListener(type, listener, options));
  }

  const modelButtons = document.querySelectorAll(".model-button[data-model]");
  const enabledModelButtons = Array.from(modelButtons).filter((button) => !button.disabled);
  const availableModelIds = new Set(enabledModelButtons.map((button) => button.dataset.model));
  const routeModelId = modelIdFromPath(window.location.pathname);
  if (routeModelId && studioModels[routeModelId]?.canGenerate) availableModelIds.add(routeModelId);
  const modelName = document.getElementById("model-name");
  const modelCategory = document.getElementById("model-category");
  const modelStatus = document.getElementById("model-status");
  const selectedName = document.getElementById("selected-name");
  const selectedSymbol = document.getElementById("selected-symbol");
  const exampleTitle = document.getElementById("example-title");
  const examplePrompt = document.getElementById("example-prompt");
  const uploadBox = document.getElementById("upload-box");
  const uploadGroup = document.getElementById("upload-group");
  const referenceLabel = document.getElementById("reference-label");
  const referenceMeta = document.getElementById("reference-meta");
  const uploadTitle = document.getElementById("upload-title");
  const uploadHint = document.getElementById("upload-hint");
  const referenceInput = document.getElementById("reference-input");
  const referencePreview = document.getElementById("reference-preview");
  const referencePreviewImage = document.getElementById("reference-preview-image");
  const referenceFileName = document.getElementById("reference-file-name");
  const referenceClear = document.getElementById("reference-clear");
  const modeGroup = document.getElementById("mode-group");
  const videoSettings = document.getElementById("video-settings");
  const imageSettings = document.getElementById("image-settings");
  const generateButton = document.getElementById("generate-button");
  const generateButtonLabel = document.getElementById("generate-button-label");
  const generationStatus = document.getElementById("generation-status");
  const dailyCreditResetNotice = document.getElementById("daily-credit-reset-notice");
  const generationOutput = document.getElementById("generation-output");
  const previewPlaceholder = document.getElementById("preview-placeholder");
  const exampleCarousel = document.getElementById("example-carousel");
  const hasDedicatedImageExamples = Boolean(document.getElementById("gpt-image-examples"));
  const imageExamples = document.getElementById("gpt-image-examples");
  const imageExamplesModel = imageExamples?.closest('[data-preview-model]')?.dataset.previewModel || 'gpt-image-2';
  const poseReferenceCard = document.getElementById("pose-reference-card");
  const poseScenePreview = document.getElementById("pose-scene-preview");
  const exampleCarouselSlides = document.querySelectorAll(".example-carousel-slide");
  const exampleCarouselDots = document.querySelectorAll("[data-carousel-dot]");
  const exampleCarouselPrevious = document.getElementById("example-carousel-previous");
  const exampleCarouselNext = document.getElementById("example-carousel-next");
  const prompt = document.getElementById("studio-prompt");
  const promptCount = document.getElementById("prompt-count");
  const promptStructureButton = document.getElementById("prompt-structure-button");
  const examplePromptButton = document.getElementById("example-prompt-button");
  const promptTools = promptStructureButton.parentElement;
  const videoDuration = document.getElementById("video-duration");
  const videoResolution = document.getElementById("video-resolution");
  const videoAspectRatio = document.getElementById("video-aspect-ratio");
  const videoReferenceGroup = document.getElementById("video-reference-group");
  const videoReferenceInput = document.getElementById("video-reference-input");
  const videoReferenceAdd = document.getElementById("video-reference-add");
  const videoReferenceGrid = document.getElementById("video-reference-grid");
  const videoReferenceCount = document.getElementById("video-reference-count");
  const videoModeButtons = document.querySelectorAll("[data-video-mode]");
  let videoMode = "text";
  let videoReferences = [];
  const imageQuantity = document.getElementById("image-quantity");
  const imageQuality = document.getElementById("image-quality");
  const imageAspectRatio = document.getElementById("image-aspect-ratio");
  const creditSummary = document.getElementById("credit-summary");
  const generationCreditCost = document.getElementById("generation-credit-cost");
  const currentCreditBalance = document.getElementById("current-credit-balance");
  const creditBalanceLabel = document.getElementById('credit-balance-label');
  const launchNotice = document.getElementById("launch-notice");
  const poseResultActions = document.getElementById("pose-result-actions");
  const editPoseButton = document.getElementById("edit-pose-button");
  const generateAgainButton = document.getElementById("generate-again-button");
  const sidebar = document.getElementById("studio-sidebar");
  const sidebarOpen = document.querySelector(".sidebar-open");
  const sidebarClose = document.querySelector(".sidebar-close");
  const studioShell = document.querySelector(".studio-shell");
  const poseSidebarToggle = document.querySelector(".pose-sidebar-toggle");
  let poseSidebarCollapsed = false;

  function updatePoseSidebar() {
    const poseMode = activeModelId === "pose-to-image";
    studioShell.classList.toggle("is-pose-mode", poseMode);
    studioShell.classList.toggle("is-sidebar-collapsed", poseMode && poseSidebarCollapsed);
    const label = poseSidebarCollapsed ? t("Expand menu") : t("Collapse menu");
    poseSidebarToggle.setAttribute("aria-expanded", String(!poseSidebarCollapsed));
    poseSidebarToggle.title = label;
    poseSidebarToggle.replaceChildren(document.createTextNode(poseSidebarCollapsed ? "› " : "‹ "), Object.assign(document.createElement("span"), { textContent: label }));
  }
  const creationGrid = document.getElementById("creation-grid");
  const poseStudio = document.getElementById("pose-studio");

  let activeModelId = "gpt-image-2";
  let imageReferences = [];
  let poseReferenceActive = false;
  let imageGenerationInFlight = false;
  let videoPolling = false;
  let videoAbortController = null;
  let activeVideoTaskId = readActiveVideoTask();
  let activeVideoModelId = readActiveVideoModel();
  let videoPreviewJob = null;
  const retryDrafts = new WeakMap();
  const jobStatuses = new Map();
  let exampleIndex = 0;
  let creditInsufficient = false;
  let guestVideo = studioShell.dataset.authenticated !== 'true';
  let guestRemaining = null;
  let creditSummaryController;
  let poseStudioCleanup;
  let poseStudioPromise;
  let poseResultActionsController;
  const previewController = createGenerationPreviewController({
    root: generationOutput,
    onRevealModel: modelId => selectModel(modelId, { syncUrl: true }),
    onChange: ({ phase, job }) => {
      poseResultActionsController?.setVisible(phase === 'succeeded' && Boolean(job?.isPose));
      if (phase === 'failed') renderExhaustedNotice(document.getElementById('preview-error-message'), job?.message);
      updateImageContext();
    },
    onRetry: (job, { resume }) => {
      if (destroyed) return;
      selectModel(job.modelId, { syncUrl: true });
      if (resume) {
        void resumeStoredVideoTask();
        return;
      }
      const draft = retryDrafts.get(job);
      if (!draft || imageGenerationInFlight && draft.kind === 'image' || videoPolling && draft.kind === 'video') return;
      restoreGenerationDraft(draft);
      creditSummaryController?.refresh();
      updateGenerateButton();
      generateButton.click();
    },
  });

  function captureGenerationDraft(kind) {
    return {
      kind, modelId: activeModelId, prompt: prompt.value,
      quantity: normalizeImageQuantity(imageQuantity.value), resolution: imageQuality.value,
      aspectRatio: kind === 'video' ? videoAspectRatio.value : imageAspectRatio.value,
      duration: creditCostForDuration(videoDuration.value), videoResolution: videoResolution.value || '480p',
      videoMode, isPose: kind === 'image' && poseReferenceActive,
      references: kind === 'video' ? (isReferenceVideo() ? videoReferences.map(item => ({ file: item.file })) : [])
        : imageReferences.map(item => ({ file: item.file, source: item.source })),
    };
  }

  function restoreGenerationDraft(draft) {
    prompt.value = draft.prompt;
    promptCount.textContent = String(draft.prompt.length);
    if (draft.kind === 'image') {
      imageReferences.forEach(item => URL.revokeObjectURL(item.url));
      imageReferences = draft.references.map(item => ({ ...item, url: URL.createObjectURL(item.file) }));
      imageQuantity.value = String(draft.quantity);
      imageQuality.value = draft.resolution;
      imageAspectRatio.value = draft.aspectRatio;
      renderImageReferences();
    } else {
      videoReferences.forEach(item => URL.revokeObjectURL(item.url));
      videoReferences = draft.references.map(item => ({ ...item, url: URL.createObjectURL(item.file) }));
      videoDuration.value = String(draft.duration);
      videoResolution.value = draft.videoResolution;
      videoAspectRatio.value = draft.aspectRatio;
      videoMode = draft.videoMode;
      updateVideoMode();
      renderVideoReferences();
    }
    updateGenerateButtonLabel();
  }

  function setJobStatus(job, message, className = 'is-working') {
    if (destroyed) return;
    jobStatuses.set(job.modelId, { message, className });
    if (activeModelId !== job.modelId) return;
    generationStatus.textContent = message;
    generationStatus.className = `generation-status ${className}`;
    if (className === 'is-error') renderExhaustedNotice(generationStatus, message);
  }

  function renderExhaustedNotice(element, message) {
    const kind = message === t('Your free images are used up. Sign up for 15 free credits every day.') ? 'image'
      : message === t('Your free video seconds are used up. Sign up for 15 free credits every day.') ? 'video' : null;
    if (element && kind) renderGuestTrialNotice(element, kind, {
      href: window.location.href,
      onSignup: () => window.dispatchEvent(new CustomEvent('seedance:auth-required', { detail: { mode: 'register' } })),
    });
  }

  function ensurePoseStudio() {
    if (!poseStudio || poseStudioCleanup || poseStudioPromise) return poseStudioPromise;
    poseStudioPromise = import("./pose-studio.mjs")
      .then(({ initializePoseStudio }) => {
        if (destroyed) return;
        poseStudioCleanup = initializePoseStudio({
          container: poseStudio,
          canvasHost: document.getElementById("pose-canvas"),
          onUsePose: async (file) => {
            if (destroyed) return;
            selectModel("gpt-image-2", { syncUrl: true });
            setReferenceImage(file, { source: "pose" });
            setPromptValue(buildPoseReferencePrompt(prompt.value));
            generationStatus.textContent = t("Pose reference ready · describe the character, clothing, scene, and style.");
            generationStatus.className = "generation-status is-success";
            creationGrid?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      })
      .catch(() => {
        const loading = document.getElementById("pose-canvas-loading");
        if (loading) loading.textContent = t("The 3D editor could not start. Refresh and try again.");
      })
      .finally(() => {
        poseStudioPromise = undefined;
      });
    return poseStudioPromise;
  }

  function readActiveVideoTask() {
    try {
      return sessionStorage.getItem(activeVideoTaskStorageKey) || "";
    } catch {
      return "";
    }
  }

  function readActiveVideoModel() {
    try {
      const saved = sessionStorage.getItem('seedance:video:active-model');
      if (saved === 'minimax-h3' || saved === 'seedance-2-5') return saved;
    } catch { /* Storage may be unavailable. */ }
    return routeModelId === 'seedance-2-5' ? 'seedance-2-5' : 'minimax-h3';
  }

  function storeActiveVideoTask(taskId) {
    activeVideoTaskId = taskId;
    try {
      sessionStorage.setItem(activeVideoTaskStorageKey, taskId);
      sessionStorage.setItem('seedance:video:active-model', activeVideoModelId);
    } catch {
      // Polling can continue for this page lifetime when storage is unavailable.
    }
  }

  function clearActiveVideoTask() {
    activeVideoTaskId = "";
    try {
      sessionStorage.removeItem(activeVideoTaskStorageKey);
      sessionStorage.removeItem('seedance:video:active-model');
    } catch {
      // Storage may be unavailable in hardened browsers.
    }
  }

  function imageGenerationLabel() {
    const quantity = normalizeImageQuantity(imageQuantity?.value);
    if (isGuestImageSelected()) return guestRemaining === 0 ? t('Sign up to keep creating')
      : quantity === 1 ? t('Generate 1 image · free') : t('Generate {count} images · free', { count: quantity });
    if (quantity === 1) return t(defaultImageGenerationLabel);
    return t('Generate {count} images · {cost} credits', { count: quantity, cost: creditCostForQuantity(quantity, activeModelId) });
  }

  function videoGenerationLabel() {
    if (isGuestVideoSelected()) return guestRemaining === 0
      ? t('Sign up to keep creating') : t('Generate video · {seconds}s free', { seconds: videoDuration.value });
    return t('Generate video · {cost} credits', { cost: creditCostForDuration(videoDuration?.value) });
  }

  function isGuestVideoSelected() {
    return activeModelId === 'minimax-h3' && guestVideo;
  }

  function isGuestImageSelected() {
    return Boolean(getImageModel(activeModelId)) && guestVideo;
  }

  function updateGuestImageControls() {
    imageQuantity.disabled = imageGenerationInFlight;
    if (imageGenerationInFlight) return;
    const state = guestImageQuantityState({ guest: isGuestImageSelected(), remaining: guestRemaining, value: imageQuantity.value });
    for (const option of imageQuantity.options) option.disabled = state.disabled.includes(Number(option.value));
    imageQuantity.value = state.value;
  }

  function updateGuestVideoControls() {
    videoDuration.disabled = videoPolling || Boolean(activeVideoTaskId);
    if (videoDuration.disabled) return;
    const state = guestVideoDurationState({ guest: isGuestVideoSelected(), remaining: guestRemaining, value: videoDuration.value });
    for (const option of videoDuration.options) option.disabled = state.disabled.includes(Number(option.value));
    videoDuration.value = state.value;
  }

  function isVideoGenerationSelected() {
    return activeModelId === "seedance-2-5" || activeModelId === "minimax-h3";
  }

  function isCurrentGenerationPending() {
    return previewController.getState(activeModelId)?.phase === 'pending'
      || isVideoGenerationSelected() && activeModelId === activeVideoModelId && Boolean(activeVideoTaskId);
  }

  function isReferenceVideo() {
    return activeModelId === "minimax-h3" && videoMode === "reference";
  }

  function updateVideoMode() {
    const enabled = activeModelId === "minimax-h3" && videoModeButtons.length > 0;
    modeGroup.hidden = !enabled;
    if (videoReferenceGroup) videoReferenceGroup.hidden = !isReferenceVideo();
    videoModeButtons.forEach((button) => {
      const selected = button.dataset.videoMode === videoMode;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
      button.disabled = videoPolling;
    });
    const square = videoAspectRatio.querySelector('option[value="1:1"]');
    if (square) square.disabled = isReferenceVideo();
    if (isReferenceVideo() && videoAspectRatio.value === "1:1") videoAspectRatio.value = "16:9";
    if (enabled) {
      prompt.placeholder = isReferenceVideo()
        ? t("How should this image move? Describe the subject’s motion, camera movement, and what happens next…")
        : t("Describe the subject, action, setting, camera movement, lighting, and final shot…");
      modelCategory.textContent = isReferenceVideo() ? t("AI VIDEO / REFERENCE TO VIDEO") : t("AI VIDEO / TEXT TO VIDEO");
      modelStatus.textContent = isReferenceVideo() ? t("Reference to video") : t("Text to video");
    }
  }

  function renderVideoReferences() {
    if (!videoReferenceGrid) return;
    videoReferenceGrid.replaceChildren();
    videoReferenceCount.textContent = `${videoReferences.length} / 1`;
    videoReferenceAdd.disabled = videoReferences.length >= 1 || videoPolling;
    for (const [index, reference] of videoReferences.entries()) {
      const card = document.createElement("div");
      card.className = "video-reference-item";
      const image = Object.assign(document.createElement("img"), { src: reference.url, alt: t('Image {number}: {name}', { number: index + 1, name: reference.file.name }) });
      const frame = videoReferenceFrameSize(videoAspectRatio.value);
      image.style.aspectRatio = `${frame.width} / ${frame.height}`;
      const label = Object.assign(document.createElement("span"), { textContent: t('Image {number}', { number: index + 1 }) });
      const remove = Object.assign(document.createElement("button"), { type: "button", textContent: "×", disabled: videoPolling });
      remove.setAttribute("aria-label", t('Remove Image {number}', { number: index + 1 }));
      remove.onclick = () => {
        if (videoPolling) return;
        URL.revokeObjectURL(reference.url);
        videoReferences = videoReferences.filter((item) => item !== reference);
        renderVideoReferences();
        updateGenerateButton();
      };
      card.append(image, label, remove);
      videoReferenceGrid.append(card);
    }
  }

  function addVideoReferenceImages(files) {
    if (videoPolling || activeVideoTaskId || !files.length) return false;
    let message = "";
    if (files.length + videoReferences.length > 1) message = t("H3 supports only one reference image. Remove the current image before adding another.");
    else if (files.some((file) => !["image/png", "image/jpeg", "image/webp"].includes(file.type) || !file.size || file.size > 10 * 1024 * 1024)) {
      message = t("Choose PNG, JPEG or WebP images, up to 10 MB each.");
    }
    if (message) {
      generationStatus.textContent = message;
      generationStatus.className = "generation-status is-error";
      return false;
    }
    videoReferences.push(...files.map((file) => ({ file, url: URL.createObjectURL(file) })));
    generationStatus.textContent = t("Reference image ready.");
    generationStatus.className = "generation-status";
    renderVideoReferences();
    updateGenerateButton();
    return true;
  }

  function updateGenerateButtonLabel() {
    const model = studioModels[activeModelId];
    if (!model?.canGenerate) {
      generateButtonLabel.textContent = t("Generation coming soon");
    } else if (isVideoGenerationSelected()) {
      generateButtonLabel.textContent = activeVideoTaskId || videoPolling
        ? t("Video generation in progress…")
        : videoGenerationLabel();
    } else {
      generateButtonLabel.textContent = imageGenerationInFlight ? t("Generating…") : imageGenerationLabel();
    }
  }

  function modelFromLocation() {
    return modelIdFromPath(window.location.pathname) || new URLSearchParams(window.location.search).get("model");
  }

  function updateGenerateButton() {
    updateDailyResetNotice();
    const canGenerate = Boolean(studioModels[activeModelId]?.canGenerate);
    const generationBlocked = isVideoGenerationSelected()
      ? videoPolling || Boolean(activeVideoTaskId)
      : imageGenerationInFlight;
    generateButton.disabled = !canGenerate || !prompt.value.trim() || generationBlocked || creditInsufficient
      || (isReferenceVideo() && videoReferences.length === 0);
    if ((isGuestVideoSelected() || isGuestImageSelected()) && guestRemaining === 0 && !generationBlocked) generateButton.disabled = false;
    const disabled = generateButton.disabled;
    poseResultActionsController?.setGenerateState({
      disabled: disabled || !poseReferenceActive || !getImageModel(activeModelId),
      cost: creditCostForQuantity(imageQuantity.value, activeModelId),
    });
  }

  function selectModel(modelId, { syncUrl = false } = {}) {
    const normalizedModelId = normalizeModelId(modelId, availableModelIds);
    const model = studioModels[normalizedModelId];
    activeModelId = normalizedModelId;
    guestRemaining = null;
    guestVideo = studioShell.dataset.authenticated !== 'true';
    updateGuestVideoControls();
    updateGuestImageControls();
    updatePoseSidebar();
    modelButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.model === normalizedModelId));
    if (modelName.dataset.landingModel !== normalizedModelId) modelName.textContent = t(model.name);
    modelCategory.textContent = t(model.category);
    modelStatus.textContent = t(model.status);
    modelStatus.hidden = model.type === "pose";
    selectedName.textContent = t(model.name);
    selectedSymbol.textContent = model.symbol;
    selectedSymbol.className = `model-symbol ${model.tone}`;
    exampleTitle.textContent = t(model.exampleTitle);
    examplePrompt.textContent = t(model.examplePrompt);
    const videoModel = model.type === "video";
    const poseModel = model.type === "pose";
    previewController.selectModel(normalizedModelId);
    updateImageContext();
    creationGrid.hidden = poseModel;
    if (poseStudio) poseStudio.hidden = !poseModel;
    if (poseModel) void ensurePoseStudio();
    referenceLabel.textContent = model.canGenerate ? t("Reference images") : t("Reference files");
    referenceMeta.textContent = model.canGenerate ? t('Optional · up to 16 images') : videoModel ? t("Preview only") : t("Reference images");
    uploadTitle.textContent = model.canGenerate ? t("Add reference images") : t("Drop or choose reference media");
    uploadHint.textContent = model.canGenerate ? t('Up to 16 images · 10 MB each · 24 MB total') : t("Interface preview only—files are not uploaded");
    uploadBox.classList.toggle("is-enabled", Boolean(model.canGenerate) && !videoModel);
    uploadGroup.hidden = model.type === "video";
    updateVideoMode();
    promptTools.hidden = videoModel;
    videoSettings.hidden = model.type !== "video";
    imageSettings.hidden = model.type !== "image";
    const imageModel = getImageModel(normalizedModelId);
    if (imageModel) {
      const selectedAspectRatio = imageAspectRatio.value;
      imageAspectRatio.replaceChildren(...Object.keys(imageModel.sizes).map(ratio => {
        const option = document.createElement('option');
        option.value = ratio;
        option.textContent = normalizedModelId === 'gpt-image-2-5-1k'
          ? `${ratio} · ${imageModel.sizes[ratio].replace('x', '×')}` : ratio;
        return option;
      }));
      imageAspectRatio.value = Object.hasOwn(imageModel.sizes, selectedAspectRatio) ? selectedAspectRatio : '1:1';
    }
    updateGenerateButtonLabel();
    if (!isVideoGenerationSelected() || !activeVideoTaskId) {
      generationStatus.textContent = "";
      generationStatus.className = "generation-status";
    }
    const savedStatus = jobStatuses.get(normalizedModelId);
    if (savedStatus) setJobStatus({ modelId: normalizedModelId }, savedStatus.message, savedStatus.className);
    creditSummaryController?.refresh();
    void creditSummaryController?.reset();
    updateDailyResetNotice();
    updateGenerateButton();
    if (syncUrl && modelFromLocation() !== normalizedModelId) {
      history.pushState({ model: normalizedModelId }, "", buildModelUrl(window.location.href, normalizedModelId));
    }
    if (isVideoGenerationSelected() && activeVideoTaskId && !previewController.getState(activeVideoModelId)?.job?.paused) void resumeStoredVideoTask();
  }

  function setPromptValue(value) {
    prompt.value = String(value || "").slice(0, 2500);
    promptCount.textContent = String(prompt.value.length);
    updateGenerateButton();
    prompt.focus();
  }

  function announceCredits(credits, context = 'account') {
    if (!credits) return;
    window.dispatchEvent(new CustomEvent("seedance:credits-updated", { detail: { ...credits, context: credits.context ?? context } }));
  }

  function renderGeneratedImages(images, modelId = activeModelId) {
    const items = images.map((image, index) => {
      const source = image.url || image.dataUrl;
      const item = document.createElement("div");
      item.className = "result-item";

      const frame = document.createElement("div");
      frame.className = "result-frame";
      const element = document.createElement("img");
      element.src = source;
      element.alt = t('Generated image result {number}', { number: index + 1 });
      frame.append(element);

      const link = document.createElement("a");
      link.href = source;
      link.rel = "noopener";
      if (image.dataUrl) {
        const mime = image.dataUrl.slice(5, image.dataUrl.indexOf(";"));
        const extension = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
        link.download = `${modelId}-${index + 1}.${extension}`;
        link.textContent = t('Download image {number} →', { number: index + 1 });
      } else {
        link.target = "_blank";
        link.textContent = t('Open / save image {number} →', { number: index + 1 });
      }
      const actions = document.createElement("div");
      actions.className = "image-result-actions";
      const animate = document.createElement("button");
      animate.type = "button";
      animate.className = "animate-image-button";
      animate.disabled = imageTransferInFlight;
      imageAnimateButtons.add(animate);
      animate.textContent = t("Animate this image ↗");
      animate.setAttribute("aria-label", t('Animate this image {number}', { number: index + 1 }));
      const transferStatus = document.createElement("p");
      transferStatus.className = "image-transfer-status";
      transferStatus.setAttribute("role", "status");
      animate.onclick = async () => {
        if (imageTransferInFlight || destroyed) return;
        imageTransferInFlight = true;
        imageAnimateButtons.forEach((button) => { button.disabled = true; });
        animate.textContent = t("Preparing image…");
        transferStatus.textContent = t("Saving your reference image for H3…");
        try {
          await element.decode();
          const destination = await prepareImageForVideo({ image, width: element.naturalWidth, height: element.naturalHeight, signal: imageTransferAbortController.signal });
          if (!destroyed) window.location.assign(destination);
        } catch (error) {
          if (destroyed) return;
          transferStatus.textContent = localizedErrorMessage(error?.message, error?.code, 'Image transfer failed. Please try again.');
          if (requiresAuthentication(error)) window.dispatchEvent(new CustomEvent("seedance:auth-required"));
        } finally {
          imageTransferInFlight = false;
          if (!destroyed) {
            imageAnimateButtons.forEach((button) => { button.disabled = false; });
            animate.textContent = t("Animate this image ↗");
          }
        }
      };
      actions.append(link, animate);
      item.append(frame, actions, transferStatus);
      return item;
    });
    return items;
  }

  function renderGeneratedVideo(videoUrl, modelId) {
    const item = document.createElement("div");
    item.className = "result-item video-result-item";
    const frame = document.createElement("div");
    frame.className = "result-frame";
    const video = document.createElement("video");
    video.src = videoUrl;
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("aria-label", t("Generated video"));
    frame.append(video);
    const link = document.createElement("a");
    link.href = videoUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = `${modelId}-video.mp4`;
    link.textContent = t("Open or download generated video →");
    item.append(frame, link);
    return [item];
  }

  function updateVideoStatus(update, context, job) {
    if (activeModelId === job.modelId && (update?.credits?.context ?? context) === (isGuestVideoSelected() ? 'guest-video' : 'account')
      && [5, 10, 15].includes(update?.credits?.cost)) {
      videoDuration.value = String(update.credits.cost);
    }
    announceCredits(update?.credits, context);
    const phase = update?.status;
    const message = phase === 'submitting' ? t('Submitting your request…')
      : phase === 'queued' ? t('Queued for generation…')
      : phase === 'running' ? t('Generating your video…')
      : t('Video service is busy. Retrying safely…');
    previewController.update(job, { stage: phase || 'checking', message });
    setJobStatus(job, message);
  }

  function requiresAuthentication(error) {
    return error?.status === 401 || error?.code === 'AUTH_REQUIRED';
  }

  async function runVideoTask({ resumeTaskId = '' } = {}) {
    if (videoPolling || destroyed || !(availableModelIds.has('minimax-h3') || availableModelIds.has('seedance-2-5'))) return;
    const draft = resumeTaskId ? null : captureGenerationDraft('video');
    const generationModelId = resumeTaskId ? activeVideoModelId : draft.modelId;
    activeVideoModelId = generationModelId;
    const creditContext = generationModelId === 'minimax-h3' && studioShell.dataset.authenticated !== 'true' ? 'guest-video' : 'account';
    videoPolling = true;
    const previousJob = videoPreviewJob && previewController.getState(generationModelId);
    const job = resumeTaskId && previousJob?.phase === 'pending' && previousJob.job?.handle === videoPreviewJob
      ? videoPreviewJob
      : previewController.begin({
          modelId: generationModelId, kind: 'video', modelName: studioModels[generationModelId].name,
          aspectRatio: draft?.aspectRatio || videoAspectRatio.value,
        });
    videoPreviewJob = job;
    if (draft) retryDrafts.set(job, draft);
    if (activeModelId === generationModelId) creditSummaryController?.beginGeneration({ reserved: Boolean(resumeTaskId) });
    updateVideoMode();
    renderVideoReferences();
    videoAbortController = new AbortController();
    updateGenerateButtonLabel();
    updateGenerateButton();
    const initialMessage = resumeTaskId ? t('Checking generation progress…')
      : draft.references.length ? t('Uploading references…') : t('Submitting your request…');
    previewController.update(job, { stage: resumeTaskId ? 'checking' : draft.references.length ? 'uploading' : 'submitting', message: initialMessage });
    setJobStatus(job, initialMessage);

    try {
      const common = {
        signal: videoAbortController.signal,
        onStatus: update => updateVideoStatus(update, creditContext, job),
      };
      const result = resumeTaskId
        ? await pollVideoGenerationTask({ ...common, taskId: resumeTaskId })
        : await requestVideoGeneration({
            ...common,
            prompt: draft.prompt,
            duration: draft.duration,
            resolution: draft.videoResolution,
            aspectRatio: draft.aspectRatio,
            referenceFiles: draft.references.map(item => item.file),
            onUpload: ({ index, total }) => {
              const message = t('Uploading reference image {index} of {total}…', { index, total });
              previewController.update(job, { stage: 'uploading', message });
              setJobStatus(job, message);
            },
            onTask: storeActiveVideoTask,
          });
      if (destroyed) return;
      announceCredits(result.credits, creditContext);
      clearActiveVideoTask();
      previewController.succeed(job, {
        items: renderGeneratedVideo(result.videoUrl, generationModelId),
        note: t('Video links may expire. Open or download your result when it is ready.'),
      });
      const message = (result.credits?.context ?? creditContext) === 'guest-video' && result.credits
        ? t('Video generated · {seconds} free seconds remaining.', { seconds: result.credits.remaining }) : result.credits
        ? t('Video generated · {remaining} credits remaining.', { remaining: result.credits.remaining })
        : t('Video generated.');
      setJobStatus(job, message, 'is-success');
    } catch (error) {
      if (destroyed || error?.name === 'AbortError') return;
      announceCredits(error?.credits, creditContext);
      if (requiresAuthentication(error)) window.dispatchEvent(new CustomEvent('seedance:auth-required'));
      if (error?.terminal || error?.status === 404 || error?.code === 'VIDEO_TASK_NOT_FOUND' || error?.code === 'INVALID_VIDEO_TASK') clearActiveVideoTask();
      const requiredCredits = error?.credits?.cost || draft?.duration || creditCostForDuration(videoDuration.value);
      if (error?.code === 'GUEST_TRIAL_USED') {
        if (activeModelId === generationModelId) guestRemaining = 0;
        window.dispatchEvent(new CustomEvent('seedance:auth-required', { detail: { mode: 'register' } }));
      }
      const message = error?.code === 'GUEST_TRIAL_INSUFFICIENT'
        ? t('Not enough free video seconds for this duration. Choose 5 seconds or sign up to keep creating.')
        : error?.code === 'INSUFFICIENT_CREDITS'
          ? error?.credits?.remaining === 0 ? dailyCreditsUsedMessage()
            : (t('You need {cost} credits to generate.', { cost: requiredCredits }) + ' ' + (error.credits ? t('Current balance: {remaining}.', { remaining: error.credits.remaining }) : '')).trim()
          : localizedErrorMessage(error?.message, error?.code, 'Video generation failed.');
      if (activeVideoTaskId) {
        const pausedMessage = message + ' ' + t('The video is still processing. Continue checking its progress.');
        previewController.pause(job, { message: pausedMessage });
        setJobStatus(job, pausedMessage);
      } else {
        // Resumed tasks from an earlier page have no request draft to submit again.
        previewController.fail(job, { message, canRetry: retryDrafts.has(job) });
        setJobStatus(job, message, 'is-error');
      }
    } finally {
      videoPolling = false;
      videoAbortController = null;
      if (!destroyed) {
        updateVideoMode();
        renderVideoReferences();
        updateGenerateButtonLabel();
        creditSummaryController?.refresh();
        void creditSummaryController?.loadBalance();
        updateGenerateButton();
      }
    }
  }

  function resumeStoredVideoTask() {
    const taskId = activeVideoTaskId || readActiveVideoTask();
    if (!taskId) return;
    activeVideoTaskId = taskId;
    return runVideoTask({ resumeTaskId: taskId });
  }

  function clearReferenceImage() {
    poseResultActionsController?.setVisible(false);
    imageReferences.forEach(item => URL.revokeObjectURL(item.url));
    imageReferences = [];
    referenceInput.value = "";
    renderImageReferences();
  }

  function renderImageReferences() {
    const pose = imageReferences.find(item => item.source === "pose");
    poseReferenceActive = Boolean(pose);
    if (poseScenePreview) {
      if (pose) poseScenePreview.src = pose.url;
      else poseScenePreview.removeAttribute("src");
    }
    referencePreview.classList.add("multiple-image-references");
    referencePreview.hidden = imageReferences.length === 0;
    referenceMeta.textContent = t('{count} / {limit} · Optional', {
      count: imageReferences.length, limit: getImageModel(activeModelId)?.maxReferences ?? 16,
    });
    const items = imageReferences.map((item, index) => {
      const row = document.createElement("div");
      row.className = "image-reference-item";
      const thumbnail = document.createElement("img");
      thumbnail.src = item.url;
      thumbnail.alt = t('Reference image {number}', { number: index + 1 });
      const caption = document.createElement("span");
      caption.textContent = t(item.source === 'pose' ? 'Image {number} · Pose' : 'Image {number}', { number: index + 1 });
      caption.title = item.file.name;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", t('Remove reference image {number}', { number: index + 1 }));
      remove.disabled = imageGenerationInFlight;
      remove.onclick = () => {
        if (imageGenerationInFlight) return;
        imageReferences.splice(index, 1);
        URL.revokeObjectURL(item.url);
        renderImageReferences();
      };
      row.append(thumbnail, caption, remove);
      return row;
    });
    referencePreview.replaceChildren(...items);
    referenceInput.disabled = imageGenerationInFlight;
    updateImageContext();
  }

  function updateImageContext() {
    const isIdle = previewController.getState(activeModelId)?.phase === 'idle';
    const showPose = isIdle && Boolean(getImageModel(activeModelId)) && poseReferenceActive;
    if (poseReferenceCard) poseReferenceCard.hidden = !showPose;
    if (imageExamples) imageExamples.hidden = activeModelId !== imageExamplesModel || showPose;
    exampleCarousel.hidden = activeModelId !== 'gpt-image-2' || hasDedicatedImageExamples || showPose;
    let hasExamples = false;
    generationOutput.querySelectorAll('[data-preview-model]').forEach(element => {
      const matches = element.dataset.previewModel === activeModelId;
      element.hidden = showPose || !matches;
      hasExamples ||= matches;
    });
    if (previewPlaceholder) previewPlaceholder.hidden = showPose || hasExamples;
  }

  function setReferenceImage(file, { source = "upload" } = {}) {
    const files = Array.isArray(file) ? file : file ? [file] : [];
    if (!files.length || imageGenerationInFlight) return false;
    const retained = source === "pose" ? imageReferences.filter(item => item.source !== "pose") : imageReferences;
    const maxReferences = getImageModel(activeModelId)?.maxReferences ?? 16;
    if (retained.length + files.length > maxReferences) {
      referenceInput.value = '';
      generationStatus.textContent = t('This image model supports up to {count} reference images.', { count: maxReferences });
      generationStatus.className = 'generation-status is-error';
      return false;
    }
    const error = validateImageReferences([...retained.map(item => item.file), ...files]);
    referenceInput.value = "";
    if (error) {
      generationStatus.textContent = error;
      generationStatus.className = "generation-status is-error";
      return false;
    }
    const added = files.map(file => ({ file, source, url: URL.createObjectURL(file) }));
    if (source === "pose") {
      imageReferences.filter(item => item.source === "pose").forEach(item => URL.revokeObjectURL(item.url));
      imageReferences = [...added, ...retained];
      previewController.resetDraft(activeModelId);
      poseResultActionsController?.setVisible(false);
    } else {
      imageReferences.push(...added);
    }
    renderImageReferences();
    generationStatus.textContent = t("Reference images ready. Use Image 1, Image 2, etc. in your prompt.");
    generationStatus.className = "generation-status";
    return true;
  }

  if (poseResultActions && editPoseButton && generateAgainButton) {
    poseResultActionsController = createPoseResultActionsController({
      container: poseResultActions,
      editButton: editPoseButton,
      generateAgainButton,
      onEditPose() {
        selectModel("pose-to-image", { syncUrl: true });
        poseStudio?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
      onGenerateAgain: () => runImageGeneration(),
    });
  }

  function dailyResetTime() {
    return formatCreditResetTime({ locale: currentLocale() === 'zh' ? 'zh-CN' : 'en' });
  }

  function dailyCreditsUsedMessage() {
    return t("Today’s free credits are used up. Daily reset: {time} (local time).", { time: dailyResetTime() });
  }

  function updateDailyResetNotice() {
    const guest = isGuestVideoSelected() || isGuestImageSelected();
    const used = guest && guestRemaining === 0 && !isCurrentGenerationPending();
    const notice = document.querySelector('.studio-trial-notice');
    if (notice) notice.dataset.trialState = guest ? used ? 'guest-used' : 'guest-available' : 'account';
    const noticeTitle = document.getElementById('trial-notice-title');
    if (noticeTitle) noticeTitle.textContent = t(used ? 'Free trial used up' : 'Free trial');
    const dailySignup = document.getElementById('trial-daily-signup');
    if (dailySignup) dailySignup.hidden = studioShell.dataset.authenticated === 'true' || !studioModels[activeModelId]?.canGenerate;
    const guestMessage = document.getElementById('trial-guest-message');
    if (guestMessage) guestMessage.hidden = !guest || used;
    if (dailyCreditResetNotice) {
      dailyCreditResetNotice.textContent = t("Daily reset: {time} (local time). Unused credits expire at reset and do not accumulate.", { time: dailyResetTime() });
    }
  }

  updateDailyResetNotice();
  creditSummaryController = createCreditSummaryController({
    container: creditSummary,
    costElement: generationCreditCost,
    currentBalanceElement: currentCreditBalance,
    balanceLabelElement: creditBalanceLabel,
    quantityControl: imageQuantity,
    additionalCostControls: [videoDuration],
    getCost: () => isVideoGenerationSelected()
      ? creditCostForDuration(videoDuration.value)
      : creditCostForQuantity(imageQuantity.value, activeModelId),
    getBalanceUrl: () => activeModelId === 'minimax-h3' ? '/api/credits/balance?guest_video=1'
      : getImageModel(activeModelId) ? '/api/credits/balance?guest_image=1' : '/api/credits/balance',
    getContext: () => isGuestVideoSelected() ? 'guest-video' : isGuestImageSelected() ? 'guest-image' : 'account',
    isGenerationPending: isCurrentGenerationPending,
    prepareControls: remaining => {
      guestRemaining = isGuestVideoSelected() || isGuestImageSelected() ? remaining : null;
      updateGuestVideoControls();
      updateGuestImageControls();
    },
    onBalanceLoaded: (remaining, credits) => {
      guestVideo = credits ? credits.guest === true : studioShell.dataset.authenticated !== 'true';
      guestRemaining = isGuestVideoSelected() || isGuestImageSelected() ? remaining : null;
      updateGuestVideoControls();
      updateGuestImageControls();
      updateGenerateButtonLabel();
      updateDailyResetNotice();
      if (remaining > 0 && generationStatus.textContent.startsWith(t("Today’s free credits are used up."))) {
        generationStatus.textContent = "";
        generationStatus.className = "generation-status";
      }
    },
    onChange: (summary) => {
      if (isGuestVideoSelected()) {
        guestRemaining = summary.currentBalance;
        updateGenerateButtonLabel();
      } else if (isGuestImageSelected()) {
        guestRemaining = summary.currentBalance;
        updateGenerateButtonLabel();
      }
      creditInsufficient = isGuestVideoSelected() ? guestRemaining !== null && guestRemaining < 5
        : isGuestImageSelected() ? guestRemaining !== null && guestRemaining < creditCostForQuantity(imageQuantity.value, activeModelId)
        : summary.insufficient;
      if (launchNotice) {
        launchNotice.hidden = summary.currentBalance !== 0 || isCurrentGenerationPending();
        if (isGuestImageSelected() || isGuestVideoSelected()) {
          renderGuestTrialNotice(launchNotice, isGuestImageSelected() ? 'image' : 'video', {
            href: window.location.href,
            onSignup: () => window.dispatchEvent(new CustomEvent('seedance:auth-required', { detail: { mode: 'register' } })),
          });
        } else launchNotice.textContent = dailyCreditsUsedMessage() + " " + (isVideoGenerationSelected()
          ? t("Launching soon. Video generation at $0.01/second.")
          : activeModelId === 'gpt-image-2-5-1k'
            ? t('GPT Image 2.5 uses 5 trial credits per image.')
            : t("Launching soon. Image generation at $0.01/image."));
      }
      updateGenerateButton();
    }
  });
  selectModel(modelFromLocation());
  if (activeModelId === "minimax-h3" || getImageModel(activeModelId)) {
    const showcaseSearch = new URLSearchParams(window.location.search);
    const showcasePrompt = showcaseSearch.get("prompt");
    if (showcasePrompt) {
      setPromptValue(showcasePrompt);
      const duration = showcaseSearch.get("duration");
      const aspectRatio = showcaseSearch.get("aspect_ratio");
      if (activeModelId === "minimax-h3") {
        if (["5", "10", "15"].includes(duration)) videoDuration.value = duration;
        if (["16:9", "9:16", "1:1"].includes(aspectRatio)) videoAspectRatio.value = aspectRatio;
      } else if (Object.hasOwn(getImageModel(activeModelId)?.sizes || {}, aspectRatio)) {
        imageAspectRatio.value = aspectRatio;
      }
      creditSummaryController?.refresh();
      updateGuestVideoControls();
      updateGenerateButtonLabel();
      updateGenerateButton();
    }
  }
  const exampleCarouselController = createExampleCarouselController({
    slides: exampleCarouselSlides,
    dots: exampleCarouselDots,
    previousButton: exampleCarouselPrevious,
    nextButton: exampleCarouselNext,
    titleElement: exampleTitle,
    descriptionElement: examplePrompt
  });
  const transferredImageId = new URLSearchParams(window.location.search).get("reference");
  if (activeModelId === "minimax-h3" && transferredImageId) {
    videoMode = "reference";
    videoAspectRatio.value = new URLSearchParams(window.location.search).get("aspect_ratio") === "9:16" ? "9:16" : "16:9";
    prompt.value = "";
    promptCount.textContent = "0";
    updateVideoMode();
    updateGenerateButton();
    generationStatus.textContent = t("Loading your reference image…");
    void loadVideoReference(transferredImageId, { signal: imageTransferAbortController.signal }).then((file) => {
      if (destroyed) return;
      // The user may have added images while the transferred one was loading.
      if (videoReferences.length >= 1) throw new Error(t("H3 supports only one reference image. Remove the current image before adding another."));
      videoReferences.unshift({ file, url: URL.createObjectURL(file) });
      renderVideoReferences();
      updateGenerateButton();
      generationStatus.textContent = t("Image ready. Describe the motion and camera movement, then generate when ready.");
      generationStatus.className = "generation-status";
    }).catch((error) => {
      if (destroyed) return;
      generationStatus.textContent = localizedErrorMessage(error?.message, error?.code, 'Could not load the image. Please upload it again.');
      generationStatus.className = "generation-status is-error";
    });
  }
  void creditSummaryController.loadBalance();
  const fromHome = activeModelId === 'minimax-h3' && new URLSearchParams(window.location.search).get('from') === 'home';
  if (fromHome) {
    void readVideoHandoff().then((draft) => {
      if (destroyed) return;
      if (draft) {
        restoreGenerationDraft({ kind: 'video', modelId: 'minimax-h3', prompt: draft.prompt,
          duration: draft.duration, videoResolution: '480p', aspectRatio: draft.aspectRatio,
          videoMode: draft.mode, references: draft.file ? [{ file: draft.file }] : [],
        });
        if (draft.taskId) {
          activeVideoModelId = 'minimax-h3';
          storeActiveVideoTask(draft.taskId);
        }
        generationStatus.textContent = t('Your homepage draft is ready.');
        updateGenerateButton();
      }
      if (activeVideoTaskId) void resumeStoredVideoTask();
    }).catch(() => {
      if (destroyed) return;
      generationStatus.textContent = t('Could not restore the reference image. Please choose it again.');
      if (activeVideoTaskId) void resumeStoredVideoTask();
    });
  } else if ((availableModelIds.has("minimax-h3") || availableModelIds.has("seedance-2-5")) && activeVideoTaskId) void resumeStoredVideoTask();

  modelButtons.forEach((button) => listen(button, "click", () => {
    const modelId = button.dataset.model;
    if (modelIdFromPath(window.location.pathname)) {
      if (modelId === modelFromLocation()) return;
      window.location.assign(localizedPath(canonicalModelPath(modelId) || buildModelUrl(`${window.location.origin}/app/`, modelId), currentLocale()));
      return;
    }
    selectModel(modelId, { syncUrl: true });
  }));
  listen(window, "popstate", () => selectModel(modelFromLocation()));
  listen(prompt, "input", () => {
    promptCount.textContent = String(prompt.value.length);
    updateGenerateButton();
  });
  listen(promptStructureButton, "click", () => {
    setPromptValue(applyPromptStructure(prompt.value));
    generationStatus.textContent = t("Prompt structure added.");
    generationStatus.className = "generation-status";
  });
  listen(examplePromptButton, "click", () => {
    const value = examplePromptAt(exampleIndex);
    exampleIndex += 1;
    setPromptValue(value);
    generationStatus.textContent = t("Example prompt loaded. Click again for another.");
    generationStatus.className = "generation-status";
  });
  listen(imageQuantity, "change", () => {
    updateGenerateButtonLabel();
    updateGenerateButton();
  });
  listen(videoDuration, "change", updateGenerateButtonLabel);
  listen(videoAspectRatio, 'change', renderVideoReferences);
  videoModeButtons.forEach((button) => listen(button, "click", () => {
    if (videoPolling) return;
    videoMode = button.dataset.videoMode;
    updateVideoMode();
    renderVideoReferences();
    updateGenerateButton();
  }));
  if (videoReferenceAdd && videoReferenceInput) {
    listen(videoReferenceAdd, "click", () => videoReferenceInput.click());
    listen(videoReferenceInput, "change", () => {
      const files = Array.from(videoReferenceInput.files || []);
      videoReferenceInput.value = "";
      addVideoReferenceImages(files);
    });
  }
  listen(document, "paste", (event) => {
    if (destroyed || creationGrid.hidden) return;
    // Leave account dialogs and other editable fields outside the workspace alone.
    if (event.target?.closest?.("[role='dialog'], dialog")) return;
    const editable = event.target?.closest?.("input, textarea, [contenteditable='true']");
    if (editable && editable !== prompt) return;
    if (getImageModel(activeModelId) && !uploadGroup.hidden && !referenceInput.disabled && !imageGenerationInFlight) {
      handleReferenceImagePaste(event, setReferenceImage);
    } else if (isReferenceVideo() && videoReferenceGroup && !videoReferenceGroup.hidden && !videoReferenceInput.disabled && !videoPolling && !activeVideoTaskId) {
      handleReferenceImagePaste(event, addVideoReferenceImages);
    }
  });
  listen(uploadBox, "click", () => {
    if (studioModels[activeModelId]?.canGenerate) referenceInput.click();
  });
  referenceInput.multiple = true;
  listen(referenceInput, "change", () => setReferenceImage(Array.from(referenceInput.files || [])));
  listen(referenceClear, "click", clearReferenceImage);
  async function runImageGeneration() {
    if (imageGenerationInFlight || !getImageModel(activeModelId) || !prompt.value.trim() || creditInsufficient) return;
    const maxReferences = getImageModel(activeModelId).maxReferences;
    if (imageReferences.length > maxReferences) {
      generationStatus.textContent = t('This image model supports up to {count} reference images.', { count: maxReferences });
      generationStatus.className = 'generation-status is-error';
      return;
    }
    const draft = captureGenerationDraft('image');
    const generationModelId = draft.modelId;
    const creditContext = isGuestImageSelected() ? 'guest-image' : 'account';
    imageGenerationInFlight = true;
    const job = previewController.begin({ modelId: generationModelId, kind: 'image', modelName: studioModels[generationModelId].name,
      count: draft.quantity, aspectRatio: draft.aspectRatio, isPose: draft.isPose });
    retryDrafts.set(job, draft);
    creditSummaryController?.beginGeneration();
    renderImageReferences();
    updateGenerateButton();
    updateGenerateButtonLabel();
    const initialMessage = draft.isPose ? t('Creating from your pose reference…')
      : draft.references.length ? t('Editing from your reference image…') : t('Creating an image from your prompt…');
    previewController.update(job, { stage: 'submitting', message: initialMessage });
    setJobStatus(job, initialMessage);
    try {
      const result = await requestImageGeneration({
        model: generationModelId, prompt: draft.prompt,
        referenceFiles: draft.references.map(item => item.file), quantity: draft.quantity,
        resolution: draft.resolution, size: sizeForAspectRatio(draft.aspectRatio, generationModelId),
        signal: imageTransferAbortController.signal,
      });
      if (destroyed) return;
      previewController.succeed(job, { items: renderGeneratedImages(result.images, generationModelId),
        note: t('Provider image links may expire. Open or download each result when it is ready.') });
      announceCredits(result.credits, creditContext);
      const generatedCount = result.images.length;
      const message = (result.credits?.context ?? creditContext) === 'guest-image' && result.credits
        ? t('Image generated · {count} free images remaining.', { count: Math.floor(result.credits.remaining / 5) }) : result.credits
        ? t('{count} image{plural} generated · {remaining} credits remaining.', { count: generatedCount, plural: generatedCount === 1 ? '' : 's', remaining: result.credits.remaining })
        : t('{count} image{plural} generated.', { count: generatedCount, plural: generatedCount === 1 ? '' : 's' });
      setJobStatus(job, message, 'is-success');
    } catch (error) {
      if (destroyed) return;
      announceCredits(error?.credits, creditContext);
      if (requiresAuthentication(error)) window.dispatchEvent(new CustomEvent('seedance:auth-required'));
      const requiredCredits = error?.credits?.cost || creditCostForQuantity(draft.quantity, generationModelId);
      if (error?.code === 'GUEST_TRIAL_USED') {
        if (activeModelId === generationModelId) guestRemaining = 0;
        window.dispatchEvent(new CustomEvent('seedance:auth-required', { detail: { mode: 'register' } }));
      }
      const message = error?.code === 'GUEST_IMAGE_INSUFFICIENT' || error?.code === 'GUEST_TRIAL_USED'
        ? error?.credits?.remaining > 0 ? t('Choose fewer images or sign up to keep creating.') : t('Your free images are used up. Sign up for 15 free credits every day.')
        : error?.code === 'INSUFFICIENT_CREDITS'
        ? error?.credits?.remaining === 0 ? dailyCreditsUsedMessage()
          : (t('You need {cost} credits to generate.', { cost: requiredCredits }) + ' ' + (error.credits ? t('Current balance: {remaining}.', { remaining: error.credits.remaining }) : '')).trim()
        : localizedErrorMessage(error?.message, error?.code, 'Image generation failed.');
      previewController.fail(job, { message });
      setJobStatus(job, message, 'is-error');
    } finally {
      if (!destroyed) {
        imageGenerationInFlight = false;
        creditSummaryController?.refresh();
        renderImageReferences();
        updateImageContext();
        updateGenerateButtonLabel();
        updateGenerateButton();
      }
    }
  }

  listen(generateButton, "click", async () => {
    if (generateButton.disabled) return;
    if ((isGuestVideoSelected() || isGuestImageSelected()) && guestRemaining === 0) {
      window.dispatchEvent(new CustomEvent('seedance:auth-required', { detail: { mode: 'register' } }));
      return;
    }
    if (isVideoGenerationSelected()) {
      await runVideoTask();
      return;
    }
    await runImageGeneration();
  });
  document.querySelectorAll(".segmented button:not([data-video-mode])").forEach((button) => listen(button, "click", () => {
    button.parentElement.querySelectorAll("button").forEach((item) => item.classList.toggle("is-selected", item === button));
  }));
  listen(sidebarOpen, "click", () => sidebar.classList.add("is-open"));
  listen(poseSidebarToggle, "click", () => {
    poseSidebarCollapsed = !poseSidebarCollapsed;
    updatePoseSidebar();
  });
  listen(sidebarClose, "click", () => sidebar.classList.remove("is-open"));

  return () => {
    if (destroyed) return;
    destroyed = true;
    imageTransferAbortController.abort();
    imageAnimateButtons.clear();
    videoAbortController?.abort();
    previewController.destroy();
    creditSummaryController.destroy();
    exampleCarouselController.destroy();
    poseResultActionsController?.destroy();
    poseStudioCleanup?.();
    while (cleanups.length) cleanups.pop()();
    clearReferenceImage();
    videoReferences.forEach((item) => URL.revokeObjectURL(item.url));
  };
}

let legacyCleanup;

if (typeof document !== "undefined" && document.documentElement.hasAttribute("data-studio-auto-init")) {
  legacyCleanup = initializeStudio();

  function cleanupLegacyStudio() {
    legacyCleanup?.();
    legacyCleanup = undefined;
  }

  window.addEventListener("pagehide", cleanupLegacyStudio);
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    legacyCleanup?.();
    legacyCleanup = initializeStudio();
  });
}
