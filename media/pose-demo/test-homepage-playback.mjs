import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function findPlaywrightModule() {
  const npxRoot = path.join(process.env.LOCALAPPDATA || "", "npm-cache", "_npx");
  for (const entry of fs.readdirSync(npxRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(npxRoot, entry.name, "node_modules", "playwright", "index.mjs");
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("Playwright was not found in the npm cache.");
}

const { chromium } = await import(pathToFileURL(findPlaywrightModule()).href);
const clickFallback = process.argv.includes("--click");
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--autoplay-policy=no-user-gesture-required"],
});

const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  reducedMotion: clickFallback ? "reduce" : "no-preference",
});

try {
  await page.goto("http://localhost:4310/", { waitUntil: "networkidle", timeout: 30000 });
  const playButton = page.locator("[data-pose-demo-play]");
  await playButton.scrollIntoViewIfNeeded();
  if (clickFallback) await playButton.click();
  await page.waitForFunction(() => document.querySelector("[data-pose-demo]")?.currentTime > 0.5, null, { timeout: 5000 });

  const state = await page.locator("[data-pose-demo]").evaluate((video, mode) => ({
    currentSrc: video.currentSrc,
    currentTime: video.currentTime,
    paused: video.paused,
    mode,
  }), clickFallback ? "click" : "autoplay");
  console.log(JSON.stringify(state));
} finally {
  await browser.close();
}
