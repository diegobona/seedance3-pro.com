const ALLOWED_ELEMENTS = new Set([
  "a", "abbr", "b", "blockquote", "br", "code", "del", "details", "div", "em",
  "figcaption", "figure", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img", "li",
  "mark", "ol", "p", "pre", "s", "small", "span", "strong", "sub", "summary", "sup",
  "table", "tbody", "td", "tfoot", "th", "thead", "tr", "u", "ul", "video", "source"
]);

const VOID_ELEMENTS = new Set(["br", "hr", "img", "source"]);
const BOOLEAN_ATTRIBUTES = new Set(["autoplay", "controls", "loop", "muted", "playsinline", "reversed"]);
const GLOBAL_ATTRIBUTES = new Set(["class", "style"]);
const SAFE_STYLE_PROPERTIES = new Set([
  "line-height", "text-indent", "text-align", "margin", "margin-left", "margin-right",
  "margin-top", "margin-bottom", "padding-left", "padding-right", "padding-top",
  "padding-bottom", "font-weight", "font-style", "font-size", "text-decoration",
  "letter-spacing", "word-spacing", "list-style-type", "list-style-position", "white-space"
]);

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

function sanitizeInlineStyle(styleText) {
  const output = [];
  for (const declaration of String(styleText || "").split(";")) {
    const [rawProperty, ...rawValue] = declaration.split(":");
    const property = String(rawProperty || "").trim().toLowerCase();
    const value = rawValue.join(":").trim();
    const lowered = value.toLowerCase();
    if (!SAFE_STYLE_PROPERTIES.has(property) || !value) continue;
    if (lowered.includes("expression(") || lowered.includes("javascript:") || lowered.includes("url(")) continue;
    output.push(`${property}: ${value}`);
  }
  return output.join("; ");
}

