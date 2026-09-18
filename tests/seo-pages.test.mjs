import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function read(relativePath) {
  const absolutePath = resolve(root, relativePath);
  assert.equal(existsSync(absolutePath), true, `${relativePath} should exist`);
  return readFileSync(absolutePath, "utf8");
}

function tagContent(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match?.[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? "";
}

function blockByClass(html, tagName, className) {
  const pattern = new RegExp(`<${tagName}[^>]+class="[^"]*\\b${className}\\b[^"]*"[^>]*>[\\s\\S]*?<\\/${tagName}>`, "i");
  return html.match(pattern)?.[0] ?? "";
}

function linksIn(html) {
  return [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].map((match) => ({
    href: match[1],
    text: match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  }));
}

function listHtmlFiles(directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", "node_modules"].includes(entry.name)) return [];
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) return listHtmlFiles(absolutePath);
    return entry.isFile() && entry.name.endsWith(".html") ? [absolutePath] : [];
  });
}

test("homepage preserves the Seedance 3 primary search intent", () => {
  const html = read("index.html");
  assert.match(tagContent(html, "title"), /^SEEDANCE 3\.0 \| Multi-Modal AI Video Generator$/i);
  assert.match(tagContent(html, "h1"), /Seedance 3\.0/i);
  assert.doesNotMatch(tagContent(html, "h1"), /MiniMax|Nano Banana|GPT Image/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/seedance3-pro\.com\/">/i);
});

test("homepage presents a creator-facing experience instead of release-state messaging", () => {
  const html = read("index.html");
  assert.doesNotMatch(html, /Release status|Studio preview|Coming Soon/i);
  assert.match(html, /<a[^>]+href="\.\/app\/"[^>]*>\s*Generate Your First AI Video/i);
});

test("homepage omits the requested header, FAQ, and footer copy", () => {
  const html = read("index.html");
  const footer = blockByClass(html, "footer", "site-footer");

  assert.doesNotMatch(html, /Independent model guide/i);
  assert.doesNotMatch(html, /<nav[^>]+mobile-nav/i);
  assert.doesNotMatch(html, /<button[^>]+menu-button/i);
  assert.doesNotMatch(html, /Why does the studio show other AI models\?/i);
  assert.doesNotMatch(html, /Is this an official ByteDance website\?/i);
  assert.doesNotMatch(html, /Independent AI model coverage and creative workflow resources\./i);
  assert.doesNotMatch(footer, /<h3>SEEDANCE<\/h3>|<h3>Models<\/h3>|<h3>Resources<\/h3>/i);
  assert.doesNotMatch(footer, /Capabilities|Examples|Showcase|FAQ|MiniMax H3|Nano Banana 2 Lite|GPT Image 2|Model comparison|Guides|Pricing|Start for Free|Contact/i);
});

test("homepage exposes only Showcase and Blog in its compact navigation", () => {
  const html = read("index.html");
  const css = read("site.css");
  const header = blockByClass(html, "header", "site-header");
  const navigation = blockByClass(header, "nav", "compact-nav");

  assert.deepEqual(linksIn(navigation), [
    { href: "#showcase", text: "Showcase" },
    { href: "./blog.html", text: "Blog" },
  ]);
  assert.match(header, /<a[^>]+href="\.\/app\/"[^>]*>Start for Free<\/a>/i);
  assert.match(header, /<div class="header-actions primary-action">/i);
  assert.match(css, /\.header-actions\.primary-action\s*\{\s*display:\s*none;\s*\}/i);
  assert.match(css, /\.site-header \.brand\s*\{\s*white-space:\s*nowrap;\s*\}/i);
});

test("homepage hero keeps only the primary CTA and a single-line media caption", () => {
  const html = read("index.html");
  const css = read("site.css");
  const hero = blockByClass(html, "section", "hero");
  assert.doesNotMatch(hero, /Browse prompt guides/i);
  assert.doesNotMatch(hero, /Multimodal workflows|Cinematic prompt guides|Model comparisons/i);
  assert.doesNotMatch(hero, /Cinematic motion study/i);
  assert.match(hero, /<figcaption><strong>Reference · Camera · Light · Sound<\/strong><\/figcaption>/i);
  assert.match(css, /\.hero-media figcaption strong\s*\{[^}]*white-space:\s*nowrap/i);
});

test("blog uses the homepage design system without the highlighted intro copy", () => {
  const html = read("blog.html");
  const header = blockByClass(html, "header", "site-header");
  const navigation = blockByClass(header, "nav", "compact-nav");
  const expectedArticles = [
    ["./seedance-2-5-vs-minimax-h3-vs-kling-3-0-which-ai-video-model-is-best-in-2026-2.html", "Read article"],
    ["./how-to-control-character-poses-in-seedance-with-3d-pose-references.html", "Read article"],
    ["./how-to-use-the-seedance-api-complete-developer-guide-2026.html", "Read article"],
    ["./what-is-seedance-pro-features-pricing-how-to-get-started.html", "Read article"],
    ["./seedance-lite-vs-pro-which-plan-should-you-choose.html", "Read article"],
    ["./seedance-pricing-2026-all-plans-compared.html", "Read article"],
    ["./how-to-use-seedance-for-free-in-2026-all-free-methods.html", "Read article"],
    ["./seedance-2-5-image-to-video-guide.html", "Read guide"],
    ["./precise-application-of-seedance-prompts.html", "Read article"],
    ["./after-thorough-testing-the-conclusion-is-clear-seedance-2-0-s-universal-template-2.html", "Read article"],
    ["./seedance-2-0-complete-tutorial.html", "Read article"],
    ["./seedance-vs-kling-3-comparison.html", "Read comparison"],
    ["./seedance-tiktok-ad-video-guide.html", "Read playbook"],
  ];

  assert.match(html, /<link rel="stylesheet" href="\.\/site\.css">/i);
  assert.doesNotMatch(html, /cdn\.tailwindcss\.com|bg-slate-|text-indigo-/i);
  assert.deepEqual(linksIn(navigation), [{ href: "./blog.html", text: "Blog" }]);
  assert.doesNotMatch(html, /href="\.\/showcase\.html"/i);
  assert.doesNotMatch(header, /Start Creating/i);
  assert.doesNotMatch(html, /Tutorial Center|Seedance Tutorials and Long-Tail Guides|This blog section helps Seedance 3\.0 build topical authority/i);
  assert.match(html, /<!-- BLOG_POSTS_START -->[\s\S]*<!-- BLOG_POSTS_END -->/i);
  assert.equal((html.match(/<article class="blog-card card card-pad">/g) ?? []).length, expectedArticles.length);
  const articleBlock = html.match(/<!-- BLOG_POSTS_START -->([\s\S]*?)<!-- BLOG_POSTS_END -->/i)?.[1] ?? "";
  const articleLinks = linksIn(articleBlock).map(({ href, text }) => [href, text]);
  assert.deepEqual(articleLinks, expectedArticles);
  assert.match(html, /<footer class="site-footer">/i);
});

test("every Blog article detail page uses the homepage shell and only Home and Blog navigation", () => {
  const blog = read("blog.html");
  const articleBlock = blog.match(/<!-- BLOG_POSTS_START -->([\s\S]*?)<!-- BLOG_POSTS_END -->/i)?.[1] ?? "";
  const articlePaths = [...articleBlock.matchAll(/href="\.\/([^\"]+\.html)"/gi)].map((match) => match[1]);

  assert.ok(articlePaths.length > 0, "Blog should link at least one article detail page");
  for (const articlePath of articlePaths) {
    const html = read(articlePath);
    const header = blockByClass(html, "header", "site-header");
    const navigation = blockByClass(header, "nav", "compact-nav");

    assert.match(html, /<link rel="stylesheet" href="\.\/site\.css">/i, `${articlePath} should use site.css`);
    assert.doesNotMatch(html, /cdn\.tailwindcss\.com/i, `${articlePath} should not load Tailwind`);
    assert.deepEqual(linksIn(navigation), [
      { href: "./index.html", text: "Home" },
      { href: "./blog.html", text: "Blog" },
    ], `${articlePath} should expose only Home and Blog in its header navigation`);
    assert.doesNotMatch(header, /Start Creating|Features|Pricing/i, `${articlePath} should not expose legacy header actions`);
    assert.match(html, /<main class="article-main">/i, `${articlePath} should use the shared article layout`);
    assert.match(html, /<article class="(?:article-shell|article-content prose)">/i, `${articlePath} should use the shared article shell`);
    assert.match(html, /<(?:div|article) class="article-content prose">/i, `${articlePath} should use shared long-form typography`);
    assert.match(html, /<footer class="site-footer article-footer">/i, `${articlePath} should use the shared footer`);
  }
});

test("Seedance 2.5 owns the current image-to-video guide intent while 2.0 remains a legacy resource", () => {
  const currentPath = "seedance-2-5-image-to-video-guide.html";
  const legacyPath = "seedance-2-0-complete-tutorial.html";
  const currentUrl = `https://seedance3-pro.com/${currentPath}`;
  const legacyUrl = `https://seedance3-pro.com/${legacyPath}`;
  const current = read(currentPath);
  const legacy = read(legacyPath);
  const blog = read("blog.html");
  const sitemap = read("sitemap.xml");

  assert.equal((current.match(/<h1\b/gi) ?? []).length, 1);
  assert.match(tagContent(current, "title"), /^Seedance 2\.5 Image-to-Video Guide: Prompts, Settings &amp; Examples$/i);
  assert.match(tagContent(current, "h1"), /^Seedance 2\.5 Image-to-Video Guide$/i);
  assert.match(current, new RegExp(`<link rel="canonical" href="${currentUrl.replaceAll(".", "\\.")}">`, "i"));
  assert.match(current, /<meta name="description" content="[^"]{120,160}">/i);
  assert.match(current, /"@type"\s*:\s*"Article"/i);
  assert.match(current, /"@type"\s*:\s*"FAQPage"/i);
  assert.match(current, /How to use Seedance 2\.5 for image-to-video/i);
  assert.match(current, /Seedance 2\.5 prompt formula/i);
  assert.match(current, /Recommended settings/i);
  assert.match(current, /Prompt examples/i);
  assert.match(current, /Troubleshooting/i);
  assert.match(current, /Seedance 2\.0 vs Seedance 2\.5/i);
  assert.match(current, /https:\/\/seed\.bytedance\.com\/en\/blog\/one-take-creation-flexible-referencing-introducing-seedance-2-5/i);
  assert.match(current, /https:\/\/seed\.bytedance\.com\/en\/seedance2_5/i);
  assert.doesNotMatch(current, /site brand|official model version/i);

  const jsonLdBlocks = [...current.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((match) => JSON.parse(match[1]));
  const faqSchema = jsonLdBlocks.find((block) => block["@type"] === "FAQPage");
  assert.ok(faqSchema, "FAQ schema should be valid JSON-LD");
  const schemaFaqs = faqSchema.mainEntity.map((item) => [item.name, item.acceptedAnswer.text]);
  const visibleFaqBlock = current.match(/<div class="faq">([\s\S]*?)<\/div>/i)?.[1] ?? "";
  const visibleFaqs = [...visibleFaqBlock.matchAll(/<details>\s*<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>\s*<\/details>/gi)].map((match) => [
    match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  ]);
  assert.deepEqual(schemaFaqs, visibleFaqs, "FAQ schema must match the visible questions and answers");
  const articleHeader = blockByClass(current, "header", "site-header");
  assert.doesNotMatch(articleHeader, /aria-current="page"/i);

  assert.match(tagContent(legacy, "title"), /^Seedance 2\.0 Image-to-Video Tutorial \(Legacy Guide\) \| SEEDANCE Blog$/i);
  assert.match(tagContent(legacy, "h1"), /^Seedance 2\.0 Image-to-Video Tutorial \(Legacy Guide\)$/i);
  assert.doesNotMatch(tagContent(legacy, "title"), /2\.5/i);
  assert.doesNotMatch(tagContent(legacy, "h1"), /2\.5/i);
  assert.match(legacy, new RegExp(`<link rel="canonical" href="${legacyUrl.replaceAll(".", "\\.")}">`, "i"));
  assert.doesNotMatch(legacy, /site brand|official model version/i);

  const currentCardIndex = blog.indexOf(`href="./${currentPath}"`);
  const legacyCardIndex = blog.indexOf(`href="./${legacyPath}"`);
  assert.ok(currentCardIndex > -1, "Blog should link the current guide");
  assert.ok(legacyCardIndex > currentCardIndex, "Current guide should appear before the legacy guide");
  assert.match(blog, /<h2>Seedance 2\.5 Image-to-Video Guide: Prompts, Settings &amp; Examples<\/h2>[\s\S]*?href="\.\/seedance-2-5-image-to-video-guide\.html"/i);
  assert.match(blog, /<h2>Seedance 2\.0 Image-to-Video Tutorial \(Legacy Guide\)<\/h2>[\s\S]*?href="\.\/seedance-2-0-complete-tutorial\.html"[^>]*>Read article<\/a>/i);
  assert.equal((sitemap.match(new RegExp(currentUrl.replaceAll(".", "\\."), "g")) ?? []).length, 1);
});

test("homepage video showcase uses the supplied clips in order", () => {
  const html = read("index.html");
  const css = read("site.css");
  const script = read("main.js");
  const showcases = [...html.matchAll(/<section[^>]+id="showcase"[^>]*>([\s\S]*?)<\/section>/gi)];
  const expectedSources = [
    "https://cdn.metaso.cn/minimax-h3-example-video/h3-example-009.mp4",
    "https://cdn.metaso.cn/minimax-h3-example-video/02.mp4",
    "https://cdn.metaso.cn/minimax-h3-example-video/05.mp4",
    "https://cdn.metaso.cn/minimax-h3-example-video/11.mp4",
    "https://cdn.metaso.cn/minimax-h3-example-video/h3-example-007.mp4",
    "https://cdn.metaso.cn/minimax-h3-example-video/h3-example-013.mp4",
    "https://cdn.metaso.cn/minimax-h3-example-video/h3-example-024.mp4",
    "https://cdn.metaso.cn/minimax-h3-example-video/h3-example-006.mp4",
    "https://cdn.metaso.cn/minimax-h3-example-video/h3-example-001.mp4",
  ];

  assert.equal(showcases.length, 1);
  const ids = [...html.matchAll(/\sid="([^"]+)"/gi)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "homepage IDs must be unique");
  const previewCards = [...showcases[0][1].matchAll(/<article\b([^>]*\bclass="[^"]*\bshowcase-card\b[^"]*"[^>]*)>([\s\S]*?)<\/article>/gi)];
  assert.equal(previewCards.length, expectedSources.length);
  const previewButtons = previewCards.map(([, , content]) => content.match(/<button\b([^>]*\bclass="[^"]*\bshowcase-preview-button\b[^"]*"[^>]*)>([\s\S]*?)<\/button>/i));
  assert.ok(previewButtons.every(Boolean));
  assert.deepEqual(previewButtons.map((match) => match[1].match(/\bdata-video-src="([^"]+)"/i)?.[1]), expectedSources);
  for (const [index, [, , cardContent]] of previewCards.entries()) {
    const [, buttonAttributes, content] = previewButtons[index];
    assert.match(buttonAttributes, /\btype="button"/i);
    assert.match(buttonAttributes, new RegExp(`\\baria-label="Play showcase video ${index + 1}"`, "i"));
    const previewAttributes = content.match(/<video\b([^>]*)>/i)?.[1] ?? "";
    assert.match(previewAttributes, /\bclass="[^"]*\bshowcase-preview\b/i);
    assert.match(previewAttributes, /\bmuted\b/i);
    assert.match(previewAttributes, /\bplaysinline\b/i);
    assert.match(previewAttributes, /\bpreload="metadata"/i);
    assert.doesNotMatch(previewAttributes, /\bcontrols\b/i);
    assert.doesNotMatch(content, /\btabindex=/i);
    assert.match(content, /\bclass="[^"]*\bshowcase-play\b/i);
    assert.doesNotMatch(content, /<a\b/i);
    assert.match(cardContent, /Model: MiniMax H3/i);
    assert.match(cardContent, /As low as \$0\.01\/sec/i);
    assert.match(cardContent, /<a[^>]+class="[^"]*\bshowcase-try\b[^>]+href="\.\/app\/\?model=minimax-h3"[^>]*>\s*Try it\s*<\/a>/i);
    assert.match(cardContent, /<div class="showcase-title-row">\s*<strong>Model: MiniMax H3<\/strong>\s*<a[^>]+class="showcase-try"[^>]*>\s*Try it\s*<\/a>\s*<\/div>\s*<span>As low as \$0\.01\/sec<\/span>/i);
  }

  const dialog = html.match(/<dialog\b([^>]*)>([\s\S]*?)<\/dialog>/i);
  assert.ok(dialog, "homepage should include one shared video dialog");
  assert.match(dialog[1], /\bid="showcase-player"/i);
  assert.match(dialog[1], /\baria-label="Showcase video player"/i);
  assert.match(dialog[2], /<button[^>]+class="[^"]*\bvideo-dialog-close\b[^>]+aria-label="Close video player"/i);
  assert.match(dialog[2], /<video[^>]+class="[^"]*\bvideo-dialog-player\b[^>]+\bcontrols\b[^>]*>/i);
  assert.doesNotMatch(showcases[0][1], /Prompt intelligence|Prompt library|Model comparisons/i);
  assert.match(css, /\.video-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);[^}]*\}/i);
  assert.match(css, /\.video-grid\s*\{\s*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);\s*\}/i);
  assert.match(css, /\.video-grid\s*\{\s*grid-template-columns:\s*1fr;\s*\}/i);
  assert.match(css, /\.showcase-card:hover\s+\.showcase-play\s*\{[^}]*opacity:\s*1/i);
  assert.match(css, /\.showcase-title-row\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*gap:\s*10px;/i);
  assert.match(css, /\.showcase-preview-button:focus-visible\s+\.showcase-play\s*\{[^}]*opacity:\s*1/i);
  assert.match(css, /\.video-dialog\s*\{[^}]*width:\s*min\(92vw,\s*1500px,\s*calc\(177\.7778dvh\s*-\s*85\.3333px\)\)/i);
  assert.match(css, /\.video-dialog\s*\{[^}]*width:\s*min\(96vw,\s*calc\(177\.7778dvh\s*-\s*56\.8889px\)\)/i);
  assert.match(script, /querySelectorAll\("\.showcase-preview-button"\)/);
  assert.match(script, /const source = card\.dataset\.videoSrc;/);
  assert.match(script, /dialogPlayer\.src = source;/);
  assert.match(script, /\.showModal\(\)/);
  assert.match(script, /\.play\(\)/);
  assert.match(script, /dialogCloseButton\.addEventListener\("click",\s*\(\) => videoDialog\.close\(\)\)/);
  assert.match(script, /videoDialog\.addEventListener\("click"/);
  assert.match(script, /if \(event\.target === videoDialog\) videoDialog\.close\(\);/);
  assert.match(script, /videoDialog\.addEventListener\("close"/);
  assert.match(script, /dialogPlayer\.pause\(\)/);
  assert.match(script, /dialogPlayer\.removeAttribute\("src"\)/);
  assert.match(script, /dialogPlayer\.load\(\)/);
  assert.match(script, /document\.body\.classList\.remove\("modal-open"\)/);
  assert.match(script, /activeShowcaseCard\?\.focus\(\)/);
});

