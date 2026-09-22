import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const projectDir = path.resolve("media/pose-demo");
const framesDir = path.join(projectDir, "renders", "frames");
const fps = 30;
const duration = 15.4;
const frameCount = Math.ceil(duration * fps);

function findPlaywrightModule() {
  const npxRoot = path.join(process.env.LOCALAPPDATA || "", "npm-cache", "_npx");
  for (const entry of fs.readdirSync(npxRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(npxRoot, entry.name, "node_modules", "playwright", "index.mjs");
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("Playwright was not found in the npm cache. Run `npx playwright --version` first.");
}

const { chromium } = await import(pathToFileURL(findPlaywrightModule()).href);
fs.mkdirSync(framesDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});

const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
});

await page.addInitScript(() => {
  window.__timelines = {};
});

await page.goto("http://localhost:4310/media/pose-demo/index.html", {
  waitUntil: "networkidle",
  timeout: 120000,
});

await page.waitForFunction(() => {
  const video = document.querySelector("#pose-workflow-footage");
  return window.__timelines?.["pose-reference-demo"] && video?.readyState >= 2;
});

for (let frame = 0; frame < frameCount; frame += 1) {
  const time = frame / fps;
  await page.evaluate(async ({ time }) => {
    const video = document.querySelector("#pose-workflow-footage");
    const timeline = window.__timelines["pose-reference-demo"];
    const mediaTime = 4.2 + time;

    timeline.pause().seek(time, false);
    video.pause();

    if (Math.abs(video.currentTime - mediaTime) > 0.001) {
      await new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error(`Timed out seeking to ${mediaTime}`)), 10000);
        video.addEventListener("seeked", () => {
          window.clearTimeout(timeout);
          resolve();
        }, { once: true });
        video.currentTime = mediaTime;
      });
    }

    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, { time });

  const filename = `frame-${String(frame + 1).padStart(4, "0")}.jpg`;
  await page.screenshot({
    path: path.join(framesDir, filename),
    type: "jpeg",
    quality: 92,
    clip: { x: 0, y: 0, width: 1920, height: 1080 },
  });

  if ((frame + 1) % 60 === 0 || frame + 1 === frameCount) {
    console.log(`Captured ${frame + 1}/${frameCount} frames`);
  }
}

await browser.close();
