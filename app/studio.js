import { buildModelUrl, normalizeModelId } from "./model-routing.mjs";
import { requestImageGeneration } from "./image-generation.mjs";
import { pollVideoGenerationTask, requestVideoGeneration } from "./video-generation.mjs";
import { createLaunchWaitlistController } from "./launch-waitlist.mjs";
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
    status: "Ragdoll IK",
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
const trialCompleteMessage = "Your free trial is complete. Full launch is coming soon — video generation from $0.01/sec.";
const activeVideoTaskStorageKey = "seedance:minimax-h3:active-task";

export function initializeStudio() {
  const cleanups = [];
  let destroyed = false;

  function listen(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    cleanups.push(() => target.removeEventListener(type, listener, options));
  }

  const modelButtons = document.querySelectorAll(".model-button[data-model]");
  const enabledModelButtons = Array.from(modelButtons).filter((button) => !button.disabled);
  const availableModelIds = new Set(enabledModelButtons.map((button) => button.dataset.model));
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
  const resultCard = document.getElementById("result-card");
  const resultGallery = document.getElementById("result-gallery");
  const exampleCarousel = document.getElementById("example-carousel");
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
  const imageQuantity = document.getElementById("image-quantity");
  const imageQuality = document.getElementById("image-quality");
  const imageAspectRatio = document.getElementById("image-aspect-ratio");
  const creditSummary = document.getElementById("credit-summary");
  const generationCreditCost = document.getElementById("generation-credit-cost");
  const currentCreditBalance = document.getElementById("current-credit-balance");
  const launchWaitlist = document.getElementById("launch-waitlist");
  const launchWaitlistButton = document.getElementById("launch-waitlist-button");
  const launchWaitlistStatus = document.getElementById("launch-waitlist-status");
  const resultHeadingLabel = document.getElementById("result-heading-label");
  const resultModelLabel = document.getElementById("result-model-label");
  const resultNote = document.getElementById("result-note");
  const poseResultActions = document.getElementById("pose-result-actions");
  const editPoseButton = document.getElementById("edit-pose-button");
  const generateAgainButton = document.getElementById("generate-again-button");
  const sidebar = document.getElementById("studio-sidebar");
  const sidebarOpen = document.querySelector(".sidebar-open");
  const sidebarClose = document.querySelector(".sidebar-close");
  const creationGrid = document.getElementById("creation-grid");
  const poseStudio = document.getElementById("pose-studio");

  let activeModelId = "gpt-image-2";
  let referenceFile = null;
  let referencePreviewUrl = "";
  let poseReferenceActive = false;
  let imageGenerationInFlight = false;
  let videoPolling = false;
  let videoAbortController = null;
  let activeVideoTaskId = readActiveVideoTask();
  let exampleIndex = 0;
  let creditInsufficient = false;
  let creditSummaryController;
  let launchWaitlistController;
  let poseStudioCleanup;
  let poseStudioPromise;
  let poseResultActionsController;

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
            generationStatus.textContent = "Pose reference ready · describe the character, clothing, scene, and style.";
            generationStatus.className = "generation-status is-success";
            creationGrid?.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      })
      .catch(() => {
        const loading = document.getElementById("pose-canvas-loading");
        if (loading) loading.textContent = "The 3D editor could not start. Refresh and try again.";
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

  function storeActiveVideoTask(taskId) {
    activeVideoTaskId = taskId;
    try {
      sessionStorage.setItem(activeVideoTaskStorageKey, taskId);
    } catch {
      // Polling can continue for this page lifetime when storage is unavailable.
    }
  }

  function clearActiveVideoTask() {
    activeVideoTaskId = "";
    try {
      sessionStorage.removeItem(activeVideoTaskStorageKey);
    } catch {
      // Storage may be unavailable in hardened browsers.
    }
  }

  function imageGenerationLabel() {
    const quantity = normalizeImageQuantity(imageQuantity?.value);
    if (quantity === 1) return defaultImageGenerationLabel;
    return `Generate ${quantity} images · ${creditCostForQuantity(quantity)} credits`;
  }

  function videoGenerationLabel() {
    return `Generate video · ${creditCostForDuration(videoDuration?.value)} credits`;
  }

  function isH3Selected() {
    return activeModelId === "minimax-h3";
  }

  function updateGenerateButtonLabel() {
    const model = studioModels[activeModelId];
    if (!model?.canGenerate) {
      generateButtonLabel.textContent = "Generation coming soon";
    } else if (isH3Selected()) {
      generateButtonLabel.textContent = activeVideoTaskId || videoPolling
        ? "Video generation in progress…"
        : videoGenerationLabel();
    } else {
      generateButtonLabel.textContent = imageGenerationInFlight ? "Generating…" : imageGenerationLabel();
    }
  }

  function modelFromLocation() {
    return new URLSearchParams(window.location.search).get("model");
  }

  function updateGenerateButton() {
    const canGenerate = Boolean(studioModels[activeModelId]?.canGenerate);
    const generationBlocked = isH3Selected()
      ? videoPolling || Boolean(activeVideoTaskId)
      : imageGenerationInFlight;
    generateButton.disabled = !canGenerate || !prompt.value.trim() || generationBlocked || creditInsufficient;
    const disabled = generateButton.disabled;
    poseResultActionsController?.setGenerateState({
      disabled: disabled || !poseReferenceActive || activeModelId !== "gpt-image-2",
      cost: creditCostForQuantity(imageQuantity.value),
    });
  }

  function selectModel(modelId, { syncUrl = false } = {}) {
    const normalizedModelId = normalizeModelId(modelId, availableModelIds);
    const model = studioModels[normalizedModelId];
    activeModelId = normalizedModelId;
    modelButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.model === normalizedModelId));
    modelName.textContent = model.name;
    modelCategory.textContent = model.category;
    modelStatus.textContent = model.status;
    selectedName.textContent = model.name;
    selectedSymbol.textContent = model.symbol;
    selectedSymbol.className = `model-symbol ${model.tone}`;
    exampleTitle.textContent = model.exampleTitle;
    examplePrompt.textContent = model.examplePrompt;
    const videoModel = model.type === "video";
    const poseModel = model.type === "pose";
    creationGrid.hidden = poseModel;
    if (poseStudio) poseStudio.hidden = !poseModel;
    if (poseModel) void ensurePoseStudio();
    referenceLabel.textContent = model.canGenerate ? "Reference image" : "Reference files";
    referenceMeta.textContent = model.canGenerate ? "Optional · enables image-to-image" : videoModel ? "Preview only" : "Reference images";
    uploadTitle.textContent = model.canGenerate ? "Choose a reference image" : "Drop or choose reference media";
    uploadHint.textContent = model.canGenerate ? "PNG, JPEG or WebP · max 10 MB" : "Interface preview only—files are not uploaded";
    uploadBox.classList.toggle("is-enabled", Boolean(model.canGenerate) && !videoModel);
    uploadGroup.hidden = model.type === "video";
    modeGroup.hidden = true;
    promptTools.hidden = videoModel;
    videoSettings.hidden = model.type !== "video";
    imageSettings.hidden = model.type !== "image";
    updateGenerateButtonLabel();
    if (!isH3Selected() || !activeVideoTaskId) {
      generationStatus.textContent = "";
      generationStatus.className = "generation-status";
    }
    creditSummaryController?.refresh();
    updateGenerateButton();
    if (syncUrl && modelFromLocation() !== normalizedModelId) {
      history.pushState({ model: normalizedModelId }, "", buildModelUrl(window.location.href, normalizedModelId));
    }
    if (isH3Selected() && activeVideoTaskId) void resumeStoredVideoTask();
  }

  function setPromptValue(value) {
    prompt.value = String(value || "").slice(0, 2500);
    promptCount.textContent = String(prompt.value.length);
    updateGenerateButton();
    prompt.focus();
  }

  function announceCredits(credits) {
    if (!credits) return;
    window.dispatchEvent(new CustomEvent("seedance:credits-updated", { detail: credits }));
  }

  function renderGeneratedImages(images) {
    const items = images.map((image, index) => {
      const source = image.url || image.dataUrl;
      const item = document.createElement("div");
      item.className = "result-item";

      const frame = document.createElement("div");
      frame.className = "result-frame";
      const element = document.createElement("img");
      element.src = source;
      element.alt = `Generated image result ${index + 1}`;
      frame.append(element);

      const link = document.createElement("a");
      link.href = source;
      link.rel = "noopener";
      if (image.dataUrl) {
        const mime = image.dataUrl.slice(5, image.dataUrl.indexOf(";"));
        const extension = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
        link.download = `gpt-image-2-${index + 1}.${extension}`;
        link.textContent = `Download image ${index + 1} →`;
      } else {
        link.target = "_blank";
        link.textContent = `Open / save image ${index + 1} →`;
      }
      item.append(frame, link);
      return item;
    });
    resultGallery.replaceChildren(...items);
    resultHeadingLabel.textContent = "GENERATED IMAGES";
    resultModelLabel.textContent = "GPT Image 2";
    resultNote.textContent = "Provider image links may expire. Open or download each result when it is ready.";
  }

  function renderGeneratedVideo(videoUrl) {
    const item = document.createElement("div");
    item.className = "result-item video-result-item";
    const frame = document.createElement("div");
    frame.className = "result-frame";
    const video = document.createElement("video");
    video.src = videoUrl;
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("aria-label", "Generated MiniMax H3 video");
    frame.append(video);
    const link = document.createElement("a");
    link.href = videoUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = "minimax-h3-video.mp4";
    link.textContent = "Open or download generated video →";
    item.append(frame, link);
    resultGallery.replaceChildren(item);
    resultHeadingLabel.textContent = "GENERATED VIDEO";
    resultModelLabel.textContent = "MiniMax H3";
    resultNote.textContent = "Video links may expire. Open or download your result when it is ready.";
  }

  function updateVideoStatus(update) {
    announceCredits(update?.credits);
    const status = update?.status;
    generationStatus.textContent = status === "queued" || status === "submitting"
      ? "Video queued. Waiting for generation to start…"
      : status === "running"
        ? "MiniMax H3 is generating your video…"
        : "Video service is busy. Retrying safely…";
    generationStatus.className = "generation-status is-working";
  }

  function requiresAuthentication(error) {
    return error?.status === 401 || error?.code === "AUTH_REQUIRED";
  }

  async function runVideoTask({ resumeTaskId = "" } = {}) {
    if (videoPolling || destroyed || !availableModelIds.has("minimax-h3")) return;
    videoPolling = true;
    videoAbortController = new AbortController();
    updateGenerateButtonLabel();
    updateGenerateButton();
    generationStatus.textContent = resumeTaskId
      ? "Resuming video generation status…"
      : "Submitting your text-to-video prompt…";
    generationStatus.className = "generation-status is-working";
    if (!resumeTaskId) {
      resultCard.hidden = true;
      exampleCarousel.hidden = false;
    }

    try {
      const common = {
        signal: videoAbortController.signal,
        onStatus: updateVideoStatus
      };
      const result = resumeTaskId
        ? await pollVideoGenerationTask({ ...common, taskId: resumeTaskId })
        : await requestVideoGeneration({
            ...common,
            prompt: prompt.value,
            duration: creditCostForDuration(videoDuration.value),
            resolution: videoResolution.value || "480p",
            aspectRatio: videoAspectRatio.value,
            onTask: storeActiveVideoTask
          });
      if (destroyed) return;
      announceCredits(result.credits);
      clearActiveVideoTask();
      renderGeneratedVideo(result.videoUrl);
      resultCard.hidden = false;
      exampleCarousel.hidden = true;
      generationStatus.textContent = result.credits
        ? `Video generated · ${result.credits.remaining} credits remaining.`
        : "Video generated.";
      generationStatus.className = "generation-status is-success";
    } catch (error) {
      if (destroyed || error?.name === "AbortError") return;
      announceCredits(error?.credits);
      if (requiresAuthentication(error)) {
        window.dispatchEvent(new CustomEvent("seedance:auth-required"));
      }
      if (error?.terminal || error?.status === 404 || error?.code === "VIDEO_TASK_NOT_FOUND" || error?.code === "INVALID_VIDEO_TASK") {
        clearActiveVideoTask();
      }
      const requiredCredits = error?.credits?.cost || creditCostForDuration(videoDuration.value);
      generationStatus.textContent = error?.code === "INSUFFICIENT_CREDITS"
        ? error?.credits?.remaining === 0
          ? trialCompleteMessage
          : `You need ${requiredCredits} credits to generate. ${error.credits ? `Current balance: ${error.credits.remaining}.` : ""}`.trim()
        : String(error?.message || "Video generation failed.");
      generationStatus.className = "generation-status is-error";
    } finally {
      videoPolling = false;
      videoAbortController = null;
      if (!destroyed) {
        updateGenerateButtonLabel();
        creditSummaryController?.refresh();
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
    poseReferenceActive = false;
    poseResultActionsController?.setVisible(false);
    referenceFile = null;
    referenceInput.value = "";
    referencePreview.hidden = true;
    referencePreviewImage.removeAttribute("src");
    referenceFileName.textContent = "";
    if (referencePreviewUrl) {
      URL.revokeObjectURL(referencePreviewUrl);
      referencePreviewUrl = "";
    }
  }

  function setReferenceImage(file, { source = "upload" } = {}) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      generationStatus.textContent = "Choose a PNG, JPEG, or WebP image.";
      generationStatus.className = "generation-status is-error";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      generationStatus.textContent = "Reference image cannot exceed 10 MB.";
      generationStatus.className = "generation-status is-error";
      return;
    }
    clearReferenceImage();
    referenceFile = file;
    poseReferenceActive = source === "pose";
    referencePreviewUrl = URL.createObjectURL(file);
    referencePreviewImage.src = referencePreviewUrl;
    referenceFileName.textContent = file.name;
    referencePreview.hidden = false;
    generationStatus.textContent = "Reference image ready.";
    generationStatus.className = "generation-status";
  }

  if (launchWaitlist && launchWaitlistButton && launchWaitlistStatus) {
    launchWaitlistController = createLaunchWaitlistController({
      container: launchWaitlist,
      button: launchWaitlistButton,
      statusElement: launchWaitlistStatus
    });
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

  creditSummaryController = createCreditSummaryController({
    container: creditSummary,
    costElement: generationCreditCost,
    currentBalanceElement: currentCreditBalance,
    quantityControl: imageQuantity,
    additionalCostControls: [videoDuration],
    getCost: () => isH3Selected()
      ? creditCostForDuration(videoDuration.value)
      : creditCostForQuantity(imageQuantity.value),
    onChange: (summary) => {
      creditInsufficient = summary.insufficient;
      void launchWaitlistController?.setVisible(summary.currentBalance === 0);
      updateGenerateButton();
    }
  });
  selectModel(modelFromLocation());
  const exampleCarouselController = createExampleCarouselController({
    slides: exampleCarouselSlides,
    dots: exampleCarouselDots,
    previousButton: exampleCarouselPrevious,
    nextButton: exampleCarouselNext,
    titleElement: exampleTitle,
    descriptionElement: examplePrompt
  });
  void creditSummaryController.loadBalance();
  if (availableModelIds.has("minimax-h3") && activeVideoTaskId) void resumeStoredVideoTask();

  modelButtons.forEach((button) => listen(button, "click", () => selectModel(button.dataset.model, { syncUrl: true })));
  listen(window, "popstate", () => selectModel(modelFromLocation()));
  listen(prompt, "input", () => {
    promptCount.textContent = String(prompt.value.length);
    updateGenerateButton();
  });
  listen(promptStructureButton, "click", () => {
    setPromptValue(applyPromptStructure(prompt.value));
    generationStatus.textContent = "Prompt structure added.";
    generationStatus.className = "generation-status";
  });
  listen(examplePromptButton, "click", () => {
    const value = examplePromptAt(exampleIndex);
    exampleIndex += 1;
    setPromptValue(value);
    generationStatus.textContent = "Example prompt loaded. Click again for another.";
    generationStatus.className = "generation-status";
  });
  listen(imageQuantity, "change", () => {
    updateGenerateButtonLabel();
    updateGenerateButton();
  });
  listen(videoDuration, "change", updateGenerateButtonLabel);
  listen(uploadBox, "click", () => {
    if (studioModels[activeModelId]?.canGenerate) referenceInput.click();
  });
  listen(referenceInput, "change", () => setReferenceImage(referenceInput.files?.[0]));
  listen(referenceClear, "click", clearReferenceImage);
  async function runImageGeneration() {
    if (imageGenerationInFlight || activeModelId !== "gpt-image-2" || !prompt.value.trim() || creditInsufficient) return;
    const generationUsedPoseReference = poseReferenceActive;
    imageGenerationInFlight = true;
    updateGenerateButton();
    updateGenerateButtonLabel();
    generationStatus.textContent = generationUsedPoseReference
      ? "Creating from your pose reference…"
      : referenceFile
        ? "Editing from your reference image…"
        : "Creating an image from your prompt…";
    generationStatus.className = "generation-status is-working";
    resultCard.hidden = true;
    poseResultActionsController?.setVisible(false);
    exampleCarousel.hidden = false;
    try {
      const result = await requestImageGeneration({
        prompt: prompt.value,
        referenceFile,
        quantity: normalizeImageQuantity(imageQuantity.value),
        resolution: imageQuality.value,
        size: sizeForAspectRatio(imageAspectRatio.value)
      });
      if (destroyed) return;
      renderGeneratedImages(result.images);
      resultCard.hidden = false;
      poseResultActionsController?.setVisible(generationUsedPoseReference);
      exampleCarousel.hidden = true;
      announceCredits(result.credits);
      const generatedCount = result.images.length;
      generationStatus.textContent = result.credits
        ? `${generatedCount} image${generatedCount === 1 ? "" : "s"} generated · ${result.credits.remaining} credits remaining.`
        : `${generatedCount} image${generatedCount === 1 ? "" : "s"} generated.`;
      generationStatus.className = "generation-status is-success";
    } catch (error) {
      if (destroyed) return;
      announceCredits(error?.credits);
      if (error?.status === 401 || error?.code === "AUTH_REQUIRED") {
        window.dispatchEvent(new CustomEvent("seedance:auth-required"));
      }
      const requiredCredits = error?.credits?.cost || creditCostForQuantity(imageQuantity.value);
      generationStatus.textContent = error?.code === "INSUFFICIENT_CREDITS"
        ? error?.credits?.remaining === 0
          ? trialCompleteMessage
          : `You need ${requiredCredits} credits to generate. ${error.credits ? `Current balance: ${error.credits.remaining}.` : ""}`.trim()
        : String(error?.message || "Image generation failed.");
      generationStatus.className = "generation-status is-error";
    } finally {
      if (!destroyed) {
        imageGenerationInFlight = false;
        updateGenerateButtonLabel();
        updateGenerateButton();
      }
    }
  }

  listen(generateButton, "click", async () => {
    if (generateButton.disabled) return;
    if (isH3Selected()) {
      await runVideoTask();
      return;
    }
    await runImageGeneration();
  });
  document.querySelectorAll(".segmented button").forEach((button) => listen(button, "click", () => {
    button.parentElement.querySelectorAll("button").forEach((item) => item.classList.toggle("is-selected", item === button));
  }));
  listen(sidebarOpen, "click", () => sidebar.classList.add("is-open"));
  listen(sidebarClose, "click", () => sidebar.classList.remove("is-open"));

  return () => {
    if (destroyed) return;
    destroyed = true;
    videoAbortController?.abort();
    creditSummaryController.destroy();
    launchWaitlistController?.destroy();
    exampleCarouselController.destroy();
    poseResultActionsController?.destroy();
    poseStudioCleanup?.();
    while (cleanups.length) cleanups.pop()();
    clearReferenceImage();
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