test("the API guide has one indexable primary URL", () => {
  const primaryPath = "how-to-use-the-seedance-api-complete-developer-guide-2026.html";
  const aliasPath = "how-to-use-the-seedance-api-complete-developer-guide-2026-2.html";
  const primaryUrl = `https://seedance3-pro.com/${primaryPath}`;
  const primary = read(primaryPath);
  const alias = read(aliasPath);
  const blog = read("blog.html");
  const sitemap = read("sitemap.xml");

  assert.match(primary, /<meta name="robots" content="index,follow[^\"]*">/i);
  assert.match(primary, new RegExp(`<link rel="canonical" href="${primaryUrl.replaceAll(".", "\\.")}">`, "i"));
  assert.match(alias, /<meta name="robots" content="noindex,follow">/i);
  assert.match(alias, new RegExp(`<link rel="canonical" href="${primaryUrl.replaceAll(".", "\\.")}">`, "i"));
  assert.match(alias, new RegExp(`(?:url=|location\\.replace\\()[^>]*${primaryPath.replaceAll(".", "\\.")}`, "i"));
  assert.equal((blog.match(new RegExp(primaryPath.replaceAll(".", "\\."), "g")) ?? []).length, 1);
  assert.equal((blog.match(new RegExp(aliasPath.replaceAll(".", "\\."), "g")) ?? []).length, 0);
  assert.equal((sitemap.match(new RegExp(primaryUrl.replaceAll(".", "\\."), "g")) ?? []).length, 1);
  assert.equal((sitemap.match(new RegExp(aliasPath.replaceAll(".", "\\."), "g")) ?? []).length, 0);
});

