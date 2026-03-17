export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }
    if (request.method === "POST" && url.pathname === "/api/upload-images") {
      return withCors(await handleUploadImages(request, env));
    }
    if (request.method === "POST" && url.pathname === "/api/publish") {
      return withCors(await handlePublish(request, env, ctx));
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/job/")) {
      return withCors(await handleJobStatus(request, url.pathname, env));
    }
    if (request.method === "POST" && url.pathname === "/api/retry-now") {
      return withCors(await handleRetryNow(env, ctx));
    }
    return withCors(new Response(JSON.stringify({ success: false, message: "Not found" }), {
      status: 404,
      headers: { "content-type": "application/json;charset=UTF-8" }
    }));
  },
  async scheduled(_controller, env, _ctx) {
    await processPendingJobs(env);
  }
};

async function handleUploadImages(request, env) {
  if (!isAuthorized(request, env)) {
    return json({ success: false, message: "Unauthorized" }, 401);
  }
  const form = await request.formData();
  const output = [];
  for (const value of form.getAll("images")) {
    if (!(value instanceof File)) {
      continue;
    }
    const bytes = new Uint8Array(await value.arrayBuffer());
    const base64 = toBase64(bytes);
    const mime = value.type || "image/png";
    output.push({
      name: value.name,
      dataUrl: `data:${mime};base64,${base64}`
    });
  }
  return json({ success: true, files: output });
}

async function handlePublish(request, env, ctx) {
  if (!isAuthorized(request, env)) {
    return json({ success: false, message: "Unauthorized" }, 401);
  }
  let payload;
  try {
    payload = await request.json();
  } catch (_error) {
    return json({ success: false, message: "Invalid JSON payload" }, 400);
  }
  const title = String(payload?.title || "").trim();
  const excerpt = String(payload?.excerpt || "").trim();
  const content = String(payload?.content || "").trim();
  const category = String(payload?.category || "Tutorial").trim();

  if (!title || !content) {
    return json({ success: false, message: "Title and content are required." }, 400);
  }

  const job = {
    id: crypto.randomUUID(),
    title,
    excerpt: excerpt || "New Seedance guide published from CMS.",
    content,
    category,
    status: "pending",
    attempts: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastError: ""
  };
  await env.CMS_JOBS.put(jobKey(job.id), JSON.stringify(job));
  ctx.waitUntil(processJob(job.id, env));
  return json({
    success: true,
    queued: true,
    jobId: job.id,
    message: "Publish job created. It will keep retrying until success."
  }, 202);
}

async function handleJobStatus(request, pathname, env) {
  if (!isAuthorized(request, env)) {
    return json({ success: false, message: "Unauthorized" }, 401);
  }
  const id = pathname.replace("/api/job/", "").trim();
  if (!id) {
    return json({ success: false, message: "Job id is required." }, 400);
  }
  const raw = await env.CMS_JOBS.get(jobKey(id));
  if (!raw) {
    return json({ success: false, message: "Job not found." }, 404);
  }
  const job = JSON.parse(raw);
  return json({ success: true, job }, 200);
}

async function handleRetryNow(env, ctx) {
  ctx.waitUntil(processPendingJobs(env));
  return json({ success: true, message: "Retry loop started." });
}

async function processPendingJobs(env) {
  const listed = await env.CMS_JOBS.list({ prefix: "job:" });
  for (const item of listed.keys) {
    const id = item.name.replace("job:", "");
    await processJob(id, env);
  }
}

async function processJob(id, env) {
  const raw = await env.CMS_JOBS.get(jobKey(id));
  if (!raw) {
    return;
  }
  const job = JSON.parse(raw);
  if (job.status === "success") {
    return;
  }

  job.status = "running";
  job.attempts += 1;
  job.updatedAt = Date.now();
  await env.CMS_JOBS.put(jobKey(id), JSON.stringify(job));

  try {
    const result = await publishToGitHub(job, env);
    job.status = "success";
    job.updatedAt = Date.now();
    job.lastError = "";
    job.output = result;
    await env.CMS_JOBS.put(jobKey(id), JSON.stringify(job));
  } catch (error) {
    job.status = "pending";
    job.updatedAt = Date.now();
    job.lastError = String(error?.message || error || "Unknown error");
    await env.CMS_JOBS.put(jobKey(id), JSON.stringify(job));
  }
}

