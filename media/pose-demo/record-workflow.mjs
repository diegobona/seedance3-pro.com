import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const projectDir = path.resolve("media/pose-demo");
const recordingsDir = path.join(projectDir, "recordings");
const rawDir = path.join(recordingsDir, "raw");
const snapshotOnly = process.argv.includes("--snapshot");

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
fs.mkdirSync(rawDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--use-angle=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
  ...(snapshotOnly ? {} : { recordVideo: { dir: rawDir, size: { width: 1920, height: 1080 } } }),
});

const page = await context.newPage();
const video = page.video();
await page.goto("http://localhost:4310/app?model=pose-to-image", {
  waitUntil: "domcontentloaded",
  timeout: 120000,
});
await page.waitForFunction(() => document.querySelector("#pose-canvas")?.dataset.ragdollHandleCount === "13");
await page.waitForSelector("#pose-canvas-loading", { state: "hidden" });
await page.waitForTimeout(1300);

await page.addStyleTag({
  content: `
    #demo-pointer {
      position: fixed;
      z-index: 2147483647;
      left: 960px;
      top: 940px;
      width: 24px;
      height: 24px;
      border: 3px solid #090a0c;
      border-radius: 999px;
      background: #d8ff73;
      box-shadow: 0 0 0 6px rgba(216,255,115,.18), 0 8px 28px rgba(0,0,0,.55);
      pointer-events: none;
      transition-property: left, top;
      transition-timing-function: cubic-bezier(.22,.72,.18,1);
    }
    #demo-pointer::after {
      content: "";
      position: absolute;
      inset: -13px;
      border: 2px solid rgba(216,255,115,.65);
      border-radius: inherit;
      opacity: 0;
    }
    #demo-pointer.is-clicking::after { animation: demo-pointer-click .48s ease-out; }
    @keyframes demo-pointer-click {
      0% { opacity: .9; transform: scale(.45); }
      100% { opacity: 0; transform: scale(1.35); }
    }
  `,
});
await page.evaluate(() => {
  const pointer = document.createElement("div");
  pointer.id = "demo-pointer";
  document.body.append(pointer);
});

async function movePointer(x, y, duration = 700) {
  await page.evaluate(({ x, y, duration }) => {
    const pointer = document.querySelector("#demo-pointer");
    pointer.style.transitionDuration = `${duration}ms`;
    pointer.style.left = `${x - 12}px`;
    pointer.style.top = `${y - 12}px`;
  }, { x, y, duration });
  await page.mouse.move(x, y, { steps: Math.max(10, Math.round(duration / 30)) });
  await page.waitForTimeout(duration + 100);
}

async function clickPointer() {
  await page.evaluate(() => {
    const pointer = document.querySelector("#demo-pointer");
    pointer.classList.remove("is-clicking");
    void pointer.offsetWidth;
    pointer.classList.add("is-clicking");
  });
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.up();
  await page.waitForTimeout(500);
}

const joggingButton = page.locator('[data-pose-preset="jogging"]');
const joggingBox = await joggingButton.boundingBox();
if (!joggingBox) throw new Error("Jogging preset is not visible.");
await movePointer(joggingBox.x + joggingBox.width / 2, joggingBox.y + joggingBox.height / 2, 900);
await clickPointer();
await page.waitForTimeout(1000);

if (snapshotOnly) {
  await page.screenshot({ path: path.join(recordingsDir, "jogging-state.png") });
  await context.close();
  await browser.close();
  process.exit(0);
}

const canvas = page.locator("#pose-canvas");
const canvasBox = await canvas.boundingBox();
if (!canvasBox) throw new Error("Pose canvas is not visible.");

// Jogging preset: the forward wrist sits just right of the mannequin's chest.
const wristStart = {
  x: canvasBox.x + canvasBox.width * 0.58,
  y: canvasBox.y + canvasBox.height * 0.30,
};
const wristEnd = {
  x: wristStart.x + 86,
  y: wristStart.y - 64,
};
await movePointer(wristStart.x, wristStart.y, 850);
await page.mouse.down();
await page.evaluate(() => document.querySelector("#demo-pointer")?.classList.add("is-clicking"));
for (let step = 1; step <= 36; step += 1) {
  const progress = step / 36;
  const eased = 1 - Math.pow(1 - progress, 3);
  const x = wristStart.x + (wristEnd.x - wristStart.x) * eased;
  const y = wristStart.y + (wristEnd.y - wristStart.y) * eased;
  await page.mouse.move(x, y);
  await page.evaluate(({ x, y }) => {
    const pointer = document.querySelector("#demo-pointer");
    pointer.style.transitionDuration = "0ms";
    pointer.style.left = `${x - 12}px`;
    pointer.style.top = `${y - 12}px`;
  }, { x, y });
  await page.waitForTimeout(25);
}
await page.mouse.up();
await page.waitForTimeout(950);

const usePoseButton = page.locator('[data-pose-action="use"]');
const usePoseBox = await usePoseButton.boundingBox();
if (!usePoseBox) throw new Error("Use this pose button is not visible.");
await movePointer(usePoseBox.x + usePoseBox.width / 2, usePoseBox.y + usePoseBox.height / 2, 1000);
await clickPointer();
await page.waitForSelector("#reference-preview", { state: "visible" });
await page.waitForFunction(() => document.querySelector("#selected-name")?.textContent?.trim() === "GPT Image 2");
await page.waitForTimeout(2600);

await context.close();
await browser.close();

if (video) {
  const sourcePath = await video.path();
  fs.copyFileSync(sourcePath, path.join(recordingsDir, "pose-workflow.webm"));
}
