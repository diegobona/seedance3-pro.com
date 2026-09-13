import mammoth from "mammoth";
import { createInflateRaw } from "node:zlib";

import { sanitizeArticleHtml } from "./article-html.mjs";

export const DOCX_STYLE_MAP = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Heading 1'] => h2:fresh",
  "p[style-name='Heading 2'] => h3:fresh",
  "p[style-name='Heading 3'] => h4:fresh",
];

const MAX_ARCHIVE_ENTRIES = 512;
const MAX_EXPANDED_BYTES = 64 * 1024 * 1024;
const MAX_SINGLE_ENTRY_BYTES = 32 * 1024 * 1024;
const MAX_IMAGE_ENTRIES = 80;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

function findEndOfCentralDirectory(buffer) {
  const signature = 0x06054b50;
  const firstPossibleOffset = Math.max(0, buffer.length - 22 - 0xffff);
  for (let offset = buffer.length - 22; offset >= firstPossibleOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === signature) return offset;
  }
  return -1;
}

export function validateDocxArchive(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 22) throw new Error("Please choose a valid .docx file.");
  const endOffset = findEndOfCentralDirectory(buffer);
  if (endOffset < 0) throw new Error("Please choose a valid .docx file.");
  const diskNumber = buffer.readUInt16LE(endOffset + 4);
  const centralDisk = buffer.readUInt16LE(endOffset + 6);
  const entriesOnDisk = buffer.readUInt16LE(endOffset + 8);
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  const centralSize = buffer.readUInt32LE(endOffset + 12);
  const centralOffset = buffer.readUInt32LE(endOffset + 16);
  if (diskNumber !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount || entryCount === 0xffff) {
    throw new Error("Unsupported multi-part or ZIP64 DOCX archive.");
  }
  if (entryCount > MAX_ARCHIVE_ENTRIES) throw new Error("The DOCX contains too many archive entries.");
  if (centralOffset + centralSize > endOffset) throw new Error("The DOCX archive directory is invalid.");

  let offset = centralOffset;
  let expandedBytes = 0;
  let imageBytes = 0;
  let imageCount = 0;
  let hasDocumentXml = false;
  const entries = [];
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > endOffset || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("The DOCX archive directory is invalid.");
    }
    const flags = buffer.readUInt16LE(offset + 8);
    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) {
      throw new Error("ZIP64 DOCX archives are not supported.");
    }
    if ((flags & 1) !== 0 || ![0, 8].includes(compression)) {
      throw new Error("Encrypted or unsupported DOCX archive entries are not allowed.");
    }
    if (uncompressedSize > MAX_SINGLE_ENTRY_BYTES) throw new Error("A DOCX archive entry is too large.");
    expandedBytes += uncompressedSize;
    if (expandedBytes > MAX_EXPANDED_BYTES) throw new Error("DOCX expanded content is too large.");

    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    const nextOffset = nameEnd + extraLength + commentLength;
    if (nameEnd > endOffset || nextOffset > endOffset) throw new Error("The DOCX archive directory is invalid.");
    const name = buffer.subarray(nameStart, nameEnd).toString("utf8").replaceAll("\\", "/");
    if (name === "word/document.xml") hasDocumentXml = true;
    if (/^word\/media\/[^/]+\.(?:png|jpe?g|gif|webp)$/i.test(name)) {
      imageCount += 1;
      imageBytes += uncompressedSize;
      if (imageCount > MAX_IMAGE_ENTRIES || imageBytes > MAX_IMAGE_BYTES) {
        throw new Error("The DOCX contains too many or too-large images.");
      }
    }
    entries.push({ name, flags, compression, compressedSize, uncompressedSize, localHeaderOffset });
    offset = nextOffset;
  }
  if (!hasDocumentXml) throw new Error("The DOCX does not contain a Word document body.");
  return entries;
}