test("every imported article has one document title and one H1", () => {
  for (const absolutePath of listHtmlFiles()) {
    const html = readFileSync(absolutePath, "utf8");
    if (!/<meta property="og:type" content="article">/i.test(html)) continue;
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
    const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? "";
    assert.equal((head.match(/<title\b/gi) ?? []).length, 1, `${absolutePath} should have one head title`);
    assert.equal((body.match(/<title\b/gi) ?? []).length, 0, `${absolutePath} should not have a body title`);
    assert.equal((body.match(/<h1\b/gi) ?? []).length, 1, `${absolutePath} should have one H1`);
    assert.doesNotMatch(body, /data-lark-record-data|<mpcpc\b|\s(?:leaf|textstyle|link-id|data-start|data-end)=/i, absolutePath);
  }
});

test("article sanitizer preserves useful markup and removes imported editor cruft", async () => {
  const { sanitizeArticleHtml } = await import("../scripts/article-html.mjs");
  const input = `<title>Nested title</title>
    <h1 data-section-id="intro" onclick="alert(1)">Imported heading</h1>
    <p leaf="" style="color:red">Keep <strong>this text</strong>.</p>
    <a href="https://example.com/guide" target="_blank">HTTPS</a>
    <a href="./internal.html">Relative</a><a href="/pricing.html">Root</a><a href="#details">Hash</a>
    <a href="javascript:alert(1)">Unsafe link</a>
    <img src="./blog-assets/example.png" alt="Example"><img src="/assets/example.webp" alt="Root image">
    <ul><li>List item</li></ul><pre><code class="language-js">const ok = true;</code></pre>
    <mpcpc manual-insert="1"></mpcpc>
    <span data-lark-record-data="large-editor-payload"></span>`;
  const output = sanitizeArticleHtml(input);

  assert.doesNotMatch(output, /<title|<h1|onclick|style=|data-section-id|leaf=|javascript:|mpcpc|data-lark/i);
  assert.match(output, /<h2>Imported heading<\/h2>/i);
  assert.match(output, /Keep <strong>this text<\/strong>\./i);
  assert.match(output, /href="https:\/\/example\.com\/guide"/i);
  assert.match(output, /href="\.\/internal\.html"/i);
  assert.match(output, /href="\/pricing\.html"/i);
  assert.match(output, /href="#details"/i);
  assert.match(output, /Unsafe link/i);
  assert.match(output, /src="\.\/blog-assets\/example\.png"/i);
  assert.match(output, /src="\/assets\/example\.webp"/i);
  assert.match(output, /<ul><li>List item<\/li><\/ul>/i);
  assert.match(output, /<pre><code class="language-js">const ok = true;<\/code><\/pre>/i);
});

