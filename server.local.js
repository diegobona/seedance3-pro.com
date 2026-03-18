import express from "express";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const ROOT_DIR = __dirname;
const BLOG_ASSETS_DIR = path.join(ROOT_DIR, "blog-assets");
const BLOG_HTML_PATH = path.join(ROOT_DIR, "blog.html");
const SITEMAP_PATH = path.join(ROOT_DIR, "sitemap.xml");
const jobs = new Map();
const retryTimers = new Map();

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(express.static(ROOT_DIR, { extensions: ["html"] }));

const upload = multer({ storage: multer.memoryStorage() });

app.get("/admin", (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, "admin", "index.html"));
});

app.post("/api/upload-images", upload.array("images", 12), (req, res) => {
  const files = req.files || [];
  const result = files.map((file) => ({
    name: file.originalname,
    dataUrl: `data:${file.mimetype || "image/png"};base64,${file.buffer.toString("base64")}`
  }));
  res.json({ success: true, files: result });
});

app.post("/api/publish", async (req, res) => {
  const title = String(req.body.title || "").trim();
  const excerpt = String(req.body.excerpt || "").trim();
  const content = String(req.body.content || "").trim();
  const category = String(req.body.category || "Tutorial").trim();

  if (!title || !content) {
    res.status(400).json({ success: false, message: "Title and content are required." });
    return;
  }

  const jobId = crypto.randomUUID();
  jobs.set(jobId, {
    id: jobId,
    status: "pending",
    attempts: 0,
    lastError: "",
    output: null,
    canceled: false
  });

  publishJob(jobId, { title, excerpt, content, category }).catch(() => {});
  res.status(202).json({
    success: true,
    queued: true,
    jobId,
    message: "Publish job created. It will keep retrying until success."
  });
});

app.post("/api/translate-en", async (req, res) => {
  const content = String(req.body.content || "").trim();
  if (!content) {
    res.status(400).json({ success: false, message: "正文为空，无法翻译。" });
    return;
  }
  try {
    const translatedHtml = await translateHtmlToEnglish(content);
    res.json({ success: true, content: translatedHtml });
  } catch (error) {
    const message = String(error?.message || error || "Translate failed");
    if (message.includes("DEEPSEEK_API_KEY")) {
      res.status(400).json({ success: false, message });
      return;
    }
    res.status(500).json({ success: false, message });
  }
});

app.get("/api/job/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    res.status(404).json({ success: false, message: "Job not found." });
    return;
  }
  res.json({
    success: true,
    job: {
      id: job.id,
      status: job.status,
      attempts: job.attempts,
      lastError: job.lastError,
      output: job.output,
      canceled: job.canceled
    }
  });
});

app.get("/api/posts", async (_req, res) => {
  try {
    const posts = await listPublishedPosts();
    res.json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: String(error?.message || error || "Failed to load posts") });
  }
});

app.post("/api/delete-post", async (req, res) => {
  const fileName = String(req.body.fileName || "").trim();
  if (!fileName || !/\.html$/i.test(fileName)) {
    res.status(400).json({ success: false, message: "Invalid fileName." });
    return;
  }
  const jobId = crypto.randomUUID();
  jobs.set(jobId, {
    id: jobId,
    status: "pending",
    attempts: 0,
    lastError: "",
    output: null,
    canceled: false
  });
  deletePostJob(jobId, { fileName }).catch(() => {});
  res.status(202).json({
    success: true,
    queued: true,
    jobId,
    message: "Delete job created. It will keep retrying until success."
  });
});

app.post("/api/cancel-job", async (req, res) => {
  const jobId = String(req.body.jobId || "").trim();
  if (!jobId) {
    res.status(400).json({ success: false, message: "jobId is required." });
    return;
  }
  const job = jobs.get(jobId);
  if (!job) {
    res.status(404).json({ success: false, message: "Job not found." });
    return;
  }
  job.canceled = true;
  job.status = "canceled";
  job.lastError = "Canceled by user";
  clearRetryTimer(jobId);
  res.json({ success: true, message: "Job cancel requested." });
});

