import fs from "fs/promises";
import path from "path";

const rootDir = process.cwd();
const blogPath = path.join(rootDir, "blog.html");
const sitemapPath = path.join(rootDir, "sitemap.xml");
const siteBaseUrl = "https://seedance3-pro.com";
const startTag = "<!-- BLOG_POSTS_START -->";
const endTag = "<!-- BLOG_POSTS_END -->";

function cardDetails(block, index) {
  const href = block.match(/href="\.\/([^"]+\.html)"/i)?.[1]?.trim() || "";
  const title = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1]?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() || "";
  return { block, href, index, normalizedTitle: title.toLowerCase() };
}

function choosePrimary(items) {
  return [...items].sort((a, b) => a.href.length - b.href.length || a.index - b.index)[0];
}

function buildAliasHtml(aliasFile, primaryFile) {
  const primaryUrl = `${siteBaseUrl}/${primaryFile}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Article moved | SEEDANCE Blog</title>
  <meta name="robots" content="noindex,follow">
  <link rel="canonical" href="${primaryUrl}">
  <meta http-equiv="refresh" content="0; url=./${primaryFile}">
</head>
<body>
  <main>
    <h1>Article moved</h1>
    <p>This guide now has one canonical URL. <a href="./${primaryFile}">Read the Seedance API guide</a>.</p>
  </main>
  <script>location.replace("./${primaryFile}" + location.search + location.hash);</script>
</body>
</html>
<!-- Compatibility alias: ${aliasFile} -->
`;
}

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
const cards = (middle.match(/<article[\s\S]*?<\/article>/g) || []).map(cardDetails);
const groups = new Map();

for (const card of cards) {
  if (!card.href || !card.normalizedTitle) continue;
  const group = groups.get(card.normalizedTitle) || [];
  group.push(card);
  groups.set(card.normalizedTitle, group);
}

const keptIndexes = new Set(cards.map((card) => card.index));
const aliases = [];
for (const group of groups.values()) {
  if (group.length < 2) continue;
  const primary = choosePrimary(group);
  for (const card of group) {
    if (card.index === primary.index) continue;
    keptIndexes.delete(card.index);
    if (card.href !== primary.href) aliases.push({ alias: card.href, primary: primary.href });
  }
}

const keptCards = cards.filter((card) => keptIndexes.has(card.index));
await fs.writeFile(blogPath, `${before}\n${keptCards.map((card) => card.block).join("\n\n")}\n${after}`, "utf8");

const aliasPaths = new Set(aliases.map(({ alias }) => alias));
const primaryPaths = new Set(aliases.map(({ primary }) => primary));
const sitemapXml = await fs.readFile(sitemapPath, "utf8");
const urlBlocks = sitemapXml.match(/<url>[\s\S]*?<\/url>/g) || [];
const seenLocations = new Set();
const keptUrlBlocks = [];

for (const block of urlBlocks) {
  const location = block.match(/<loc>(.*?)<\/loc>/i)?.[1]?.trim() || "";
  if (!location || seenLocations.has(location)) continue;
  const pathname = new URL(location).pathname.replace(/^\//, "");
  if (aliasPaths.has(pathname)) continue;
  seenLocations.add(location);
  keptUrlBlocks.push(block);
}

for (const primary of primaryPaths) {
  const location = `${siteBaseUrl}/${primary}`;
  if (seenLocations.has(location)) continue;
  keptUrlBlocks.push(`  <url>\n    <loc>${location}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
  seenLocations.add(location);
}

const sitemapPrefix = sitemapXml.slice(0, sitemapXml.indexOf("<url>"));
await fs.writeFile(sitemapPath, `${sitemapPrefix}${keptUrlBlocks.join("\n")}\n</urlset>\n`, "utf8");

for (const { alias, primary } of aliases) {
  await fs.writeFile(path.join(rootDir, alias), buildAliasHtml(alias, primary), "utf8");
}

process.stdout.write(JSON.stringify({
  totalCards: cards.length,
  keptCards: keptCards.length,
  removedCards: cards.length - keptCards.length,
  aliases
}));