test("Blog article normalization preserves SEO metadata and content and is idempotent", async () => {
  const { normalizeBlogArticleDocument } = await import("../scripts/article-html.mjs");
  const jsonLd = `{"@context":"https://schema.org","@type":"Article","headline":"A precise title"}`;
  const input = `<!doctype html>
<html lang="en"><head>
  <title>SEO document title | SEEDANCE Blog</title>
  <meta name="description" content="Description stays exactly the same.">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="https://seedance3-pro.com/example.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="Open Graph title">
  <meta name="twitter:title" content="Twitter title">
  <script type="application/ld+json">${jsonLd}</script>
  <script src="https://cdn.tailwindcss.com"></script>
</head><body class="bg-slate-950 text-slate-100 antialiased">
  <header class="sticky top-0"><a href="./index.html">SEEDANCE 3.0</a><nav><a href="./blog.html">Blog</a><a href="./features.html">Features</a></nav><a href="#generator">Start Creating</a></header>
  <main class="mx-auto max-w-4xl"><article>
    <p class="text-xs">Tutorial</p><h1 class="text-5xl">Visible article heading</h1>
    <p class="mt-6">Lead paragraph with <a href="./kept-link.html">a kept link</a>.</p>
    <div class="article-content"><h2>Body heading</h2><p>Body copy stays intact.</p><pre><code class="language-js">const kept = true;</code></pre></div>
  </article></main>
  <footer class="border-t"><p>Old footer</p></footer>
</body></html>`;
  const output = normalizeBlogArticleDocument(input);

  for (const preserved of [
    "<title>SEO document title | SEEDANCE Blog</title>",
    '<meta name="description" content="Description stays exactly the same.">',
    '<meta name="robots" content="index,follow,max-image-preview:large">',
    '<link rel="canonical" href="https://seedance3-pro.com/example.html">',
    '<meta property="og:title" content="Open Graph title">',
    '<meta name="twitter:title" content="Twitter title">',
    `<script type="application/ld+json">${jsonLd}</script>`,
    '<a href="./kept-link.html">a kept link</a>',
    '<pre><code class="language-js">const kept = true;</code></pre>',
  ]) {
    assert.match(output, new RegExp(preserved.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(output, /<link rel="stylesheet" href="\.\/site\.css">/i);
  assert.doesNotMatch(output, /cdn\.tailwindcss\.com|Start Creating|Features/i);
  assert.deepEqual(linksIn(blockByClass(output, "nav", "compact-nav")), [
    { href: "./index.html", text: "Home" },
    { href: "./blog.html", text: "Blog" },
  ]);
  assert.equal(normalizeBlogArticleDocument(output), output, "normalization should be idempotent");
});

test("both CMS publishers use the shared article renderer", () => {
  for (const fileName of ["server.local.js", "worker.js"]) {
    const source = read(fileName);
    assert.match(source, /import\s*\{[^}]*\brenderArticleDocument\b[^}]*\}\s*from\s*["']\.\/scripts\/article-html\.mjs["']/i);
    assert.match(source, /return\s+renderArticleDocument\(\{[\s\S]*?title,[\s\S]*?content,[\s\S]*?canonical[\s\S]*?\}\);/i);
    assert.doesNotMatch(source, /cdn\.tailwindcss\.com|Start Creating/i);
  }
});

test("footer guide phrase is absent from every HTML page", () => {
  for (const absolutePath of listHtmlFiles()) {
    assert.doesNotMatch(readFileSync(absolutePath, "utf8"), /Independent AI video model guide/i, absolutePath);
  }
});

test("CMS blog publishers emit and parse the shared Blog card classes", () => {
  const localServer = read("server.local.js");
  const worker = read("worker.js");
  const sharedBlogHtml = read("scripts/blog-cms-html.mjs");

  assert.match(sharedBlogHtml, /<article class="blog-card card card-pad">/);
  assert.match(sharedBlogHtml, /class="blog-card-category tag lime"/);
  assert.match(sharedBlogHtml, /class="blog-card-excerpt"/);
  assert.match(sharedBlogHtml, /class="card-link"/);
  assert.match(sharedBlogHtml, /export function parseBlogPosts/);
  assert.match(sharedBlogHtml, /export function upsertBlogCardHtml/);

  for (const source of [localServer, worker]) {
    assert.match(source, /import\s*\{[^}]*\bparseBlogPosts\b[^}]*\bupsertBlogCardHtml\b[^}]*\}\s*from\s*["']\.\/scripts\/blog-cms-html\.mjs["']/i);
    assert.doesNotMatch(source, /<article class="rounded-2xl border border-white\/10 bg-slate-900\/60 p-6">/);
  }
});

test("homepage uses distinct high-quality raster artwork", () => {
  const html = read("index.html");
  assert.match(html, /<img[^>]+class="hero-art"[^>]+src="\.\/assets\/seedance3-cinematic-hero\.(?:png|jpe?g|webp)"/i);
  const storyImages = [...html.matchAll(/<img[^>]+class="story-image"[^>]+src="([^"]+)"/gi)].map((match) => match[1]);
  assert.equal(storyImages.length, 3);
  assert.equal(new Set(storyImages).size, 3);
});

const publicPages = [
  {
    file: "minimax-h3-ai-video-generator.html",
    title: /MiniMax H3 AI Video Generator/i,
    h1: /MiniMax H3 AI Video Generator/i,
    canonical: "https://seedance3-pro.com/minimax-h3-ai-video-generator.html",
  },
  {
    file: "nano-banana-2-lite.html",
    title: /Nano Banana 2 Lite/i,
    h1: /Nano Banana 2 Lite/i,
    canonical: "https://seedance3-pro.com/nano-banana-2-lite.html",
  },
  {
    file: "gpt-image-2.html",
    title: /GPT Image 2/i,
    h1: /GPT Image 2/i,
    canonical: "https://seedance3-pro.com/gpt-image-2.html",
  },
  {
    file: "minimax-h3-vs-seedance-3.html",
    title: /MiniMax H3 vs Seedance 3/i,
    h1: /MiniMax H3 vs Seedance 3/i,
    canonical: "https://seedance3-pro.com/minimax-h3-vs-seedance-3.html",
  },
];

for (const page of publicPages) {
  test(`${page.file} has a unique indexable search target`, () => {
    const html = read(page.file);
    assert.match(tagContent(html, "title"), page.title);
    assert.match(tagContent(html, "h1"), page.h1);
    assert.match(html, new RegExp(`<link rel="canonical" href="${page.canonical.replaceAll(".", "\\.")}">`, "i"));
    assert.match(html, /<meta name="description" content="[^"]{80,}">/i);
    assert.doesNotMatch(html, /<meta name="robots" content="noindex/i);
  });
}

test("studio preview exposes the planned models without entering the index", () => {
  const html = read("app/legacy-preview.html");
  assert.match(html, /<meta name="robots" content="noindex,follow">/i);
  assert.match(html, /MiniMax H3/i);
  assert.match(html, /Seedance 3\.0/i);
  assert.match(html, /Coming Soon/i);
  assert.match(html, /Nano Banana 2 Lite/i);
  assert.match(html, /GPT Image 2/i);
  assert.match(html, /Generate image · 5 credits/i);
});

test("studio header keeps only the Home link", () => {
  const html = read("app/legacy-preview.html");
  const header = blockByClass(html, "header", "workspace-header");

  assert.deepEqual(linksIn(header), [{ href: "../", text: "Home" }]);
  assert.doesNotMatch(header, /Model guides|Prompts|Preview mode|Release status/i);
});

test("studio omits the requested preview, guide, and status copy", () => {
  const html = read("app/legacy-preview.html");
  const script = read("app/studio.js");

  assert.doesNotMatch(html, /id="model-description"|id="context-copy"|id="context-link"|class="generation-note"|context-card compact/i);
  assert.doesNotMatch(html, /Text, image, video, and audio context with native stereo sound|This independent site currently offers a workflow preview|Read the MiniMax H3 guide|STUDIO STATUS|Frontend preview|Backend not connected|Indexing|This page demonstrates the planned workflow|Static product preview|No generation jobs are submitted/i);
  assert.doesNotMatch(script, /modelDescription|contextCopy|contextLink/);
  assert.match(html, /<h1 id="model-name">GPT Image 2<\/h1>/i);
  assert.doesNotMatch(html, /id="context-title"|MODEL NOTE/i);
  assert.match(html, /<button class="generate-button"[^>]*>[\s\S]*Generate image · 5 credits[\s\S]*<\/button>/i);
  assert.match(html, /<div class="sidebar-foot"><a href="\.\.\/">← Back to SEEDANCE 3\.0<\/a><\/div>/i);
});

test("sitemap includes public model pages and excludes the studio preview", () => {
  const sitemap = read("sitemap.xml");
  for (const page of publicPages) {
    assert.match(sitemap, new RegExp(page.file.replaceAll(".", "\\.")));
  }
  assert.doesNotMatch(sitemap, /\/app(?:\/|<)/i);
});
