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

  assert.doesNotMatch(html, /Independent model guide/i);
  assert.doesNotMatch(html, /<nav[^>]+mobile-nav/i);
  assert.doesNotMatch(html, /<button[^>]+menu-button/i);
  assert.doesNotMatch(html, /Why does the studio show other AI models\?/i);
  assert.doesNotMatch(html, /Is this an official ByteDance website\?/i);
  assert.doesNotMatch(html, /Independent AI model coverage and creative workflow resources\./i);
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

test("blog uses the homepage design system without the highlighted intro copy", () => {
  const html = read("blog.html");
  const header = blockByClass(html, "header", "site-header");
  const navigation = blockByClass(header, "nav", "compact-nav");
  const expectedArticles = [
    ["./how-to-use-the-seedance-api-complete-developer-guide-2026-2.html", "Read article"],
    ["./how-to-use-the-seedance-api-complete-developer-guide-2026.html", "Read article"],
    ["./what-is-seedance-pro-features-pricing-how-to-get-started.html", "Read article"],
    ["./seedance-lite-vs-pro-which-plan-should-you-choose.html", "Read article"],
    ["./seedance-pricing-2026-all-plans-compared.html", "Read article"],
    ["./how-to-use-seedance-for-free-in-2026-all-free-methods.html", "Read article"],
    ["./precise-application-of-seedance-prompts.html", "Read article"],
    ["./after-thorough-testing-the-conclusion-is-clear-seedance-2-0-s-universal-template-2.html", "Read article"],
    ["./seedance-2-0-complete-tutorial.html", "Read tutorial"],
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

test("homepage video showcase uses the supplied clips in order", () => {
  const html = read("index.html");
  const css = read("site.css");
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
  const videoTags = [...showcases[0][1].matchAll(/<video\b([^>]*)>/gi)];
  assert.deepEqual(videoTags.map((match) => match[1].match(/\bsrc="([^"]+)"/i)?.[1]), expectedSources);
  for (const [, attributes] of videoTags) {
    assert.match(attributes, /\bcontrols\b/i);
    assert.match(attributes, /\bplaysinline\b/i);
    assert.match(attributes, /\bpreload="metadata"/i);
  }
  assert.doesNotMatch(showcases[0][1], /Prompt intelligence|Prompt library|Model comparisons/i);
  assert.match(css, /\.video-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);[^}]*\}/i);
  assert.match(css, /\.video-grid\s*\{\s*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);\s*\}/i);
  assert.match(css, /\.video-grid\s*\{\s*grid-template-columns:\s*1fr;\s*\}/i);
});

test("footer guide phrase is absent from every HTML page", () => {
  for (const absolutePath of listHtmlFiles()) {
    assert.doesNotMatch(readFileSync(absolutePath, "utf8"), /Independent AI video model guide/i, absolutePath);
  }
});

test("CMS blog publishers emit and parse the shared Blog card classes", () => {
  const localServer = read("server.local.js");
  const worker = read("worker.js");

  for (const source of [localServer, worker]) {
    assert.match(source, /<article class="blog-card card card-pad">/);
    assert.match(source, /class="blog-card-category tag lime"/);
    assert.match(source, /class="blog-card-excerpt"/);
    assert.match(source, /class="card-link"/);
    assert.doesNotMatch(source, /<article class="rounded-2xl border border-white\/10 bg-slate-900\/60 p-6">/);
  }
  assert.match(localServer, /card\.match\(\/<p class="blog-card-excerpt">/);
  assert.match(localServer, /card\.match\(\/<p class="blog-card-category tag lime">/);
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
  const html = read("app/index.html");
  assert.match(html, /<meta name="robots" content="noindex,follow">/i);
  assert.match(html, /MiniMax H3/i);
  assert.match(html, /Seedance 3\.0/i);
  assert.match(html, /Coming Soon/i);
  assert.match(html, /Nano Banana 2 Lite/i);
  assert.match(html, /GPT Image 2/i);
  assert.match(html, /Generation coming soon/i);
});

test("sitemap includes public model pages and excludes the studio preview", () => {
  const sitemap = read("sitemap.xml");
  for (const page of publicPages) {
    assert.match(sitemap, new RegExp(page.file.replaceAll(".", "\\.")));
  }
  assert.doesNotMatch(sitemap, /\/app(?:\/|<)/i);
});
