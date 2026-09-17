import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("studio model URLs use the selected model while preserving other URL state", async () => {
  const { buildModelUrl, normalizeModelId } = await import("../app/model-routing.mjs");
  const available = new Set(["minimax-h3", "seedance-3", "pose-to-image", "nano-banana-2-lite", "gpt-image-2"]);

  assert.equal(normalizeModelId("nano-banana-2-lite", available), "nano-banana-2-lite");
  assert.equal(normalizeModelId("pose-to-image", available), "pose-to-image");
  assert.equal(normalizeModelId("unknown", available), "minimax-h3");
  assert.equal(
    buildModelUrl("https://www.seedance3-pro.com/app/?model=minimax-h3&ref=showcase#editor", "gpt-image-2"),
    "/app/?model=gpt-image-2&ref=showcase#editor"
  );
});

test("studio clicks push model URLs and browser history restores model state", () => {
  const html = readFileSync(resolve(root, "app", "index.html"), "utf8");
  const script = readFileSync(resolve(root, "app", "studio.js"), "utf8");

  assert.match(html, /<script type="module" src="\.\/studio\.js"><\/script>/i);
  assert.match(script, /history\.pushState\([^;]+buildModelUrl\(window\.location\.href,\s*normalizedModelId\)/i);
  assert.match(script, /modelButtons\.forEach\([\s\S]*selectModel\(button\.dataset\.model,\s*\{\s*syncUrl:\s*true\s*\}\)/i);
  assert.match(script, /window\.addEventListener\("popstate",[\s\S]*selectModel\(modelFromLocation\(\)\)/i);
});

test("pose to image is a signature workflow above the image model list", () => {
  const html = readFileSync(resolve(root, "app", "index.html"), "utf8");
  const script = readFileSync(resolve(root, "app", "studio.js"), "utf8");
  const css = readFileSync(resolve(root, "app", "studio.css"), "utf8");

  const poseEntry = html.indexOf('data-model="pose-to-image"');
  const imageModelsHeading = html.indexOf("IMAGE MODELS");

  assert.ok(poseEntry >= 0, "expected a Pose to Image navigation entry");
  assert.ok(imageModelsHeading > poseEntry, "expected Pose to Image before the image model list");
  assert.match(html, /<div class="section-heading"><span>AI IMAGE<\/span><\/div>/i);
  assert.match(html, /<div class="section-heading image-models-heading"><span>IMAGE MODELS<\/span><span>02<\/span><\/div>/i);
  assert.match(html, /class="model-button pose-workflow-button"[^>]+data-model="pose-to-image"/i);
  assert.match(html, /Pose to Image/i);
  assert.match(html, /Build poses in 3D/i);
  assert.match(html, /Signature/i);
  assert.match(html, /Open Pose Studio/i);
  assert.match(script, /"pose-to-image"\s*:\s*\{[\s\S]*?name:\s*"Pose to Image"[\s\S]*?type:\s*"image"[\s\S]*?\}/i);
  assert.match(css, /\.pose-workflow-button\s*\{/i);
  assert.match(css, /\.settings-grid\[hidden\]\s*\{\s*display:\s*none/i);
});

test("GPT Image 2 exposes first-party text and reference-image generation controls", () => {
  const html = readFileSync(resolve(root, "app", "index.html"), "utf8");
  const script = readFileSync(resolve(root, "app", "studio.js"), "utf8");
  const clientPath = resolve(root, "app", "image-generation.mjs");
  assert.ok(existsSync(clientPath), "expected app/image-generation.mjs");
  const client = readFileSync(clientPath, "utf8");

  assert.match(html, /<input[^>]+id="reference-input"[^>]+type="file"[^>]+accept="image\/png,image\/jpeg,image\/webp"/i);
  assert.match(html, /id="generation-status"/i);
  assert.match(html, /id="result-card"[^>]+hidden/i);
  assert.match(html, /id="result-image"/i);
  assert.match(html, /id="result-link"/i);
  assert.match(html, /class="generate-button"[^>]+id="generate-button"[^>]*>[\s\S]*id="generate-button-label"/i);
  assert.match(script, /import\s+\{\s*requestImageGeneration\s*\}\s+from\s+"\.\/image-generation\.mjs"/i);
  assert.match(script, /"gpt-image-2"\s*:\s*\{[\s\S]*?canGenerate:\s*true/i);
  assert.match(script, /generateButtonLabel\.textContent\s*=\s*model\.canGenerate\s*\?\s*"Generate image"/i);
  assert.match(client, /fetchImpl\("\/api\/images\/generate"/i);
  assert.doesNotMatch(`${html}\n${script}\n${client}`, /TUZI_API_KEY|Bearer\s+[A-Za-z0-9_-]{8,}/i);
});

test("studio initializes prompt controls before selecting the initial model", () => {
  const script = readFileSync(resolve(root, "app", "studio.js"), "utf8");
  const promptInitialization = script.indexOf('const prompt = document.getElementById("studio-prompt")');
  const initialModelSelection = script.indexOf("selectModel(modelFromLocation())");

  assert.ok(promptInitialization >= 0, "expected prompt initialization");
  assert.ok(initialModelSelection > promptInitialization, "prompt must exist before selectModel updates the generate button");
});