async function publishToGitHub(job, env) {
  const cfg = getConfig(env);
  const branch = cfg.branch;
  const slugBase = slugify(job.title) || `post-${Date.now()}`;
  const fileName = await resolveArticleFileName(slugBase, cfg);
  const articleUrl = `${cfg.siteBaseUrl}/${fileName}`;

  const imageUpload = await uploadInlineImages(job.content, cfg, branch, slugBase);
  const finalContent = imageUpload.content;
  const imageChanges = imageUpload.changes;

  const articleHtml = buildArticleHtml({
    title: job.title,
    excerpt: job.excerpt,
    category: job.category,
    content: finalContent,
    canonical: articleUrl
  });
  const articleChange = await upsertRepoFile(cfg, fileName, articleHtml, `feat(blog): publish ${fileName}`, branch);

  const blogFile = await getRepoFile(cfg, "blog.html", branch);
  const updatedBlogHtml = upsertBlogCardHtml(blogFile.text, {
    fileName,
    title: job.title,
    excerpt: job.excerpt,
    category: job.category
  });
  const blogChange = await upsertRepoFile(cfg, "blog.html", updatedBlogHtml, `feat(blog): update listing ${fileName}`, branch);

  const sitemapFile = await getRepoFile(cfg, "sitemap.xml", branch);
  const updatedSitemap = upsertSitemapEntry(sitemapFile.text, fileName, cfg.siteBaseUrl);
  const sitemapChange = await upsertRepoFile(cfg, "sitemap.xml", updatedSitemap, `feat(blog): update sitemap ${fileName}`, branch);

  return {
    fileName,
    articleUrl: `./${fileName}`,
    branch,
    changes: [...imageChanges, articleChange, blogChange, sitemapChange]
  };
}

async function uploadInlineImages(content, cfg, branch, slugBase) {
  let output = content;
  const changes = [];
  const regex = /<img\b([^>]*?)src="(data:image\/[a-zA-Z0-9.+-]+;base64,[^"]+)"([^>]*?)>/g;
  const matches = [...content.matchAll(regex)];
  let index = 0;
  for (const match of matches) {
    index += 1;
    const dataUrl = match[2];
    const parsed = parseDataUrl(dataUrl);
    const ext = extByMime(parsed.mime);
    const fileName = `blog-assets/${slugBase}-${Date.now()}-${index}.${ext}`;
    const msg = `feat(blog): add image ${fileName}`;
    const change = await upsertRepoFile(cfg, fileName, parsed.base64, msg, branch, true);
    changes.push(change);
    output = output.replace(dataUrl, `./${fileName}`);
  }
  return { content: output, changes };
}

async function resolveArticleFileName(slugBase, cfg) {
  let count = 0;
  while (true) {
    const fileName = count === 0 ? `${slugBase}.html` : `${slugBase}-${count + 1}.html`;
    const existing = await getRepoFile(cfg, fileName, cfg.branch, true);
    if (!existing) {
      return fileName;
    }
    count += 1;
  }
}

async function getRepoFile(cfg, filePath, branch, allowNotFound = false) {
  const url = `${cfg.apiBase}/repos/${cfg.owner}/${cfg.repo}/contents/${encodePath(filePath)}?ref=${encodeURIComponent(branch)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: githubHeaders(cfg.token)
  });
  if (response.status === 404 && allowNotFound) {
    return null;
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub read failed (${response.status}): ${text}`);
  }
  const data = await response.json();
  return {
    sha: data.sha,
    text: fromBase64(data.content || "")
  };
}

