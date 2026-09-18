import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  extractEditableArticleData,
  extractEditableArticleContent,
  renderArticleDocument,
  updateArticleDocument,
} from "../scripts/article-html.mjs";
import {
  parseBlogPosts,
  upsertBlogCardHtml,
  validateEditableBlogArticle,
} from "../scripts/blog-cms-html.mjs";
import { buildEditorLink } from "../scripts/editor-link.mjs";

const root = resolve(import.meta.dirname, "..");
const read = (fileName) => readFileSync(resolve(root, fileName), "utf8");

function makeBlog(cards) {
  return `<!doctype html><body><!-- BLOG_POSTS_START -->\n${cards.join("\n")}\n<!-- BLOG_POSTS_END --></body>`;
}

function makeCard({ fileName, title, excerpt, category }) {
  return `<article class="blog-card card card-pad">
    <p class="blog-card-category tag lime">${category}</p>
    <h2>${title}</h2>
    <p class="blog-card-excerpt">${excerpt}</p>
    <a href="./${fileName}" class="card-link">Read article</a>
  </article>`;
}

test("extractEditableArticleContent returns the complete nested article body", () => {
  const html = renderArticleDocument({
    title: "Nested article",
    excerpt: "Existing excerpt",
    category: "Tutorial",
    canonical: "https://seedance3-pro.com/nested-article.html",
    content: '<p>Opening.</p><div><h2>Nested section</h2><div><p>Deep copy.</p></div></div><p>Closing.</p>',
  });

  const content = extractEditableArticleContent(html);
  assert.match(content, /^\s*<p>Opening\.<\/p>/);
  assert.match(content, /<div><h2>Nested section<\/h2><div><p>Deep copy\.<\/p><\/div><\/div>/);
  assert.match(content, /<p>Closing\.<\/p>\s*$/);
});