async function publishJob(jobId, payload) {
  const job = jobs.get(jobId);
  if (!job) return;
  if (job.canceled) {
    job.status = "canceled";
    return;
  }
  job.status = "running";
  job.attempts += 1;

  try {
    ensureJobActive(job);
    await ensureDir(BLOG_ASSETS_DIR);
    const slugBase = payload.slugBase || (slugify(payload.title) || `post-${Date.now()}`);
    payload.slugBase = slugBase;
    const fileName = payload.fileName || await resolveUniqueHtmlFileName(slugBase);
    payload.fileName = fileName;
    const articleUrl = `https://seedance3-pro.com/${fileName}`;

    const imageRes = await materializeInlineImages(payload.content, slugBase);
    const sanitizedContent = sanitizeArticleHtml(imageRes.content);
    const articleHtml = buildArticleHtml({
      title: payload.title,
      excerpt: payload.excerpt || "New Seedance guide published from CMS.",
      category: payload.category,
      content: sanitizedContent,
      canonical: articleUrl
    });

    await fs.writeFile(path.join(ROOT_DIR, fileName), articleHtml, "utf8");
    await upsertBlogCard({ fileName, title: payload.title, excerpt: payload.excerpt || "New Seedance guide published from CMS.", category: payload.category });
    await upsertSitemap({ fileName });

    ensureJobActive(job);
    const branch = (await runGit(["rev-parse", "--abbrev-ref", "HEAD"])).stdout.trim() || "main";
    await runGit(["add", "."]);
    const commitResult = await runGit(["commit", "-m", `feat-blog-publish-${slugBase}`], true);
    if (!commitResult.ok && !/nothing to commit|no changes added/i.test(commitResult.stderr)) {
      throw new Error(commitResult.stderr || commitResult.stdout || "Git commit failed");
    }
    await pushWithRetry(branch, job);

    job.status = "success";
    job.lastError = "";
    job.output = { articleUrl: `./${fileName}` };
    clearRetryTimer(jobId);
  } catch (error) {
    if (job.canceled || String(error?.message || "").includes("JOB_CANCELED")) {
      job.status = "canceled";
      job.lastError = "Canceled by user";
      clearRetryTimer(jobId);
      return;
    }
    job.status = "pending";
    job.lastError = String(error?.message || error || "Unknown error");
    scheduleRetry(jobId, () => publishJob(jobId, payload));
  }
}

async function deletePostJob(jobId, payload) {
  const job = jobs.get(jobId);
  if (!job) return;
  if (job.canceled) {
    job.status = "canceled";
    return;
  }
  job.status = "running";
  job.attempts += 1;

  try {
    ensureJobActive(job);
    const fileName = payload.fileName;
    const articlePath = path.join(ROOT_DIR, fileName);
    try {
      await fs.unlink(articlePath);
    } catch {
    }

    await removeBlogCardByFileName(fileName);
    await removeSitemapByFileName(fileName);

    const branch = (await runGit(["rev-parse", "--abbrev-ref", "HEAD"])).stdout.trim() || "main";
    await runGit(["add", "."]);
    const slugBase = fileName.replace(/\.html$/i, "");
    const commitResult = await runGit(["commit", "-m", `feat-blog-delete-${slugBase}`], true);
    if (!commitResult.ok && !/nothing to commit|no changes added/i.test(commitResult.stderr)) {
      throw new Error(commitResult.stderr || commitResult.stdout || "Git commit failed");
    }
    await pushWithRetry(branch, job);

    job.status = "success";
    job.lastError = "";
    job.output = { deleted: fileName };
    clearRetryTimer(jobId);
  } catch (error) {
    if (job.canceled || String(error?.message || "").includes("JOB_CANCELED")) {
      job.status = "canceled";
      job.lastError = "Canceled by user";
      clearRetryTimer(jobId);
      return;
    }
    job.status = "pending";
    job.lastError = String(error?.message || error || "Unknown error");
    scheduleRetry(jobId, () => deletePostJob(jobId, payload));
  }
}

