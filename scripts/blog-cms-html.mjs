import { articleFileFromCard, publicArticlePath } from "./public-urls.mjs";

const ARTICLE_FILE_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.html$/i;

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

function blogPostBlock(html) {
  const match = String(html || "").match(/<!-- BLOG_POSTS_START -->([\s\S]*?)<!-- BLOG_POSTS_END -->/i);
  if (!match) throw new Error("Blog marker block is missing in blog.html.");
  return match;
}

function tagAttribute(source, tagName, identifyingAttribute, identifyingValue, valueAttribute) {
  const escapedValue = identifyingValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tag = String(source || "").match(new RegExp(`<${tagName}\\b(?=[^>]*\\b${identifyingAttribute}="${escapedValue}")[^>]*>`, "i"))?.[0] || "";
  return decodeHtml(tag.match(new RegExp(`\\b${valueAttribute}="([^"]*)"`, "i"))?.[1] || "");
}

function urlMatchesFileName(value, fileName) {
  if (!value) return false;
  try {
    const parsed = new URL(value, "https://seedance3-pro.com/");
    return [publicArticlePath(fileName), `/${fileName}`].includes(decodeURIComponent(parsed.pathname))
      && !parsed.search
      && !parsed.hash;
  } catch {
    return false;
  }
}

export function parseBlogPosts(html) {
  const block = blogPostBlock(html)[1];
  const cards = block.match(/<article\b[\s\S]*?<\/article>/gi) || [];
  return cards.map((card, index) => {
    const fileName = articleFileFromCard(card);
    return {
      id: `${index}-${fileName || "unknown"}`,
      fileName,
      title: textFromHtml(card.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1]),
      excerpt: textFromHtml(card.match(/<p\b[^>]*class="[^"]*\bblog-card-excerpt\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1]),
      category: textFromHtml(card.match(/<p\b[^>]*class="[^"]*\bblog-card-category\b[^"]*"[^>]*>([\s\S]*?)<\/p>/i)?.[1]),
    };
  }).filter((post) => post.fileName);
}

export function validateEditableBlogArticle({ fileName, blogHtml, articleHtml }) {
  const normalized = String(fileName || "").trim();
  const listed = ARTICLE_FILE_PATTERN.test(normalized)
    && parseBlogPosts(blogHtml).some((post) => post.fileName === normalized);
  const indexableArticle = typeof articleHtml === "string"
    && /<meta\s+property="og:type"\s+content="article">/i.test(articleHtml)
    && !/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(articleHtml);
  const canonical = tagAttribute(articleHtml, "link", "rel", "canonical", "href");
  const openGraphUrl = tagAttribute(articleHtml, "meta", "property", "og:url", "content");
  const stableIdentity = urlMatchesFileName(canonical, normalized) && urlMatchesFileName(openGraphUrl, normalized);
  if (!listed || !indexableArticle || !stableIdentity) {
    throw new Error("The requested file is not an editable Blog article.");
  }
  return normalized;
}

function renderBlogCard({ fileName, title, excerpt, category }) {
  const excerptHtml = excerpt
    ? `\n        <p class="blog-card-excerpt">${escapeHtml(excerpt)}</p>`
    : "";
  return `<article class="blog-card card card-pad">
        <p class="blog-card-category tag lime">${escapeHtml(category || "Tutorial")}</p>
        <h2>${escapeHtml(title)}</h2>${excerptHtml}
        <a href=".${publicArticlePath(fileName)}" class="card-link">Read article</a>
      </article>`;
}

export function upsertBlogCardHtml(html, post) {
  const source = String(html || "");
  const blockMatch = blogPostBlock(source);
  const block = blockMatch[1];
  const cards = block.match(/<article\b[\s\S]*?<\/article>/gi) || [];
  const card = renderBlogCard(post);
  const existingIndex = cards.findIndex((item) => articleFileFromCard(item) === post.fileName);
  const nextCards = [...cards];
  if (existingIndex >= 0) nextCards[existingIndex] = card;
  else nextCards.unshift(card);
  const replacement = `\n      ${nextCards.join("\n\n      ")}\n    `;
  return `${source.slice(0, blockMatch.index + "<!-- BLOG_POSTS_START -->".length)}${replacement}${source.slice(blockMatch.index + blockMatch[0].length - "<!-- BLOG_POSTS_END -->".length)}`;
}
