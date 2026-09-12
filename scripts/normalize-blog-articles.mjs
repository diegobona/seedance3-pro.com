import fs from "fs/promises";
import path from "path";
import { normalizeBlogArticleDocument } from "./article-html.mjs";

const rootDir = process.cwd();
const blogHtml = await fs.readFile(path.join(rootDir, "blog.html"), "utf8");
const postBlock = blogHtml.match(/<!-- BLOG_POSTS_START -->([\s\S]*?)<!-- BLOG_POSTS_END -->/i)?.[1] || "";
const articleNames = [...postBlock.matchAll(/href="\.\/([^\"]+\.html)"/gi)].map((match) => match[1]);
const changed = [];

for (const articleName of articleNames) {
  const filePath = path.join(rootDir, articleName);
  const html = await fs.readFile(filePath, "utf8");
  const normalized = normalizeBlogArticleDocument(html);
  if (normalized === html) continue;
  await fs.writeFile(filePath, normalized, "utf8");
  changed.push(articleName);
}

process.stdout.write(JSON.stringify({ changedCount: changed.length, changed }));