function countInflatedBytes(input, limit) {
  return new Promise((resolve, reject) => {
    const inflater = createInflateRaw();
    let expandedBytes = 0;
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
    };
    inflater.on("data", (chunk) => {
      expandedBytes += chunk.length;
      if (expandedBytes > limit) inflater.destroy(new Error("DOCX actual expanded content is too large."));
    });
    inflater.once("end", () => finish(resolve, expandedBytes));
    inflater.once("error", (error) => finish(reject, error));
    inflater.end(input);
  });
}

export async function validateDocxExpandedContent(buffer, options = {}) {
  const maxExpandedBytes = options.maxExpandedBytes ?? MAX_EXPANDED_BYTES;
  const maxSingleEntryBytes = options.maxSingleEntryBytes ?? MAX_SINGLE_ENTRY_BYTES;
  const maxImageBytes = options.maxImageBytes ?? MAX_IMAGE_BYTES;
  const maxImageEntries = options.maxImageEntries ?? MAX_IMAGE_ENTRIES;
  const entries = validateDocxArchive(buffer);
  let expandedBytes = 0;
  let imageBytes = 0;
  let imageCount = 0;

  for (const entry of entries) {
    if (entry.name.endsWith("/")) continue;
    const localOffset = entry.localHeaderOffset;
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error("The DOCX archive contains an invalid local file header.");
    }
    const localFlags = buffer.readUInt16LE(localOffset + 6);
    const localCompression = buffer.readUInt16LE(localOffset + 8);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    if ((localFlags & 1) !== 0 || localCompression !== entry.compression) {
      throw new Error("The DOCX archive contains inconsistent file metadata.");
    }
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + entry.compressedSize;
    if (dataStart > buffer.length || dataEnd > buffer.length) {
      throw new Error("The DOCX archive contains invalid compressed data.");
    }

    const isImage = /^word\/media\/[^/]+\.(?:png|jpe?g|gif|webp)$/i.test(entry.name);
    const remainingTotal = maxExpandedBytes - expandedBytes;
    const remainingImage = isImage ? maxImageBytes - imageBytes : Number.POSITIVE_INFINITY;
    const entryLimit = Math.min(maxSingleEntryBytes, remainingTotal, remainingImage);
    if (entryLimit < 0) throw new Error("DOCX actual expanded content is too large.");

    const compressed = buffer.subarray(dataStart, dataEnd);
    const actualSize = entry.compression === 0
      ? compressed.length
      : await countInflatedBytes(compressed, entryLimit);
    if (actualSize > entryLimit) throw new Error("DOCX actual expanded content is too large.");
    if (actualSize !== entry.uncompressedSize) throw new Error("The DOCX archive size metadata is invalid.");

    expandedBytes += actualSize;
    if (expandedBytes > maxExpandedBytes) throw new Error("DOCX actual expanded content is too large.");
    if (isImage) {
      imageCount += 1;
      imageBytes += actualSize;
      if (imageCount > maxImageEntries || imageBytes > maxImageBytes) {
        throw new Error("The DOCX contains too many or too-large images.");
      }
    }
  }
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
  return decodeHtml(String(input || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

export function finalizeImportedDocxHtml(input) {
  let source = String(input || "").trim();
  const titleMatch = source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? textFromHtml(titleMatch[1]) : "";
  if (titleMatch) source = source.replace(titleMatch[0], "");
  return {
    title,
    content: sanitizeArticleHtml(source),
  };
}

export async function convertDocxBufferToArticle(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error("Please choose a valid .docx file.");
  }
  await validateDocxExpandedContent(buffer);
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: DOCX_STYLE_MAP,
      convertImage: mammoth.images.dataUri,
      ignoreEmptyParagraphs: true,
      includeEmbeddedStyleMap: false,
    },
  );
  const article = finalizeImportedDocxHtml(result.value);
  if (!article.content) throw new Error("No importable article content was found in this document.");
  return {
    ...article,
    warnings: (result.messages || []).map((message) => String(message?.message || message)).filter(Boolean),
  };
}
