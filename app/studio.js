import { buildModelUrl, normalizeModelId } from "./model-routing.mjs";

const studioModels = {
  "minimax-h3": {
    category: "AI VIDEO / MULTIMODAL",
    name: "MiniMax H3",
    description: "Text, image, video, and audio context with native stereo sound.",
    status: "Featured guide",
    symbol: "H3",
    tone: "cyan",
    contextTitle: "MiniMax H3 is available from its official provider.",
    contextCopy: "This independent site currently offers a workflow preview and research guide only. It does not send API requests.",
    contextLink: "../minimax-h3-ai-video-generator.html",
    contextLabel: "Read the MiniMax H3 guide →",
    exampleTitle: "Cinematic product reveal",
    examplePrompt: "A slow orbital camera, controlled reflections, native room tone, and a clean final composition.",
    type: "video"
  },
  "seedance-3": {
    category: "AI VIDEO / RELEASE TRACKER",
    name: "SEEDANCE 3.0",
    description: "Upcoming AI video workflow with final capabilities awaiting confirmation.",
    status: "Coming Soon",
    symbol: "S3",
    tone: "lime",
    contextTitle: "SEEDANCE 3.0 is marked Coming Soon.",
    contextCopy: "The interface is ready for exploration, but generation will remain disabled until official access and supported specifications are verified.",
    contextLink: "../#status",
    contextLabel: "View release status →",
    exampleTitle: "Reference-led story scene",
    examplePrompt: "Plan character identity, camera movement, pacing, and sound as distinct reference roles.",
    type: "video"
  },
  "nano-banana-2-lite": {
    category: "AI IMAGE / FAST DRAFTS",
    name: "Nano Banana 2 Lite",
    description: "Speed-focused image generation for rapid ideation and high-throughput workflows.",
    status: "Image guide",
    symbol: "NB",
    tone: "violet",
    contextTitle: "Nano Banana 2 Lite prioritizes fast visual iteration.",
    contextCopy: "Use the public guide to plan short draft-and-refine cycles. This studio preview does not send images to an external model.",
    contextLink: "../nano-banana-2-lite.html",
    contextLabel: "Read the image workflow guide →",
    exampleTitle: "Fast campaign variants",
    examplePrompt: "Lock composition and product identity, then vary one background, palette, or crop at a time.",
    type: "image"
  },
  "gpt-image-2": {
    category: "AI IMAGE / GENERATE & EDIT",
    name: "GPT Image 2",
    description: "High-quality image generation and editing with precise creative instructions.",
    status: "Image guide",
    symbol: "G2",
    tone: "orange",
    contextTitle: "GPT Image 2 supports generation and controlled editing.",
    contextCopy: "Preview the planned controls, then use the public guide for prompt structures that preserve what should not change.",
    contextLink: "../gpt-image-2.html",
    contextLabel: "Read the GPT Image 2 guide →",
    exampleTitle: "Brand-ready layout",
    examplePrompt: "Specify format, hierarchy, exact copy, safe areas, and the visual elements that must remain unchanged.",
    type: "image"
  }
};

const modelButtons = document.querySelectorAll(".model-button[data-model]");
const modelName = document.getElementById("model-name");
const modelCategory = document.getElementById("model-category");
const modelDescription = document.getElementById("model-description");
const modelStatus = document.getElementById("model-status");
const selectedName = document.getElementById("selected-name");
const selectedSymbol = document.getElementById("selected-symbol");
const contextTitle = document.getElementById("context-title");
const contextCopy = document.getElementById("context-copy");
const contextLink = document.getElementById("context-link");
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
  modelDescription.textContent = model.description;
  modelStatus.textContent = model.status;
  selectedName.textContent = model.name;
  selectedSymbol.textContent = model.symbol;
  selectedSymbol.className = `model-symbol ${model.tone}`;
  contextTitle.textContent = model.contextTitle;
  contextCopy.textContent = model.contextCopy;
  contextLink.href = model.contextLink;
  contextLink.textContent = model.contextLabel;
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
