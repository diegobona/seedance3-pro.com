import fs from "fs/promises";
import path from "path";

const rootDir = process.cwd();
const blogPath = path.join(rootDir, "blog.html");
const sitemapPath = path.join(rootDir, "sitemap.xml");

const startTag = "<!-- BLOG_POSTS_START -->";
const endTag = "<!-- BLOG_POSTS_END -->";

const blogHtml = await fs.readFile(blogPath, "utf8");
const startIndex = blogHtml.indexOf(startTag);
const endIndex = blogHtml.indexOf(endTag);
if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
  throw new Error("Blog marker block is missing in blog.html");
}

const blockStart = startIndex + startTag.length;
const before = blogHtml.slice(0, blockStart);
const middle = blogHtml.slice(blockStart, endIndex);
const after = blogHtml.slice(endIndex);

const articleBlocks = middle.match(/<article[\s\S]*?<\/article>/g) || [];
const seenTitles = new Set();
const seenHrefs = new Set();
const kept = [];
const removed = [];

for (const block of articleBlocks) {
  const hrefMatch = block.match(/href="\.\/([^"]+\.html)"/i);
  const titleMatch = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const href = hrefMatch ? hrefMatch[1].trim() : "";
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim().toLowerCase() : "";
  const key = `${title}|||${href}`;
  if (!href || !title) {
    kept.push(block);
    continue;
  }
  if (seenTitles.has(title) || seenHrefs.has(href) || seenTitles.has(key)) {
    removed.push({ href, title, block });
    continue;
  }
  seenTitles.add(title);
  seenHrefs.add(href);
  seenTitles.add(key);
  kept.push(block);
}

const normalizedMiddle = `\n${kept.join("\n\n")}\n`;
await fs.writeFile(blogPath, `${before}${normalizedMiddle}${after}`, "utf8");

const keepHrefSet = new Set();
for (const block of kept) {
  const hrefMatch = block.match(/href="\.\/([^"]+\.html)"/i);
  if (hrefMatch) {
    keepHrefSet.add(hrefMatch[1].trim());
  }
}

const removedHrefSet = new Set(removed.map((item) => item.href).filter(Boolean));
for (const href of keepHrefSet) {
  removedHrefSet.delete(href);
}

const corePages = new Set([
  "index.html",
  "features.html",
  "showcase.html",
  "pricing.html",
  "faq.html",
  "blog.html",
  "seedance-2-0-complete-tutorial.html",
  "seedance-vs-kling-3-comparison.html",
  "seedance-tiktok-ad-video-guide.html"
]);

const sitemapXml = await fs.readFile(sitemapPath, "utf8");
const urlBlocks = sitemapXml.match(/<url>[\s\S]*?<\/url>/g) || [];
const keptUrlBlocks = [];
const seenLocs = new Set();

for (const urlBlock of urlBlocks) {
  const locMatch = urlBlock.match(/<loc>(.*?)<\/loc>/i);
  if (!locMatch) {
    keptUrlBlocks.push(urlBlock);
    continue;
  }
  const loc = locMatch[1].trim();
  if (seenLocs.has(loc)) {
    continue;
  }
  seenLocs.add(loc);
  let pathName = "";
  try {
    const u = new URL(loc);
    pathName = u.pathname.replace(/^\//, "");
  } catch {
    keptUrlBlocks.push(urlBlock);
    continue;
  }
  if (!pathName) {
    keptUrlBlocks.push(urlBlock);
    continue;
  }
  if (corePages.has(pathName) || keepHrefSet.has(pathName)) {
    keptUrlBlocks.push(urlBlock);
    continue;
  }
  if (!removedHrefSet.has(pathName)) {
    const ext = path.extname(pathName).toLowerCase();
    if (ext !== ".html") {
      keptUrlBlocks.push(urlBlock);
    }
  }
}

const sitemapOutput = `${sitemapXml.slice(0, sitemapXml.indexOf("<url>"))}${keptUrlBlocks.join("\n")}\n</urlset>\n`;
await fs.writeFile(sitemapPath, sitemapOutput, "utf8");

let deletedCount = 0;
for (const href of removedHrefSet) {
  const filePath = path.join(rootDir, href);
  try {
    await fs.unlink(filePath);
    deletedCount += 1;
  } catch {
  }
}

process.stdout.write(JSON.stringify({
  totalCards: articleBlocks.length,
  keptCards: kept.length,
  removedCards: removed.length,
  removedFilesDeleted: deletedCount
}));