async function upsertRepoFile(cfg, filePath, content, message, branch, contentIsBase64 = false) {
  const existing = await getRepoFile(cfg, filePath, branch, true);
  const body = {
    message,
    content: contentIsBase64 ? content : toBase64(new TextEncoder().encode(content)),
    branch
  };
  if (existing?.sha) {
    body.sha = existing.sha;
  }
  const url = `${cfg.apiBase}/repos/${cfg.owner}/${cfg.repo}/contents/${encodePath(filePath)}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: githubHeaders(cfg.token),
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub write failed (${response.status}): ${text}`);
  }
  const data = await response.json();
  return {
    path: filePath,
    sha: data?.content?.sha || ""
  };
}

function upsertBlogCardHtml(html, { fileName, title, excerpt, category }) {
  const startTag = "<!-- BLOG_POSTS_START -->";
  const endTag = "<!-- BLOG_POSTS_END -->";
  const startIndex = html.indexOf(startTag);
  const endIndex = html.indexOf(endTag);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error("Blog marker block is missing in blog.html.");
  }
  const href = `./${fileName}`;
  const blockStart = startIndex + startTag.length;
  const before = html.slice(0, blockStart);
  const middle = html.slice(blockStart, endIndex);
  const after = html.slice(endIndex);
  if (middle.includes(href)) {
    return html;
  }
  const card = `
      <article class="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <p class="text-xs font-medium uppercase tracking-wide text-indigo-200">${escapeHtml(category)}</p>
        <h2 class="mt-3 text-2xl font-semibold text-white">${escapeHtml(title)}</h2>
        <p class="mt-3 text-sm leading-7 text-slate-300">${escapeHtml(excerpt)}</p>
        <a href="${href}" class="mt-5 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">Read article</a>
      </article>`;
  return `${before}${card}\n${middle}${after}`;
}

function upsertSitemapEntry(sitemap, fileName, siteBaseUrl) {
  const loc = `${siteBaseUrl}/${fileName}`;
  if (sitemap.includes(`<loc>${loc}</loc>`)) {
    return sitemap;
  }
  const now = new Date().toISOString().slice(0, 10);
  const entry = `
  <url>
    <loc>${loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  return sitemap.replace("</urlset>", `${entry}\n</urlset>`);
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
      <div class="prose prose-invert mt-10 max-w-none prose-headings:text-white prose-p:text-slate-300 prose-a:text-indigo-300 prose-strong:text-white prose-img:rounded-2xl prose-img:border prose-img:border-white/10">
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

function getConfig(env) {
  const owner = String(env.GH_OWNER || "").trim();
  const repo = String(env.GH_REPO || "").trim();
  const token = String(env.GH_TOKEN || "").trim();
  const branch = String(env.GH_BRANCH || "main").trim();
  const siteBaseUrl = String(env.SITE_BASE_URL || "https://seedance3-pro.com").trim().replace(/\/$/, "");
  if (!owner || !repo || !token) {
    throw new Error("Missing GH_OWNER, GH_REPO or GH_TOKEN.");
  }
  return {
    owner,
    repo,
    token,
    branch,
    siteBaseUrl,
    apiBase: "https://api.github.com"
  };
}

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github+json",
    "User-Agent": "seedance3-worker"
  };
}

function encodePath(filePath) {
  return filePath.split("/").map((part) => encodeURIComponent(part)).join("/");
}

function parseDataUrl(dataUrl) {
  const matched = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!matched) {
    throw new Error("Invalid image data URL.");
  }
  return {
    mime: matched[1],
    base64: matched[2]
  };
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

function isAuthorized(request, env) {
  const token = String(env.ADMIN_TOKEN || "").trim();
  if (!token) {
    return false;
  }
  const provided = request.headers.get("x-admin-token") || "";
  return provided === token;
}

function jobKey(id) {
  return `job:${id}`;
}

function toBase64(input) {
  let bytes;
  if (input instanceof Uint8Array) {
    bytes = input;
  } else {
    bytes = new TextEncoder().encode(String(input || ""));
  }
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(encoded) {
  const binary = atob(String(encoded || "").replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json;charset=UTF-8" }
  });
}

function withCors(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Headers", "Content-Type, x-admin-token");
  headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
