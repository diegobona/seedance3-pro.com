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
