import { buildModelUrl, normalizeModelId } from "./model-routing.mjs";
import { requestImageGeneration } from "./image-generation.mjs";
import {
  applyPromptStructure,
  createCreditSummaryController,
  createExampleCarouselController,
  creditCostForQuantity,
  examplePromptAt,
  normalizeImageQuantity,
  sizeForAspectRatio
} from "./studio-controls.mjs";

const studioModels = {
  "minimax-h3": {
    category: "AI VIDEO / MULTIMODAL",
    name: "MiniMax H3",
    status: "Coming Soon",
    symbol: "H3",
    tone: "cyan",
    exampleTitle: "Cinematic product reveal",
    examplePrompt: "A slow orbital camera, controlled reflections, native room tone, and a clean final composition.",
    type: "video"
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
    name: "Pose to Image",
    status: "Coming Soon",
    symbol: "P3",
    tone: "lime",
    exampleTitle: "Pose-first character image",
    examplePrompt: "Shape the body language and camera angle first, then describe the character, scene, lighting, and visual style.",
    type: "image"
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

const availableModelIds = new Set(["gpt-image-2"]);
const defaultImageGenerationLabel = "Generate image · 5 credits";
const trialCompleteMessage = "Your free trial is complete. More credits and ultra-affordable creator plans are coming soon.";

export function initializeStudio() {
  const cleanups = [];
  let destroyed = false;

  function listen(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    cleanups.push(() => target.removeEventListener(type, listener, options));
  }

  const modelButtons = document.querySelectorAll(".model-button[data-model]");
  const modelName = document.getElementById("model-name");
  const modelCategory = document.getElementById("model-category");
  const modelStatus = document.getElementById("model-status");
  const selectedName = document.getElementById("selected-name");
  const selectedSymbol = document.getElementById("selected-symbol");
  const exampleTitle = document.getElementById("example-title");
  const examplePrompt = document.getElementById("example-prompt");
  const uploadBox = document.getElementById("upload-box");
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
  const imageQuantity = document.getElementById("image-quantity");
  const imageQuality = document.getElementById("image-quality");
  const imageAspectRatio = document.getElementById("image-aspect-ratio");
  const creditSummary = document.getElementById("credit-summary");
  const generationCreditCost = document.getElementById("generation-credit-cost");
  const currentCreditBalance = document.getElementById("current-credit-balance");
  const sidebar = document.getElementById("studio-sidebar");
  const sidebarOpen = document.querySelector(".sidebar-open");
  const sidebarClose = document.querySelector(".sidebar-close");

  let activeModelId = "gpt-image-2";
  let referenceFile = null;
  let referencePreviewUrl = "";
  let generationInFlight = false;
  let exampleIndex = 0;
  let creditInsufficient = false;

  function imageGenerationLabel() {
    const quantity = normalizeImageQuantity(imageQuantity?.value);
    if (quantity === 1) return defaultImageGenerationLabel;
    return `Generate ${quantity} images · ${creditCostForQuantity(quantity)} credits`;
  }

  function modelFromLocation() {
    return new URLSearchParams(window.location.search).get("model");
  }

  function updateGenerateButton() {
    const canGenerate = Boolean(studioModels[activeModelId]?.canGenerate);
    generateButton.disabled = !canGenerate || !prompt.value.trim() || generationInFlight || creditInsufficient;
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
    referenceLabel.textContent = model.canGenerate ? "Reference image" : "Reference files";
    referenceMeta.textContent = model.canGenerate ? "Optional · enables image-to-image" : model.type === "video" ? "Image · Video · Audio" : "Reference images";
    uploadTitle.textContent = model.canGenerate ? "Choose a reference image" : "Drop or choose reference media";
    uploadHint.textContent = model.canGenerate ? "PNG, JPEG or WebP · max 10 MB" : "Interface preview only—files are not uploaded";
    uploadBox.classList.toggle("is-enabled", Boolean(model.canGenerate));
    modeGroup.hidden = Boolean(model.canGenerate);
    videoSettings.hidden = model.type !== "video";
    imageSettings.hidden = model.type !== "image";
    generateButtonLabel.textContent = model.canGenerate ? imageGenerationLabel() : "Generation coming soon";
    generationStatus.textContent = "";
    generationStatus.className = "generation-status";
    updateGenerateButton();
    if (syncUrl && modelFromLocation() !== normalizedModelId) {
      history.pushState({ model: normalizedModelId }, "", buildModelUrl(window.location.href, normalizedModelId));
    }
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
  }

  function clearReferenceImage() {
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

  function setReferenceImage(file) {
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
    referencePreviewUrl = URL.createObjectURL(file);
    referencePreviewImage.src = referencePreviewUrl;
    referenceFileName.textContent = file.name;
    referencePreview.hidden = false;
    generationStatus.textContent = "Reference image ready.";
    generationStatus.className = "generation-status";
  }

  const creditSummaryController = createCreditSummaryController({
    container: creditSummary,
    costElement: generationCreditCost,
    currentBalanceElement: currentCreditBalance,
    quantityControl: imageQuantity,
    onChange: (summary) => {
      creditInsufficient = summary.insufficient;
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
    generateButtonLabel.textContent = imageGenerationLabel();
  });
  listen(uploadBox, "click", () => {
    if (studioModels[activeModelId]?.canGenerate) referenceInput.click();
  });
  listen(referenceInput, "change", () => setReferenceImage(referenceInput.files?.[0]));
  listen(referenceClear, "click", clearReferenceImage);
  listen(generateButton, "click", async () => {
    if (generateButton.disabled) return;
    generationInFlight = true;
    updateGenerateButton();
    generateButtonLabel.textContent = "Generating…";
    generationStatus.textContent = referenceFile ? "Editing from your reference image…" : "Creating an image from your prompt…";
    generationStatus.className = "generation-status is-working";
    resultCard.hidden = true;
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
        generationInFlight = false;
        generateButtonLabel.textContent = studioModels[activeModelId]?.canGenerate ? imageGenerationLabel() : "Generation coming soon";
        updateGenerateButton();
      }
    }
  });
  document.querySelectorAll(".segmented button").forEach((button) => listen(button, "click", () => {
    button.parentElement.querySelectorAll("button").forEach((item) => item.classList.toggle("is-selected", item === button));
  }));
  listen(sidebarOpen, "click", () => sidebar.classList.add("is-open"));
  listen(sidebarClose, "click", () => sidebar.classList.remove("is-open"));

  return () => {
    if (destroyed) return;
    destroyed = true;
    creditSummaryController.destroy();
    exampleCarouselController.destroy();
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