test("updateArticleDocument updates editable SEO fields and preserves URL identity and unrelated schema", () => {
  const originalArticleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Original title",
    description: "Original excerpt",
    datePublished: "2026-08-10",
    dateModified: "2026-08-10",
    author: { "@type": "Organization", name: "SEEDANCE 3.0" },
    image: "https://seedance3-pro.com/og-cover.svg",
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [{ "@type": "Question", name: "Kept?", acceptedAnswer: { "@type": "Answer", text: "Yes." } }],
  };
  let html = renderArticleDocument({
    title: "Original title",
    excerpt: "Original excerpt",
    category: "Tutorial",
    canonical: "https://seedance3-pro.com/original-url.html",
    content: "<p>Original body.</p>",
  });
  html = html.replace("</head>", `  <meta name="custom-field" content="keep-me">\n  <script type="application/ld+json">${JSON.stringify(originalArticleSchema)}</script>\n  <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>\n</head>`);

  const updated = updateArticleDocument(html, {
    title: "Edited <title>",
    excerpt: "Edited & improved excerpt",
    category: "Comparison",
    content: '<h2>Edited body</h2><p>Useful <strong>copy</strong>.</p><script>alert("removed")</script>',
    modifiedDate: "2026-09-13",
  });

  assert.match(updated, /<title>Edited &lt;title&gt; \| SEEDANCE Blog<\/title>/);
  assert.match(updated, /<meta name="description" content="Edited &amp; improved excerpt">/);
  assert.match(updated, /<meta property="og:title" content="Edited &lt;title&gt;">/);
  assert.match(updated, /<meta property="og:description" content="Edited &amp; improved excerpt">/);
  assert.match(updated, /<meta name="twitter:title" content="Edited &lt;title&gt;">/);
  assert.match(updated, /<meta name="twitter:description" content="Edited &amp; improved excerpt">/);
  assert.match(updated, /<p class="eyebrow article-category">Comparison<\/p>/);
  assert.match(updated, /<h1 class="article-title">Edited &lt;title&gt;<\/h1>/);
  assert.match(updated, /<p class="article-lead">Edited &amp; improved excerpt<\/p>/);
  assert.match(updated, /<h2>Edited body<\/h2><p>Useful <strong>copy<\/strong>\.<\/p>/);
  assert.doesNotMatch(updated, /alert\(|Original body/);
  assert.match(updated, /<link rel="canonical" href="https:\/\/seedance3-pro\.com\/original-url\.html">/);
  assert.match(updated, /<meta property="og:url" content="https:\/\/seedance3-pro\.com\/original-url\.html">/);
  assert.match(updated, /<meta name="custom-field" content="keep-me">/);
  assert.equal((updated.match(/<h1\b/gi) || []).length, 1);

  const schemas = [...updated.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((match) => JSON.parse(match[1]));
  const article = schemas.find((schema) => schema["@type"] === "Article");
  const faq = schemas.find((schema) => schema["@type"] === "FAQPage");
  assert.equal(article.headline, "Edited <title>");
  assert.equal(article.description, "Edited & improved excerpt");
  assert.equal(article.dateModified, "2026-09-13");
  assert.equal(article.datePublished, originalArticleSchema.datePublished);
  assert.deepEqual(article.author, originalArticleSchema.author);
  assert.equal(article.image, originalArticleSchema.image);
  assert.deepEqual(faq, faqSchema);
});

test("editing preserves authored body classes and safe inline presentation", () => {
  const html = renderArticleDocument({
    title: "Styled guide",
    excerpt: "Styled excerpt",
    category: "Tutorial",
    canonical: "https://seedance3-pro.com/styled-guide.html",
    content: '<div class="status-panel"><span class="tag lime">Note</span><p style="text-align: center; margin-top: 12px">Keep this layout.</p></div>',
  });
  const body = extractEditableArticleContent(html);
  const updated = updateArticleDocument(html, {
    title: "Styled guide renamed",
    excerpt: "Styled excerpt",
    category: "Tutorial",
    content: body,
    modifiedDate: "2026-09-13",
  });

  assert.match(updated, /class="status-panel"/);
  assert.match(updated, /class="tag lime"/);
  assert.match(updated, /style="text-align: center; margin-top: 12px"/);
});

test("editable article data falls back to article metadata when a Blog card has no excerpt", () => {
  const html = renderArticleDocument({
    title: "Metadata title",
    excerpt: "Existing SEO description",
    category: "Playbook",
    canonical: "https://seedance3-pro.com/metadata-guide.html",
    content: "<p>Body.</p>",
  });
  const data = extractEditableArticleData(html);
  assert.equal(data.title, "Metadata title");
  assert.equal(data.excerpt, "Existing SEO description");
  assert.equal(data.category, "Playbook");
  assert.equal(data.content, "<p>Body.</p>");
});

test("Article JSON-LD serialization cannot be closed by edited metadata", () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Original",
    description: "Original",
    datePublished: "2026-09-01",
  };
  let html = renderArticleDocument({
    title: "Original",
    excerpt: "Original",
    category: "Tutorial",
    canonical: "https://seedance3-pro.com/jsonld-guide.html",
    content: "<p>Body.</p>",
  });
  html = html.replace("</head>", `  <script type="application/ld+json">${JSON.stringify(schema)}</script>\n</head>`);
  const hostile = '</script><script>alert("stored")</script>';
  const updated = updateArticleDocument(html, {
    title: hostile,
    excerpt: hostile,
    category: "Tutorial",
    content: "<p>Body.</p>",
    modifiedDate: "2026-09-13",
  });

  assert.doesNotMatch(updated, /<\/script><script>alert\("stored"\)<\/script>/);
  const rawSchema = updated.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i)?.[1];
  assert.equal(JSON.parse(rawSchema).headline, hostile);
});

