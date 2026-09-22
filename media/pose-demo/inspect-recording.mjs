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
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const videoPath = path.resolve("media/pose-demo/recordings/pose-workflow.webm");
await page.goto(pathToFileURL(videoPath).href, { waitUntil: "load" });
await page.addStyleTag({ content: "*{box-sizing:border-box}body{margin:0;background:#090a0c;overflow:hidden}video{display:block;width:1920px;height:1080px;object-fit:contain}" });
await page.waitForFunction(() => {
  const video = document.querySelector("video");
  return Number.isFinite(video.duration) && video.videoWidth > 0;
});
const metadata = await page.locator("video").evaluate((video) => ({
  duration: video.duration,
  width: video.videoWidth,
  height: video.videoHeight,
}));
const reviewTimes = [14, 16, 17.5, 18.8, Math.max(0, metadata.duration - 0.15)];
for (const [index, time] of reviewTimes.entries()) {
  await page.locator("video").evaluate((video, target) => new Promise((resolve) => {
    const finish = () => video.requestVideoFrameCallback(() => resolve());
    video.addEventListener("seeked", finish, { once: true });
    video.currentTime = target;
  }), time);
  await page.screenshot({ path: path.resolve(`media/pose-demo/recordings/review-${index + 1}.png`) });
}
console.log(JSON.stringify(metadata));
await browser.close();
