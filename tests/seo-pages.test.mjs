import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

test("homepage preserves the Seedance 3 primary search intent", () => {
  const html = read("index.html");
  assert.match(tagContent(html, "title"), /^SEEDANCE 3\.0 \| Multi-Modal AI Video Generator$/i);
  assert.match(tagContent(html, "h1"), /Seedance 3\.0/i);
  assert.doesNotMatch(tagContent(html, "h1"), /MiniMax|Nano Banana|GPT Image/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/seedance3-pro\.com\/">/i);
  assert.match(html, /Coming Soon/i);
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
