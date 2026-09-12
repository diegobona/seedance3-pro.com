import { buildModelUrl, normalizeModelId } from "./model-routing.mjs";

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
    type: "image"
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
const videoSettings = document.getElementById("video-settings");
const imageSettings = document.getElementById("image-settings");
const availableModelIds = new Set(Object.keys(studioModels));

function modelFromLocation() {
  return new URLSearchParams(window.location.search).get("model");
}

function selectModel(modelId, { syncUrl = false } = {}) {
  const normalizedModelId = normalizeModelId(modelId, availableModelIds);
  const model = studioModels[normalizedModelId];
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
  uploadGroup.querySelector(".label-line span").textContent = model.type === "video" ? "Image · Video · Audio" : "Reference images";
  videoSettings.hidden = model.type !== "video";
  imageSettings.hidden = model.type !== "image";
  if (syncUrl && modelFromLocation() !== normalizedModelId) {
    history.pushState({ model: normalizedModelId }, "", buildModelUrl(window.location.href, normalizedModelId));
  }
}

modelButtons.forEach((button) => button.addEventListener("click", () => selectModel(button.dataset.model, { syncUrl: true })));

selectModel(modelFromLocation());
window.addEventListener("popstate", () => selectModel(modelFromLocation()));

const prompt = document.getElementById("studio-prompt");
const promptCount = document.getElementById("prompt-count");
prompt.addEventListener("input", () => { promptCount.textContent = String(prompt.value.length); });

document.querySelectorAll(".segmented button").forEach((button) => button.addEventListener("click", () => {
  button.parentElement.querySelectorAll("button").forEach((item) => item.classList.toggle("is-selected", item === button));
}));

const sidebar = document.getElementById("studio-sidebar");
document.querySelector(".sidebar-open").addEventListener("click", () => sidebar.classList.add("is-open"));
document.querySelector(".sidebar-close").addEventListener("click", () => sidebar.classList.remove("is-open"));
