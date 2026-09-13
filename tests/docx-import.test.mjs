import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import JSZip from "jszip";

import {
  DOCX_STYLE_MAP,
  convertDocxBufferToArticle,
  finalizeImportedDocxHtml,
  validateDocxArchive,
  validateDocxExpandedContent,
} from "../scripts/docx-import.mjs";
import { sanitizeArticleHtml } from "../scripts/article-html.mjs";

const root = resolve(import.meta.dirname, "..");
const read = (fileName) => readFileSync(resolve(root, fileName), "utf8");

async function createDocxFixture({ extraEntryBytes = 0 } = {}) {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Default Extension="png" ContentType="image/png"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
      <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
    </Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>`);
  zip.file("word/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:style w:type="paragraph" w:styleId="Normal" w:default="1"><w:name w:val="Normal"/></w:style>
      <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/></w:style>
      <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>
      <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/></w:style>
      <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/></w:style>
    </w:styles>`);
  zip.file("word/numbering.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:start w:val="1"/></w:lvl></w:abstractNum>
      <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
    </w:numbering>`);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
      <Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
      <Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/pose.png"/>
    </Relationships>`);
  zip.file("word/media/pose.png", Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nH0AAAAASUVORK5CYII=", "base64"));
  if (extraEntryBytes) zip.file("word/large.bin", Buffer.alloc(extraEntryBytes, 0x61));
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
      <w:body>
        <w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>Fixture Guide</w:t></w:r></w:p>
        <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Bold</w:t></w:r><w:r><w:t xml:space="preserve"> and </w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>italic</w:t></w:r></w:p>
        <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Level one</w:t></w:r></w:p>
        <w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Level two</w:t></w:r></w:p>
        <w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>Level three</w:t></w:r></w:p>
        <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>First</w:t></w:r></w:p>
        <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Second</w:t></w:r></w:p>
        <w:tbl><w:tr><w:tc><w:p><w:r><w:t>Table cell</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
        <w:p><w:r><w:drawing><wp:inline><wp:extent cx="9525" cy="9525"/><wp:docPr id="1" name="Pose" descr="Pose image"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="pose.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImage1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="9525" cy="9525"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>
        <w:sectPr/>
      </w:body>
    </w:document>`);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

test("DOCX import keeps document structure and extracts the Word title", () => {
  const image = "data:image/png;base64,iVBORw0KGgo=";
  const result = finalizeImportedDocxHtml(`
    <h1>Pose Reference Guide</h1>
    <p>A <strong>formatted</strong> introduction with <em>emphasis</em>.</p>
    <h2>First section</h2>
    <h3>Second level</h3>
    <h4>Third level</h4>
    <ol><li>First step</li><li>Second step</li></ol>
    <ul><li>One point</li></ul>
    <table><tr><th>Tool</th></tr><tr><td>Anyposes</td></tr></table>
    <p><img src="${image}" alt="Pose reference"></p>
  `);

  assert.equal(result.title, "Pose Reference Guide");
  assert.doesNotMatch(result.content, /<h1/i);
  assert.match(result.content, /<h2>First section<\/h2>/);
  assert.match(result.content, /<h3>Second level<\/h3>/);
  assert.match(result.content, /<h4>Third level<\/h4>/);
  assert.match(result.content, /<ol><li>First step<\/li><li>Second step<\/li><\/ol>/);
  assert.match(result.content, /<ul><li>One point<\/li><\/ul>/);
  assert.match(result.content, /<table><tr><th>Tool<\/th><\/tr><tr><td>Anyposes<\/td><\/tr><\/table>/);
  assert.match(result.content, new RegExp(`<img src="${image}" alt="Pose reference">`));
});

test("DOCX import maps Word heading levels to SEO-safe article headings", () => {
  assert.ok(DOCX_STYLE_MAP.includes("p[style-name='Title'] => h1:fresh"));
  assert.ok(DOCX_STYLE_MAP.includes("p[style-name='Heading 1'] => h2:fresh"));
  assert.ok(DOCX_STYLE_MAP.includes("p[style-name='Heading 2'] => h3:fresh"));
  assert.ok(DOCX_STYLE_MAP.includes("p[style-name='Heading 3'] => h4:fresh"));
});

test("Mammoth converts a real DOCX fixture with formatting, numbering, table and image", async () => {
  const result = await convertDocxBufferToArticle(await createDocxFixture());
  assert.equal(result.title, "Fixture Guide");
  assert.match(result.content, /<p><strong>Bold<\/strong> and <em>italic<\/em><\/p>/);
  assert.match(result.content, /<h2>Level one<\/h2>/);
  assert.match(result.content, /<h3>Level two<\/h3>/);
  assert.match(result.content, /<h4>Level three<\/h4>/);
  assert.match(result.content, /<ol><li>First<\/li><li>Second<\/li><\/ol>/);
  assert.match(result.content, /<table><tr><td><p>Table cell<\/p><\/td><\/tr><\/table>/);
  assert.match(result.content, /<img[^>]+src="data:image\/png;base64,/);
});

test("DOCX archive validation rejects an excessively large expanded entry", async () => {
  const archive = await createDocxFixture();
  const centralHeader = archive.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  assert.ok(centralHeader >= 0);
  archive.writeUInt32LE(70 * 1024 * 1024, centralHeader + 24);
  assert.throws(() => validateDocxArchive(archive), /archive entry is too large/i);
});

test("DOCX expansion validation counts real output even when ZIP metadata lies", async () => {
  const archive = await createDocxFixture({ extraEntryBytes: 2048 });
  const fileNameOffset = archive.lastIndexOf(Buffer.from("word/large.bin"));
  const centralHeader = fileNameOffset - 46;
  assert.equal(archive.readUInt32LE(centralHeader), 0x02014b50);
  archive.writeUInt32LE(1, centralHeader + 24);
  await assert.rejects(
    validateDocxExpandedContent(archive, { maxSingleEntryBytes: 1024, maxExpandedBytes: 4096 }),
    /actual expanded content is too large/i,
  );
});

test("article sanitizer accepts safe embedded DOCX images only", () => {
  assert.match(sanitizeArticleHtml('<img src="data:image/jpeg;base64,/9j/AA==" alt="Photo">'), /src="data:image\/jpeg;base64,\/9j\/AA=="/);
  assert.doesNotMatch(sanitizeArticleHtml('<img src="data:image/svg+xml;base64,PHN2Zz4=" alt="SVG">'), /src=/);
  assert.doesNotMatch(sanitizeArticleHtml('<a href="javascript:alert(1)">Unsafe<\/a>'), /href=/);
});

test("local CMS exposes one-click DOCX import controls and endpoint", () => {
  const admin = read("admin/index.html");
  const server = read("server.local.js");
  assert.match(admin, /id="import-docx-btn"/);
  assert.match(admin, /id="docx-file-input"[^>]+accept="\.docx/);
  assert.match(admin, /fetch\("\/api\/import-docx"/);
  assert.match(server, /app\.post\("\/api\/import-docx"/);
  assert.match(server, /convertDocxInIsolatedProcess/);
  assert.match(server, /limits:\s*\{\s*fileSize:/);
  assert.match(server, /--max-old-space-size=128/);
  assert.match(server, /DOCX_IMPORT_TIMEOUT_MS/);
  assert.match(admin, /beginFormOperation\("docx"\)/);
  assert.match(admin, /beginFormOperation\("translate"\)/);
  assert.match(admin, /beginFormOperation\("publish"\)/);
  assert.match(admin, /titleInput\.value\s*=\s*result\.title/);
});
