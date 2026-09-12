import fs from "fs/promises";
import path from "path";
import { normalizeArticleDocument } from "./article-html.mjs";

const rootDir = process.cwd();
const entries = await fs.readdir(rootDir, { withFileTypes: true });
const changed = [];

for (const entry of entries) {
  if (!entry.isFile() || !entry.name.endsWith(".html")) continue;
  const filePath = path.join(rootDir, entry.name);
  const html = await fs.readFile(filePath, "utf8");
  if (!/<meta property="og:type" content="article">/i.test(html)) continue;
  const normalized = normalizeArticleDocument(html);
  if (normalized === html) continue;
  await fs.writeFile(filePath, normalized, "utf8");
  changed.push(entry.name);
}

process.stdout.write(JSON.stringify({ changedCount: changed.length, changed }));
