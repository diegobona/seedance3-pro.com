import { buildModelUrl, normalizeModelId } from "./model-routing.mjs";
import { requestImageGeneration } from "./image-generation.mjs";

const studioModels = {
  "minimax-h3": {
    category: "AI VIDEO / MULTIMODAL",
    name: "MiniMax H3",
    status: "Featured guide",
    symbol: "H3",
    tone: "cyan",
    contextTitle: "MiniMax H3 is available from its official provider.",
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
    contextTitle: "SEEDANCE 3.0 is marked Coming Soon.",
    exampleTitle: "Reference-led story scene",
    examplePrompt: "Plan character identity, camera movement, pacing, and sound as distinct reference roles.",
    type: "video"
  },
  "pose-to-image": {
    category: "AI IMAGE / POSE CONTROL",
    name: "Pose to Image",
    status: "Signature workflow",
    symbol: "P3",
    tone: "lime",
    contextTitle: "Build the pose in 3D. Generate the shot you imagined.",
    exampleTitle: "Pose-first character image",
    examplePrompt: "Shape the body language and camera angle first, then describe the character, scene, lighting, and visual style.",
    type: "image"
  },
  "nano-banana-2-lite": {
    category: "AI IMAGE / FAST DRAFTS",
    name: "Nano Banana 2 Lite",
    status: "Image guide",
    symbol: "NB",
    tone: "violet",
    contextTitle: "Nano Banana 2 Lite prioritizes fast visual iteration.",
    exampleTitle: "Fast campaign variants",
    examplePrompt: "Lock composition and product identity, then vary one background, palette, or crop at a time.",
    type: "image"
  },
  "gpt-image-2": {
    category: "AI IMAGE / GENERATE & EDIT",
    name: "GPT Image 2",
    status: "Image guide",
    symbol: "G2",
    tone: "orange",
    contextTitle: "GPT Image 2 supports generation and controlled editing.",
    exampleTitle: "Brand-ready layout",
    examplePrompt: "Specify format, hierarchy, exact copy, safe areas, and the visual elements that must remain unchanged.",
    type: "image",
    canGenerate: true
  }
};

const modelButtons = document.querySelectorAll(".model-button[data-model]");
const modelName = document.getElementById("model-name");
const modelCategory = document.getElementById("model-category");
const modelStatus = document.getElementById("model-status");
const selectedName = document.getElementById("selected-name");
const selectedSymbol = document.getElementById("selected-symbol");
const contextTitle = document.getElementById("context-title");
const exampleTitle = document.getElementById("example-title");
const examplePrompt = document.getElementById("example-prompt");
const uploadGroup = document.getElementById("upload-group");
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
const resultImage = document.getElementById("result-image");
const resultLink = document.getElementById("result-link");
const prompt = document.getElementById("studio-prompt");
const promptCount = document.getElementById("prompt-count");
const availableModelIds = new Set(Object.keys(studioModels));
let activeModelId = "minimax-h3";
let referenceFile = null;
let referencePreviewUrl = "";
let generationInFlight = false;

function modelFromLocation() {
  return new URLSearchParams(window.location.search).get("model");
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
  contextTitle.textContent = model.contextTitle;
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
  generateButtonLabel.textContent = model.canGenerate ? "Generate image" : "Generation coming soon";
  generationStatus.textContent = "";
  generationStatus.className = "generation-status";
  updateGenerateButton();
  if (syncUrl && modelFromLocation() !== normalizedModelId) {
    history.pushState({ model: normalizedModelId }, "", buildModelUrl(window.location.href, normalizedModelId));
  }
}

modelButtons.forEach((button) => button.addEventListener("click", () => selectModel(button.dataset.model, { syncUrl: true })));

selectModel(modelFromLocation());
window.addEventListener("popstate", () => selectModel(modelFromLocation()));

prompt.addEventListener("input", () => {
  promptCount.textContent = String(prompt.value.length);
  updateGenerateButton();
});

function updateGenerateButton() {
  const canGenerate = Boolean(studioModels[activeModelId]?.canGenerate);
  generateButton.disabled = !canGenerate || !prompt.value.trim() || generationInFlight;
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

uploadBox.addEventListener("click", () => {
  if (studioModels[activeModelId]?.canGenerate) referenceInput.click();
});
referenceInput.addEventListener("change", () => setReferenceImage(referenceInput.files?.[0]));
referenceClear.addEventListener("click", clearReferenceImage);

generateButton.addEventListener("click", async () => {
  if (generateButton.disabled) return;
  generationInFlight = true;
  updateGenerateButton();
  generateButtonLabel.textContent = "Generating…";
  generationStatus.textContent = referenceFile ? "Editing from your reference image…" : "Creating an image from your prompt…";
  generationStatus.className = "generation-status is-working";
  resultCard.hidden = true;
  try {
    const result = await requestImageGeneration({ prompt: prompt.value, referenceFile });
    const source = result.image.url || result.image.dataUrl;
    resultImage.src = source;
    resultLink.href = source;
    if (result.image.dataUrl) {
      resultLink.setAttribute("download", "gpt-image-2.png");
      resultLink.textContent = "Download image →";
    } else {
      resultLink.removeAttribute("download");
      resultLink.textContent = "Open / save original →";
    }
    resultCard.hidden = false;
    generationStatus.textContent = "Image generated.";
    generationStatus.className = "generation-status is-success";
  } catch (error) {
    if (error?.status === 401 || error?.code === "AUTH_REQUIRED") {
      window.dispatchEvent(new CustomEvent("seedance:auth-required"));
    }
    generationStatus.textContent = String(error?.message || "Image generation failed.");
    generationStatus.className = "generation-status is-error";
  } finally {
    generationInFlight = false;
    generateButtonLabel.textContent = "Generate image";
    updateGenerateButton();
  }
});

document.querySelectorAll(".segmented button").forEach((button) => button.addEventListener("click", () => {
  button.parentElement.querySelectorAll("button").forEach((item) => item.classList.toggle("is-selected", item === button));
}));

const sidebar = document.getElementById("studio-sidebar");
document.querySelector(".sidebar-open").addEventListener("click", () => sidebar.classList.add("is-open"));
document.querySelector(".sidebar-close").addEventListener("click", () => sidebar.classList.remove("is-open"));