async function materializeInlineImages(content, slugBase) {
  let output = content;
  let index = 0;
  const regex = /<img\b([^>]*?)src="(data:image\/[a-zA-Z0-9.+-]+;base64,[^"]+)"([^>]*?)>/g;
  for (const match of content.matchAll(regex)) {
    index += 1;
    const dataUrl = match[2];
    const parsed = parseDataUrl(dataUrl);
    const ext = extByMime(parsed.mime);
    const fileName = `${slugBase}-${Date.now()}-${index}.${ext}`;
    const outPath = path.join(BLOG_ASSETS_DIR, fileName);
    await fs.writeFile(outPath, Buffer.from(parsed.base64, "base64"));
    output = output.replace(dataUrl, `./blog-assets/${fileName}`);
  }
  return { content: output };
}

async function upsertBlogCard({ fileName, title, excerpt, category }) {
  const html = await fs.readFile(BLOG_HTML_PATH, "utf8");
  const startTag = "<!-- BLOG_POSTS_START -->";
  const endTag = "<!-- BLOG_POSTS_END -->";
  const startIndex = html.indexOf(startTag);
  const endIndex = html.indexOf(endTag);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error("Blog marker block is missing in blog.html.");
  }
  const href = `./${fileName}`;
  const before = html.slice(0, startIndex + startTag.length);
  const middle = html.slice(startIndex + startTag.length, endIndex);
  const after = html.slice(endIndex);
  if (middle.includes(href)) return;
  const card = `
      <article class="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <p class="text-xs font-medium uppercase tracking-wide text-indigo-200">${escapeHtml(category)}</p>
        <h2 class="mt-3 text-2xl font-semibold text-white">${escapeHtml(title)}</h2>
        <p class="mt-3 text-sm leading-7 text-slate-300">${escapeHtml(excerpt)}</p>
        <a href="${href}" class="mt-5 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">Read article</a>
      </article>`;
  await fs.writeFile(BLOG_HTML_PATH, `${before}${card}\n${middle}${after}`, "utf8");
}

async function upsertSitemap({ fileName }) {
  let sitemap = await fs.readFile(SITEMAP_PATH, "utf8");
  const loc = `https://seedance3-pro.com/${fileName}`;
  if (sitemap.includes(`<loc>${loc}</loc>`)) return;
  const now = new Date().toISOString().slice(0, 10);
  const entry = `
  <url>
    <loc>${loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  sitemap = sitemap.replace("</urlset>", `${entry}\n</urlset>`);
  await fs.writeFile(SITEMAP_PATH, sitemap, "utf8");
}

async function removeBlogCardByFileName(fileName) {
  const html = await fs.readFile(BLOG_HTML_PATH, "utf8");
  const startTag = "<!-- BLOG_POSTS_START -->";
  const endTag = "<!-- BLOG_POSTS_END -->";
  const startIndex = html.indexOf(startTag);
  const endIndex = html.indexOf(endTag);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error("Blog marker block is missing in blog.html.");
  }
  const blockStart = startIndex + startTag.length;
  const before = html.slice(0, blockStart);
  const middle = html.slice(blockStart, endIndex);
  const after = html.slice(endIndex);
  const cards = middle.match(/<article[\s\S]*?<\/article>/g) || [];
  const filtered = cards.filter((card) => !card.includes(`href="./${fileName}"`));
  const newMiddle = `\n${filtered.join("\n\n")}\n`;
  await fs.writeFile(BLOG_HTML_PATH, `${before}${newMiddle}${after}`, "utf8");
}

async function removeSitemapByFileName(fileName) {
  const sitemap = await fs.readFile(SITEMAP_PATH, "utf8");
  const loc = `https://seedance3-pro.com/${fileName}`;
  const blocks = sitemap.match(/<url>[\s\S]*?<\/url>/g) || [];
  const kept = blocks.filter((block) => !block.includes(`<loc>${loc}</loc>`));
  const output = `${sitemap.slice(0, sitemap.indexOf("<url>"))}${kept.join("\n")}\n</urlset>\n`;
  await fs.writeFile(SITEMAP_PATH, output, "utf8");
}