function sanitizeAttributes(element, rawAttributes) {
  const allowed = new Set([...GLOBAL_ATTRIBUTES, ...(ATTRIBUTES_BY_ELEMENT[element] || [])]);
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
    if (name === "class") {
      const className = value.trim().replace(/\s+/g, " ");
      if (!className || className.length > 500 || className.split(" ").some((token) => !/^[a-z0-9_:./\[\]%-]+$/i.test(token))) continue;
      output.push(`class="${sanitizeAttributeValue(className)}"`);
      continue;
    }
    if (name === "style") {
      const style = sanitizeInlineStyle(value);
      if (style) output.push(`style="${sanitizeAttributeValue(style)}"`);
      continue;
    }
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

function decodeHtml(input) {
  return String(input || "")
    .replace(/&#(\d+);/g, (_match, value) => String.fromCodePoint(Number(value)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, value) => String.fromCodePoint(Number.parseInt(value, 16)))
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function textFromHtml(input) {
  return decodeHtml(String(input || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}

function metaContent(source, attribute, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tag = String(source || "").match(new RegExp(`<meta\\b(?=[^>]*\\b${attribute}="${escapedKey}")[^>]*>`, "i"))?.[0] || "";
  return decodeHtml(tag.match(/\bcontent="([^"]*)"/i)?.[1] || "");
}

function elementByClass(source, className) {
  const openingPattern = new RegExp(`<([a-z][a-z0-9]*)\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`, "i");
  const opening = openingPattern.exec(source);
  if (!opening) return null;
  const tagName = opening[1].toLowerCase();
  const tokenPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  tokenPattern.lastIndex = opening.index + opening[0].length;
  let depth = 1;
  let token;
  while ((token = tokenPattern.exec(source))) {
    if (/^<\s*\//.test(token[0])) depth -= 1;
    else depth += 1;
    if (depth === 0) {
      return {
        openStart: opening.index,
        innerStart: opening.index + opening[0].length,
        innerEnd: token.index,
        closeEnd: token.index + token[0].length,
      };
    }
  }
  return null;
}

function replaceElementContentByClass(source, className, content) {
  const element = elementByClass(source, className);
  if (!element) return source;
  return `${source.slice(0, element.innerStart)}${content}${source.slice(element.innerEnd)}`;
}

function replaceMetaContent(source, attribute, key, value) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta\\b(?=[^>]*\\b${attribute}="${escapedKey}")[^>]*>`, "i");
  return source.replace(pattern, (tag) => {
    if (/\bcontent="[^"]*"/i.test(tag)) {
      return tag.replace(/\bcontent="[^"]*"/i, `content="${value}"`);
    }
    return tag.replace(/>$/, ` content="${value}">`);
  });
}

function updateArticleSchema(source, { title, excerpt, modifiedDate }) {
  return source.replace(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi, (block, rawJson) => {
    let schema;
    try {
      schema = JSON.parse(rawJson);
    } catch {
      return block;
    }
    const candidates = Array.isArray(schema?.["@graph"]) ? schema["@graph"] : [schema];
    let changed = false;
    for (const item of candidates) {
      const types = Array.isArray(item?.["@type"]) ? item["@type"] : [item?.["@type"]];
      if (!types.includes("Article")) continue;
      item.headline = title;
      item.description = excerpt;
      item.dateModified = modifiedDate;
      changed = true;
    }
    const safeJson = JSON.stringify(schema, null, 2)
      .replace(/</g, "\\u003c")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
    return changed ? `<script type="application/ld+json">\n${safeJson}\n  </script>` : block;
  });
}

export function extractEditableArticleContent(html) {
  const source = String(html || "");
  const element = elementByClass(source, "article-content");
  if (!element) throw new Error("Article content container was not found.");
  return source.slice(element.innerStart, element.innerEnd).trim();
}

export function extractEditableArticleData(html) {
  const source = String(html || "");
  const heading = source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "";
  const categoryElement = elementByClass(source, "article-category");
  return {
    title: textFromHtml(heading),
    excerpt: metaContent(source, "name", "description"),
    category: categoryElement ? textFromHtml(source.slice(categoryElement.innerStart, categoryElement.innerEnd)) : "",
    content: extractEditableArticleContent(source),
  };
}

export function updateArticleDocument(html, { title, excerpt, category, content, modifiedDate = new Date().toISOString().slice(0, 10) }) {
  let output = String(html || "");
  const nextTitle = String(title || "").trim();
  const nextExcerpt = String(excerpt || "").trim() || metaContent(output, "name", "description") || nextTitle;
  const safeTitle = escapeHtml(nextTitle);
  const safeExcerpt = escapeHtml(nextExcerpt);
  const safeCategory = escapeHtml(category) || "Article";
  const safeContent = sanitizeArticleHtml(content);

  if (!/<h1\b/i.test(output) || !elementByClass(output, "article-content")) {
    throw new Error("Article document cannot be edited safely.");
  }
  output = output.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, `<title>${safeTitle} | SEEDANCE Blog</title>`);
  output = replaceMetaContent(output, "name", "description", safeExcerpt);
  output = replaceMetaContent(output, "property", "og:title", safeTitle);
  output = replaceMetaContent(output, "property", "og:description", safeExcerpt);
  output = replaceMetaContent(output, "name", "twitter:title", safeTitle);
  output = replaceMetaContent(output, "name", "twitter:description", safeExcerpt);
  output = output.replace(/(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/i, `$1${safeTitle}$2`);

  if (elementByClass(output, "article-category")) {
    output = replaceElementContentByClass(output, "article-category", safeCategory);
  } else {
    output = output.replace(/<h1\b/i, `<p class="eyebrow article-category">${safeCategory}</p>\n        <h1`);
  }
  if (elementByClass(output, "article-lead")) {
    output = replaceElementContentByClass(output, "article-lead", safeExcerpt);
  } else if (elementByClass(output, "lead")) {
    output = replaceElementContentByClass(output, "lead", safeExcerpt);
  } else {
    output = output.replace(/(<\/h1>)/i, `$1\n        <p class="article-lead">${safeExcerpt}</p>`);
  }
  output = replaceElementContentByClass(output, "article-content", `\n          ${safeContent}\n        `);
  return updateArticleSchema(output, { title: nextTitle, excerpt: nextExcerpt, modifiedDate });
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
