import test from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const primary = "how-to-use-the-seedance-api-complete-developer-guide-2026.html";
const alias = "how-to-use-the-seedance-api-complete-developer-guide-2026-2.html";

test("duplicate cleanup deterministically retains the non-suffixed API URL", () => {
  const fixture = mkdtempSync(join(tmpdir(), "seedance-blog-cleanup-"));
  try {
    cpSync(resolve(root, "scripts", "cleanup-blog-duplicates.mjs"), join(fixture, "cleanup-blog-duplicates.mjs"));
    cpSync(resolve(root, "scripts", "public-urls.mjs"), join(fixture, "public-urls.mjs"));
    const card = (fileName) => `<article><h2>How to Use the Seedance API: Complete Developer Guide 2026</h2><a href="./${fileName}">Read article</a></article>`;
    writeFileSync(join(fixture, "blog.html"), `<!-- BLOG_POSTS_START -->${card(alias)}${card(primary)}<!-- BLOG_POSTS_END -->`, "utf8");
    writeFileSync(join(fixture, "sitemap.xml"), `<urlset><url><loc>https://seedance3-pro.com/${alias}</loc></url><url><loc>https://seedance3-pro.com/${primary}</loc></url></urlset>`, "utf8");
    writeFileSync(join(fixture, primary), "<html><head><title>Primary</title></head><body><h1>Primary</h1></body></html>", "utf8");
    writeFileSync(join(fixture, alias), "<html><head><title>Alias</title></head><body><h1>Alias</h1></body></html>", "utf8");

    const result = spawnSync(process.execPath, [join(fixture, "cleanup-blog-duplicates.mjs")], { cwd: fixture, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const blog = readFileSync(join(fixture, "blog.html"), "utf8");
    const sitemap = readFileSync(join(fixture, "sitemap.xml"), "utf8");
    const aliasHtml = readFileSync(join(fixture, alias), "utf8");
    assert.equal((blog.match(new RegExp(primary.replaceAll(".", "\\."), "g")) ?? []).length, 1);
    assert.equal((blog.match(new RegExp(alias.replaceAll(".", "\\."), "g")) ?? []).length, 0);
    assert.equal((sitemap.match(new RegExp(primary.replace(/\.html$/, "").replaceAll(".", "\\."), "g")) ?? []).length, 1);
    assert.equal((sitemap.match(new RegExp(alias.replaceAll(".", "\\."), "g")) ?? []).length, 0);
    assert.match(aliasHtml, /noindex,follow/i);
    assert.match(aliasHtml, new RegExp(`canonical[^>]+${primary.replace(/\.html$/, "").replaceAll(".", "\\.")}`, "i"));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