test("Blog helpers validate ownership and replace an edited card in place", () => {
  const first = { fileName: "first-guide.html", title: "First", excerpt: "First excerpt", category: "Tutorial" };
  const second = { fileName: "second-guide.html", title: "Second", excerpt: "Second excerpt", category: "Playbook" };
  const blog = makeBlog([makeCard(first), makeCard(second)]);
  const articleHtml = renderArticleDocument({ ...first, canonical: `https://seedance3-pro.com/${first.fileName}`, content: "<p>Body.</p>" });

  assert.equal(validateEditableBlogArticle({ fileName: first.fileName, blogHtml: blog, articleHtml }), first.fileName);
  for (const invalid of ["../first-guide.html", "/first-guide.html", "C:\\first-guide.html", "first-guide.htm", "", "index.html"]) {
    assert.throws(() => validateEditableBlogArticle({ fileName: invalid, blogHtml: blog, articleHtml }), /editable Blog article/i);
  }
  assert.throws(() => validateEditableBlogArticle({ fileName: "missing.html", blogHtml: blog, articleHtml: null }), /editable Blog article/i);
  const redirect = '<meta name="robots" content="noindex,follow"><link rel="canonical" href="https://seedance3-pro.com/first-guide.html">';
  assert.throws(() => validateEditableBlogArticle({ fileName: first.fileName, blogHtml: blog, articleHtml: redirect }), /editable Blog article/i);
  const alias = articleHtml
    .replace("https://seedance3-pro.com/first-guide.html", "https://seedance3-pro.com/other-guide.html")
    .replace("https://seedance3-pro.com/first-guide.html", "https://seedance3-pro.com/other-guide.html");
  assert.throws(() => validateEditableBlogArticle({ fileName: first.fileName, blogHtml: blog, articleHtml: alias }), /editable Blog article/i);

  const updated = upsertBlogCardHtml(blog, { ...first, title: "Edited First", excerpt: "Edited excerpt", category: "Comparison" });
  const posts = parseBlogPosts(updated);
  assert.equal(posts.length, 2);
  assert.deepEqual(posts[0], { id: "0-first-guide.html", fileName: "first-guide.html", title: "Edited First", excerpt: "Edited excerpt", category: "Comparison" });
  assert.equal(posts[1].fileName, second.fileName);
  assert.equal((updated.match(/first-guide\.html/g) || []).length, 1);
});

test("every article currently listed on Blog can be loaded into the editor", () => {
  const blogHtml = read("blog.html");
  const posts = parseBlogPosts(blogHtml);
  assert.ok(posts.length > 0, "Blog should list at least one editable article");

  for (const post of posts) {
    const articleHtml = read(post.fileName);
    assert.equal(
      validateEditableBlogArticle({ fileName: post.fileName, blogHtml, articleHtml }),
      post.fileName,
    );
    const article = extractEditableArticleData(articleHtml);
    assert.ok(article.content.length > 0, `${post.fileName} should have editable body content`);

    const updated = updateArticleDocument(articleHtml, {
      title: article.title,
      excerpt: article.excerpt,
      category: post.category || article.category,
      content: article.content,
      modifiedDate: "2026-09-13",
    });
    const beforeClasses = [...article.content.matchAll(/\bclass="([^"]*)"/gi)].map((match) => match[1]);
    const afterClasses = [...extractEditableArticleContent(updated).matchAll(/\bclass="([^"]*)"/gi)].map((match) => match[1]);
    assert.deepEqual(afterClasses, beforeClasses, `${post.fileName} should retain its authored body classes`);
  }
});

