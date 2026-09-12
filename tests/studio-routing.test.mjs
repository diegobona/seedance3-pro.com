import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("studio model URLs use the selected model while preserving other URL state", async () => {
  const { buildModelUrl, normalizeModelId } = await import("../app/model-routing.mjs");
  const available = new Set(["minimax-h3", "seedance-3", "nano-banana-2-lite", "gpt-image-2"]);

  assert.equal(normalizeModelId("nano-banana-2-lite", available), "nano-banana-2-lite");
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