async function listPublishedPosts() {
  const html = await fs.readFile(BLOG_HTML_PATH, "utf8");
  const startTag = "<!-- BLOG_POSTS_START -->";
  const endTag = "<!-- BLOG_POSTS_END -->";
  const startIndex = html.indexOf(startTag);
  const endIndex = html.indexOf(endTag);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error("Blog marker block is missing in blog.html.");
  }
  const middle = html.slice(startIndex + startTag.length, endIndex);
  const cards = middle.match(/<article[\s\S]*?<\/article>/g) || [];
  return cards.map((card, idx) => {
    const hrefMatch = card.match(/href="\.\/([^"]+\.html)"/i);
    const titleMatch = card.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const excerptMatch = card.match(/<p class="mt-3 text-sm leading-7 text-slate-300">([\s\S]*?)<\/p>/i);
    const categoryMatch = card.match(/<p class="text-xs font-medium uppercase tracking-wide text-indigo-200">([\s\S]*?)<\/p>/i);
    return {
      id: `${idx}-${hrefMatch ? hrefMatch[1] : "unknown"}`,
      fileName: hrefMatch ? hrefMatch[1].trim() : "",
      title: titleMatch ? stripHtml(titleMatch[1]) : "",
      excerpt: excerptMatch ? stripHtml(excerptMatch[1]) : "",
      category: categoryMatch ? stripHtml(categoryMatch[1]) : ""
    };
  }).filter((item) => item.fileName);
}

