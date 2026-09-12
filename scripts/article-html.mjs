const ALLOWED_ELEMENTS = new Set([
  "a", "abbr", "b", "blockquote", "br", "code", "del", "details", "div", "em",
  "figcaption", "figure", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img", "li",
  "mark", "ol", "p", "pre", "s", "small", "span", "strong", "sub", "summary", "sup",
  "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul", "video", "source"
]);

const VOID_ELEMENTS = new Set(["br", "hr", "img", "source"]);
const BOOLEAN_ATTRIBUTES = new Set(["autoplay", "controls", "loop", "muted", "playsinline", "reversed"]);

const ATTRIBUTES_BY_ELEMENT = {
  a: new Set(["href", "rel", "target", "title"]),
  code: new Set(["class"]),
  img: new Set(["alt", "decoding", "height", "loading", "src", "title", "width"]),
  ol: new Set(["reversed", "start"]),
  source: new Set(["src", "type"]),
  table: new Set(["summary"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan", "scope"]),
  video: new Set(["autoplay", "controls", "height", "loop", "muted", "playsinline", "poster", "preload", "src", "width"])
};

function isSafeUrl(value, element, attribute) {
  const url = String(value || "").trim();
  if (!url) return false;
  if (url.startsWith("#") || url.startsWith("./") || url.startsWith("../")) return true;
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const parsed = new URL(url);
    if (["http:", "https:"].includes(parsed.protocol)) return true;
    return element === "a" && attribute === "href" && ["mailto:", "tel:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function sanitizeAttributeValue(value) {
  return String(value || "").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function sanitizeAttributes(element, rawAttributes) {
  const allowed = ATTRIBUTES_BY_ELEMENT[element] || new Set();
  const output = [];
  const attributePattern = /([^\s=\/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of String(rawAttributes || "").matchAll(attributePattern)) {
    const name = match[1].toLowerCase();
    if (!allowed.has(name) || name.startsWith("on")) continue;
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if (BOOLEAN_ATTRIBUTES.has(name)) {
      output.push(name);
      continue;
    }
    if (["href", "poster", "src"].includes(name) && !isSafeUrl(value, element, name)) continue;
    if (name === "class" && !/^language-[a-z0-9_-]+$/i.test(value)) continue;
    if (name === "target" && !["_blank", "_self"].includes(value)) continue;
    if (["colspan", "height", "rowspan", "start", "width"].includes(name) && !/^\d{1,5}$/.test(value)) continue;
    output.push(`${name}="${sanitizeAttributeValue(value)}"`);
  }
  return output.length ? ` ${output.join(" ")}` : "";
}

export function sanitizeArticleHtml(input) {
  let output = String(input || "");
  output = output.replace(/<\?xml[\s\S]*?\?>/gi, "");
  output = output.replace(/<!--[\s\S]*?-->/g, "");
  output = output.replace(/<\s*(script|style|iframe|object|embed|template|head|title)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  output = output.replace(/<\s*(base|link|meta|title)\b[^>]*\/?\s*>/gi, "");
  output = output.replace(/<\s*h1\b[^>]*>/gi, "<h2>").replace(/<\s*\/\s*h1\s*>/gi, "</h2>");
  output = output.replace(/<\s*font\b[^>]*>/gi, "<span>").replace(/<\s*\/\s*font\s*>/gi, "</span>");
  output = output.replace(/<\/?([a-z][a-z0-9:_-]*)\b([^>]*)>/gi, (full, rawElement, rawAttributes) => {
    const element = rawElement.toLowerCase();
    const closing = /^<\s*\//.test(full);
    if (!ALLOWED_ELEMENTS.has(element)) return "";
    if (closing) return VOID_ELEMENTS.has(element) ? "" : `</${element}>`;
    const attributes = sanitizeAttributes(element, rawAttributes);
    return `<${element}${attributes}>`;
  });
  for (let index = 0; index < 4; index += 1) {
    output = output.replace(/<(span|div|p)>(?:\s|&nbsp;)*<\/\1>/gi, "");
  }
  return output.trim();
}

export function normalizeArticleDocument(html) {
  const source = String(html || "");
  const articleContentPattern = /(<div\b[^>]*class="[^"]*\b(?:article-content|prose)\b[^"]*"[^>]*>)([\s\S]*?)(<\/div>\s*<\/article>)/i;
  if (!articleContentPattern.test(source)) return source;
  return source.replace(articleContentPattern, (_match, open, content, close) => `${open}\n        ${sanitizeArticleHtml(content)}\n      ${close}`);
}

const ARTICLE_HEADER = `  <header class="site-header">
    <div class="container inner">
      <a class="brand" href="./index.html" aria-label="SEEDANCE 3.0 home">
        <img class="brand-mark" src="./assets/seedance-mark.svg" width="40" height="40" alt="">
        <span>SEEDANCE 3.0</span>
      </a>
      <nav class="desktop-nav compact-nav" aria-label="Primary navigation">
        <a href="./index.html">Home</a>
        <a href="./blog.html">Blog</a>
      </nav>
    </div>
  </header>`;

const ARTICLE_FOOTER = `  <footer class="site-footer article-footer">
    <div class="container article-footer-inner">
      <p>© 2026 SEEDANCE 3.0 · seedance3-pro.com</p>
      <nav aria-label="Footer navigation">
        <a href="./index.html">Home</a>
        <a href="./blog.html">Blog</a>
      </nav>
    </div>
  </footer>`;

function escapeHtml(input) {
  return String(input || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeLegacyArticleMain(source) {
  const mainPattern = /<main\b[^>]*>\s*<article\b[^>]*>([\s\S]*?)<\/article>\s*<\/main>/i;
  const match = source.match(mainPattern);
  if (!match) return source;

  let article = match[1].trim();
  const categoryMatch = article.match(/^\s*<p\b[^>]*>([\s\S]*?)<\/p>/i);
  if (!categoryMatch) return source;
  const category = categoryMatch[1].trim();
  article = article.slice(categoryMatch[0].length).trim();

  const headingMatch = article.match(/^\s*<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!headingMatch) return source;
  const heading = headingMatch[1].trim();
  let content = article.slice(headingMatch[0].length).trim();

  const existingContent = content.match(/^<div\b[^>]*class="[^"]*\barticle-content\b[^"]*"[^>]*>([\s\S]*)<\/div>\s*$/i);
  if (existingContent) content = existingContent[1].trim();

  const replacement = `<main class="article-main">
    <div class="container">
      <article class="article-shell">
        <p class="eyebrow article-category">${category}</p>
        <h1 class="article-title">${heading}</h1>
        <div class="article-content prose">
          ${content}
        </div>
      </article>
    </div>
  </main>`;
  return source.replace(mainPattern, replacement);
}

export function normalizeBlogArticleDocument(html) {
  let output = String(html || "");
  if (!/<meta\s+property="og:type"\s+content="article">/i.test(output)) return output;

  if (/cdn\.tailwindcss\.com/i.test(output)) {
    output = output.replace(/\s*<script\s+src="https:\/\/cdn\.tailwindcss\.com"><\/script>/i, '\n  <link rel="stylesheet" href="./site.css">');
    output = output.replace(/\s*<style>\s*\.article-content\s*\{[\s\S]*?<\/style>/i, "");
  } else if (!/<link\s+rel="stylesheet"\s+href="\.\/site\.css">/i.test(output)) {
    output = output.replace(/<\/head>/i, '  <link rel="stylesheet" href="./site.css">\n</head>');
  }

  output = output.replace(/<body\b[^>]*>/i, "<body>");
  output = output.replace(/\s*<header\b[^>]*>[\s\S]*?<\/header>/i, `\n${ARTICLE_HEADER}`);
  output = output.replace(/\s*<footer\b[^>]*>[\s\S]*?<\/footer>/i, `\n${ARTICLE_FOOTER}`);

  if (!/<main\s+class="article-main">/i.test(output)) {
    if (/<section\b[^>]*class="[^"]*\bpage-hero\b/i.test(output)) {
      output = output.replace(/<main\b[^>]*>/i, '<main class="article-main">');
      output = output.replace(/<article\s+class="prose">/i, '<article class="article-content prose">');
    } else {
      output = normalizeLegacyArticleMain(output);
    }
  }

  return output;
}

export function renderArticleDocument({ title, excerpt, category, content, canonical }) {
  const safeTitle = escapeHtml(title);
  const safeExcerpt = escapeHtml(excerpt) || safeTitle;
  const safeCategory = escapeHtml(category) || "Article";
  const excerptHtml = excerpt
    ? `\n        <p class="article-lead">${safeExcerpt}</p>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle} | SEEDANCE Blog</title>
  <meta name="description" content="${safeExcerpt}">
  <meta name="keywords" content="Seedance blog,AI video tutorial,Seedance workflow">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="SEEDANCE 3.0">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeExcerpt}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="https://seedance3-pro.com/og-cover.svg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeExcerpt}">
  <meta name="twitter:image" content="https://seedance3-pro.com/og-cover.svg">
  <meta name="theme-color" content="#090a0c">
  <link rel="stylesheet" href="./site.css">
  <link rel="icon" type="image/svg+xml" href="./favicon.svg">
  <link rel="icon" type="image/x-icon" sizes="16x16 32x32 48x48" href="./favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="./assets/apple-touch-icon.png">
</head>
<body>
${ARTICLE_HEADER}

  <main class="article-main">
    <div class="container">
      <article class="article-shell">
        <p class="eyebrow article-category">${safeCategory}</p>
        <h1 class="article-title">${safeTitle}</h1>${excerptHtml}
        <div class="article-content prose">
          ${sanitizeArticleHtml(content)}
        </div>
      </article>
    </div>
  </main>

${ARTICLE_FOOTER}
</body>
</html>`;
}