test("CMS surfaces expose safe edit loading and preserve edit state through save", () => {
  const admin = read("admin/index.html");
  const localServer = read("server.local.js");
  const worker = read("worker.js");

  assert.match(admin, /class="edit-post-btn[^\"]*"/);
  assert.match(admin, /id="edit-status"/);
  assert.match(admin, /id="cancel-edit-btn"/);
  assert.match(admin, /fetch\(`\/api\/post\?fileName=\$\{encodeURIComponent\(fileName\)\}`\)/);
  assert.match(admin, /fileName:\s*activeEditFileName/);
  assert.match(admin, /保存修改并推送 GitHub/);
  assert.match(admin, /function\s+clearEditState\(/);

  assert.match(localServer, /app\.get\("\/api\/post"/);
  assert.match(localServer, /validateEditableBlogArticle/);
  assert.match(localServer, /fileName:\s*editFileName/);
  assert.match(localServer, /app\.listen\(port,\s*"127\.0\.0\.1"/);

  assert.match(worker, /url\.pathname === "\/api\/post"/);
  assert.match(worker, /handleGetPost/);
  assert.match(worker, /isAuthorized\(request, env\)/);
  assert.match(worker, /validateEditableBlogArticle/);
  assert.match(worker, /fileName:\s*editFileName/);
});

test("CMS publishing stops polling when a job is lost or reaches a failed state", () => {
  const admin = read("admin/index.html");
  const waitForJob = admin.match(/async function waitForJob\(jobId\) \{([\s\S]*?)\r?\n    \}\r?\n\r?\n    function sleep/)?.[1] || "";

  assert.match(waitForJob, /response\.status === 404/);
  assert.match(waitForJob, /return \{ status: "lost" \}/);
  assert.match(waitForJob, /job\.status === "failed"/);
  assert.doesNotMatch(waitForJob, /if \(!response\.ok \|\| !result\.success\) \{[\s\S]*?continue;/);
  assert.match(admin, /finally \{[\s\S]*?endFormOperation\("publish"\)/);
  assert.doesNotMatch(admin, /重试直到成功/);
});

test("local publisher stops retrying GitHub indefinitely and reports a terminal failure", () => {
  const server = read("server.local.js");
  const publishJob = server.match(/async function publishJob\(jobId, payload\) \{([\s\S]*?)\r?\n\}\r?\n\r?\nasync function deletePostJob/)?.[1] || "";
  const pushWithRetry = server.match(/async function pushWithRetry\(branch, job\) \{([\s\S]*?)\r?\n\}\r?\n\r?\nfunction ensureJobActive/)?.[1] || "";

  assert.match(server, /const MAX_GIT_PUSH_ATTEMPTS = 3;/);
  assert.match(pushWithRetry, /for \(let attempt = 1; attempt <= MAX_GIT_PUSH_ATTEMPTS; attempt \+= 1\)/);
  assert.doesNotMatch(pushWithRetry, /while \(true\)/);
  assert.match(publishJob, /job\.status = "failed";/);
  assert.doesNotMatch(publishJob, /scheduleRetry\(/);
  assert.doesNotMatch(publishJob, /runGit\(\["add", "\."\]\)/);
  assert.match(publishJob, /runGit\(\["add", "--", fileName, "blog\.html", "sitemap\.xml", \.\.\.imageRes\.files\]\)/);
});

test("editor links support a custom label and normalize safe website URLs", () => {
  assert.equal(
    buildEditorLink({ label: "Example Website", url: "example.com/docs" }),
    '<a href="https://example.com/docs" target="_blank" rel="noopener noreferrer">Example Website</a>',
  );
  assert.equal(
    buildEditorLink({ label: "Internal Guide", url: "./seedance-guide.html" }),
    '<a href="./seedance-guide.html">Internal Guide</a>',
  );
  assert.equal(
    buildEditorLink({ label: '<Read "this">', url: "https://example.com/?a=1&b=2" }),
    '<a href="https://example.com/?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">&lt;Read &quot;this&quot;&gt;</a>',
  );
  assert.throws(() => buildEditorLink({ label: "Unsafe", url: "javascript:alert(1)" }), /valid website address/i);
  assert.throws(() => buildEditorLink({ label: "", url: "https://example.com" }), /link name/i);
});

test("CMS toolbar exposes a custom-name link dialog", () => {
  const admin = read("admin/index.html");
  assert.match(admin, /id="insert-link-btn"/);
  assert.match(admin, /id="link-dialog"/);
  assert.match(admin, /id="link-label"/);
  assert.match(admin, /id="link-url"/);
  assert.match(admin, /buildEditorLink\(\{/);
  assert.match(admin, /pendingLinkRange/);
  assert.match(admin, /expandRangeToContainingLinks\(range\)/);
  assert.match(admin, /event\.key === "Escape"/);
});