function buildArticleHtml({ title, excerpt, category, content, canonical }) {
  const safeTitle = escapeHtml(title);
  const safeExcerpt = escapeHtml(excerpt);
  const safeCategory = escapeHtml(category);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle} | SEEDANCE Blog</title>
  <meta name="description" content="${safeExcerpt}">
  <meta name="keywords" content="Seedance blog,AI video tutorial,Seedance workflow">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="SEEDANCE 3.0">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeExcerpt}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="https://seedance3-pro.com/og-cover.svg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeExcerpt}">
  <meta name="twitter:image" content="https://seedance3-pro.com/og-cover.svg">
  <meta name="theme-color" content="#080c1f">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .article-content {
      margin-top: 2.5rem;
      color: #cbd5e1;
      font-size: 1rem;
      line-height: 1.75;
    }
    .article-content p {
      margin: 0 0 1rem;
    }
    .article-content h1,
    .article-content h2,
    .article-content h3,
    .article-content h4,
    .article-content h5,
    .article-content h6 {
      color: #ffffff;
      font-weight: 700;
      line-height: 1.35;
      margin: 1.5rem 0 0.75rem;
    }
    .article-content ul {
      list-style: disc;
      list-style-position: inside;
      padding-left: 0;
      margin: 0.75rem 0;
    }
    .article-content ol {
      list-style: decimal;
      list-style-position: inside;
      padding-left: 0;
      margin: 0.75rem 0;
    }
    .article-content li {
      margin: 0.25rem 0;
    }
    .article-content strong {
      color: #ffffff;
      font-weight: 700;
    }
    .article-content a {
      color: #a5b4fc;
    }
    .article-content blockquote {
      margin: 1rem 0;
      padding-left: 1rem;
      border-left: 2px solid rgba(255,255,255,0.18);
    }
    .article-content img {
      border-radius: 1rem;
      border: 1px solid rgba(255,255,255,0.1);
      margin: 1rem 0;
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 antialiased">
  <header class="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
      <a href="./index.html" class="flex items-center gap-3">
        <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 font-semibold text-white">S3</span>
        <span class="text-sm font-semibold tracking-[0.2em] text-slate-200">SEEDANCE 3.0</span>
      </a>
      <nav class="hidden items-center gap-7 text-sm text-slate-300 lg:flex">
        <a href="./blog.html" class="text-white">Blog</a>
        <a href="./features.html" class="hover:text-white">Features</a>
        <a href="./pricing.html" class="hover:text-white">Pricing</a>
      </nav>
      <a href="./index.html#generator" class="rounded-full border border-indigo-300/40 bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-500/35">Start Creating</a>
    </div>
  </header>
  <main class="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
    <article>
      <p class="text-xs font-semibold uppercase tracking-wide text-indigo-200">${safeCategory}</p>
      <h1 class="mt-4 text-4xl font-semibold text-white sm:text-5xl">${safeTitle}</h1>
      <p class="mt-6 text-base leading-8 text-slate-300">${safeExcerpt}</p>
      <div class="article-content">
        ${content}
      </div>
    </article>
  </main>
  <footer class="border-t border-white/10 bg-slate-950">
    <div class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-400 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <p>© 2026 SEEDANCE 3.0 · seedance3-pro.com</p>
      <div class="flex gap-4">
        <a href="./blog.html" class="hover:text-slate-200">Blog</a>
        <a href="./index.html" class="hover:text-slate-200">Home</a>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

async function pushWithRetry(branch, job) {
  while (true) {
    ensureJobActive(job);
    const pushResult = await runGit(["push", "origin", branch], true);
    if (pushResult.ok) {
      return;
    }
    job.lastError = pushResult.stderr || pushResult.stdout || "git push failed";
    await sleep(5000);
  }
}

function ensureJobActive(job) {
  if (job.canceled) {
    throw new Error("JOB_CANCELED");
  }
}

function scheduleRetry(jobId, fn) {
  clearRetryTimer(jobId);
  const timer = setTimeout(() => {
    retryTimers.delete(jobId);
    fn();
  }, 5000);
  retryTimers.set(jobId, timer);
}

function clearRetryTimer(jobId) {
  const timer = retryTimers.get(jobId);
  if (timer) {
    clearTimeout(timer);
    retryTimers.delete(jobId);
  }
}

async function resolveUniqueHtmlFileName(slug) {
  let index = 0;
  while (true) {
    const fileName = index === 0 ? `${slug}.html` : `${slug}-${index + 1}.html`;
    try {
      await fs.access(path.join(ROOT_DIR, fileName));
      index += 1;
    } catch (_error) {
      return fileName;
    }
  }
}

function parseDataUrl(dataUrl) {
  const matched = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!matched) {
    throw new Error("Invalid image data URL.");
  }
  return { mime: matched[1], base64: matched[2] };
}

function extByMime(mime) {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "png";
}

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function escapeHtml(input) {
  return String(input || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function stripHtml(input) {
  return String(input || "").replace(/<[^>]+>/g, "").trim();
}

async function translateHtmlToEnglish(content) {
  const apiKey = await getDeepSeekApiKey();
  if (!apiKey) {
    throw new Error("未配置 DEEPSEEK_API_KEY。请在环境变量或 .env.local/cms.secrets.json 中配置后重启 CMS。");
  }
  const prompt = `Translate the following HTML content from Chinese to English.
Rules:
1) Keep original HTML tag structure as much as possible.
2) Do not remove or add semantic blocks.
3) Keep inline styles and attributes unchanged.
4) Return HTML only, no markdown fences, no explanations.
HTML:
${content}`;

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: "You are a precise bilingual editor."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${text}`);
  }

  const result = await response.json();
  const output = String(result?.choices?.[0]?.message?.content || "").trim();
  if (!output) {
    throw new Error("DeepSeek returned empty content.");
  }
  return sanitizeArticleHtml(output);
}

async function getDeepSeekApiKey() {
  const envKey = String(process.env.DEEPSEEK_API_KEY || "").trim();
  if (envKey) {
    return envKey;
  }
  const envLocalKey = await readKeyFromEnvLocal();
  if (envLocalKey) {
    return envLocalKey;
  }
  const jsonKey = await readKeyFromSecretsJson();
  if (jsonKey) {
    return jsonKey;
  }
  return "";
}

async function readKeyFromEnvLocal() {
  const envPath = path.join(ROOT_DIR, ".env.local");
  try {
    const text = await fs.readFile(envPath, "utf8");
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const normalized = line.trim();
      if (!normalized || normalized.startsWith("#")) {
        continue;
      }
      const [rawKey, ...rest] = normalized.split("=");
      if (!rawKey || rawKey.trim() !== "DEEPSEEK_API_KEY") {
        continue;
      }
      const rawValue = rest.join("=").trim();
      return rawValue.replace(/^['"]|['"]$/g, "");
    }
  } catch {
  }
  return "";
}

async function readKeyFromSecretsJson() {
  const jsonPath = path.join(ROOT_DIR, "cms.secrets.json");
  try {
    const text = await fs.readFile(jsonPath, "utf8");
    const obj = JSON.parse(text);
    return String(obj?.DEEPSEEK_API_KEY || "").trim();
  } catch {
  }
  return "";
}

function sanitizeArticleHtml(input) {
  let output = String(input || "");
  output = output.replace(/<\?xml[\s\S]*?\?>/gi, "");
  output = output.replace(/<!--[\s\S]*?-->/g, "");
  output = output.replace(/<\s*(script|style|iframe|object|meta|link)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  output = output.replace(/<\s*(meta|link)\b[^>]*>/gi, "");
  output = output.replace(/<\/?[\w-]+:[^>]*>/gi, "");
  output = output.replace(/\sclass\s*=\s*(['"])[\s\S]*?\1/gi, "");
  output = output.replace(/\sstyle\s*=\s*(['"])([\s\S]*?)\1/gi, (_m, _q, styleText) => {
    const filtered = filterInlineStyle(styleText);
    return filtered ? ` style="${filtered}"` : "";
  });
  output = output.replace(/\s(color|bgcolor|face|size)\s*=\s*(['"])[\s\S]*?\2/gi, "");
  output = output.replace(/<\s*font\b[^>]*>/gi, "<span>");
  output = output.replace(/<\s*\/\s*font\s*>/gi, "</span>");
  return output;
}

function filterInlineStyle(styleText) {
  const allowed = new Set([
    "line-height",
    "text-indent",
    "text-align",
    "margin",
    "margin-left",
    "margin-right",
    "margin-top",
    "margin-bottom",
    "padding-left",
    "padding-right",
    "padding-top",
    "padding-bottom",
    "font-weight",
    "font-style",
    "font-size",
    "text-decoration",
    "letter-spacing",
    "word-spacing",
    "list-style-type",
    "white-space"
  ]);
  const deniedPrefix = ["mso-", "color", "background", "border-color"];
  const declarations = String(styleText || "").split(";");
  const kept = [];
  for (const decl of declarations) {
    const [rawProp, ...rest] = decl.split(":");
    const prop = (rawProp || "").trim().toLowerCase();
    if (!prop || !allowed.has(prop)) {
      continue;
    }
    if (deniedPrefix.some((prefix) => prop.startsWith(prefix))) {
      continue;
    }
    const value = rest.join(":").trim();
    if (!value) {
      continue;
    }
    const lowered = value.toLowerCase();
    if (lowered.includes("expression(") || lowered.includes("javascript:") || lowered.includes("url(")) {
      continue;
    }
    kept.push(`${prop}: ${value}`);
  }
  return kept.join("; ");
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runGit(args, allowFailure = false) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd: ROOT_DIR, shell: false });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      const ok = code === 0;
      if (!ok && !allowFailure) {
        reject(new Error(stderr || stdout || `git ${args.join(" ")} failed`));
        return;
      }
      resolve({ ok, stdout, stderr, code });
    });
  });
}

const port = Number(process.env.PORT || 4310);
app.listen(port, () => {
  console.log(`Local CMS running at http://localhost:${port}/admin`);
});
