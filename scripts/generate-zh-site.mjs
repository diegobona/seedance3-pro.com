import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_ROOT, '..');
const ORIGIN = 'https://seedance3-pro.com';
const TOKEN_PATTERN = /<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<!--[\s\S]*?-->|<![^>]*>|<\/?[a-zA-Z][^>]*>|[^<]+/gi;
const ATTR_PATTERN = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
const TEXT_ATTRIBUTES = new Set(['alt', 'aria-label', 'title', 'placeholder']);
const SCHEMA_TEXT_KEYS = new Set(['name', 'headline', 'description', 'text', 'articleBody', 'keywords', 'caption']);
const RESOURCE_PREFIX = /^\/(?:assets|media|blog-assets|api|admin|app\/pose-assets)(?:\/|$)/;
const PUBLIC_DYNAMIC_PREFIX = /^\/(?:app(?:\/|$)|minimax-h3-prompts(?:\/|$)|gpt-image-2-prompts(?:\/|$)|nano-banana-2-lite-prompts(?:\/|$)|seedance-3-0-prompts(?:\/|$)|prompt-guide(?:\/|$)|login(?:\/|$)|account(?:\/|$)|signup(?:\/|$))/;
const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

export function decodeText(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp|ndash|mdash|hellip|copy);/gi, (_, entity) => {
    if (entity[0] === '#') return String.fromCodePoint(parseInt(entity.slice(entity[1]?.toLowerCase() === 'x' ? 2 : 1), entity[1]?.toLowerCase() === 'x' ? 16 : 10));
    return ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', copy: '©' })[entity.toLowerCase()];
  });
}
export const normalizeText = (value) => decodeText(value).replace(/\s+/g, ' ').trim();
const escapeText = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const escapeAttribute = (value) => escapeText(value).replaceAll('"', '&quot;');
const isTranslatable = (value) => /[a-z]{2,}/i.test(value) && !/[\u3400-\u9fff]/.test(value) && !/^[@©\d\W]*$/.test(value) && !/^https?:\/\//.test(value);

export function localizedUrl(value, englishPath, publicPaths) {
  const original = decodeText(value);
  if (!original || original.startsWith('#') || /^(?:data:|mailto:|tel:|javascript:|blob:)/i.test(original)) return original;
  let url;
  try { url = new URL(original, `${ORIGIN}${englishPath}`); } catch { return original; }
  if (url.origin !== ORIGIN) return original;
  const pathname = url.pathname.replace(/\.html$/, '').replace(/^\/index$/, '/');
  if (pathname.startsWith('/zh/')) return `${pathname}${url.search}${url.hash}`;
  if (RESOURCE_PREFIX.test(pathname)) return `${url.pathname}${url.search}${url.hash}`;
  if (publicPaths.has(pathname) || (PUBLIC_DYNAMIC_PREFIX.test(pathname) && !/\.[a-z0-9]{1,6}$/i.test(url.pathname))) return `/zh${pathname === '/' ? '/' : pathname}${url.search}${url.hash}`;
  return `${url.pathname}${url.search}${url.hash}`;
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(ATTR_PATTERN)].map((m) => [m[1].toLowerCase(), decodeText(m[3] ?? m[4])]));
}
function schemaValues(value, collect, translate, englishPath, publicPaths) {
  if (Array.isArray(value)) return value.map((item) => schemaValues(item, collect, translate, englishPath, publicPaths));
  if (!value || typeof value !== 'object') return value;
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string' && SCHEMA_TEXT_KEYS.has(key)) { collect(item); output[key] = translate(item); }
    else if (key === 'inLanguage') output[key] = 'zh-Hans';
    else if (typeof item === 'string' && ['url', '@id', 'mainEntityOfPage', 'item'].includes(key) && item.startsWith(ORIGIN)) output[key] = new URL(localizedUrl(item, englishPath, publicPaths), ORIGIN).href;
    else output[key] = schemaValues(item, collect, translate, englishPath, publicPaths);
  }
  if (['Article', 'BlogPosting', 'WebPage', 'WebSite', 'FAQPage'].includes(output['@type'])) output.inLanguage = 'zh-Hans';
  return output;
}

function transformHtml(html, { englishPath, publicPaths, dictionary = {}, collect = () => {} }) {
  const stack = [];
  const translate = (source) => {
    const normalized = normalizeText(source);
    if (isTranslatable(normalized)) collect(normalized);
    return dictionary[normalized] ?? normalized;
  };
  return html.replace(TOKEN_PATTERN, (token, offset) => {
    if (/^<script\b/i.test(token)) {
      if (/type=["']application\/ld\+json["']/i.test(token)) {
        const data = token.replace(/^<script\b[^>]*>/i, '').replace(/<\/script\s*>$/i, '');
        try { return `<script type="application/ld+json">\n${JSON.stringify(schemaValues(JSON.parse(data), collect, translate, englishPath, publicPaths), null, 2)}\n</script>`; } catch { return token; }
      }
      return token.replace(ATTR_PATTERN, (match, name, quoted, double, single) => name.toLowerCase() === 'src' ? `${name}="${escapeAttribute(localizedUrl(double ?? single, englishPath, publicPaths))}"` : match)
        .replace(/location\.replace\("\.\/([^"\s]+)"/g, 'location.replace("/zh/$1"');
    }
    if (/^<(?:style\b|!)/i.test(token)) return token;
    if (token.startsWith('<')) {
      const tagName = /^<\/?([\w-]+)/.exec(token)?.[1]?.toLowerCase();
      if (token.startsWith('</')) { const index = stack.findLastIndex((entry) => entry.name === tagName); if (index >= 0) stack.splice(index); return token; }
      const attrs = attributes(token);
      const preserve = stack.some((entry) => entry.preserve) || ['pre', 'code'].includes(tagName) || /(?:community-video-prompt|prompt-box)/.test(attrs.class || '') || tagName === 'blockquote';
      if (!VOID_ELEMENTS.has(tagName) && !token.endsWith('/>')) stack.push({ name: tagName, preserve });
      let result = token.replace(ATTR_PATTERN, (match, rawName, quoted, double, single) => {
        const name = rawName.toLowerCase();
        let value = double ?? single;
        if (tagName === 'html' && name === 'lang') value = 'zh-Hans';
        else if (['href', 'src', 'poster', 'data-video-src', 'data-preview-src'].includes(name)) value = localizedUrl(value, englishPath, publicPaths);
        else if (name === 'content' && tagName === 'meta') {
          const type = attrs.name || attrs.property || '';
          if (['description', 'keywords', 'og:title', 'og:description', 'twitter:title', 'twitter:description'].includes(type)) value = translate(value);
          else if (type === 'og:locale') value = 'zh_CN';
          else if (type === 'og:url') value = new URL(localizedUrl(value, englishPath, publicPaths), ORIGIN).href;
          else if (attrs['http-equiv'] === 'refresh') value = value.replace(/url\s*=\s*(.+)$/i, (_, target) => `url=${localizedUrl(target, englishPath, publicPaths)}`);
        } else if (TEXT_ATTRIBUTES.has(name) && !preserve) value = translate(value);
        if (tagName === 'link' && attrs.rel === 'canonical' && name === 'href') value = new URL(value, ORIGIN).href;
        return `${rawName}="${escapeAttribute(value)}"`;
      });
      if (preserve && !attrs.lang && !stack.at(-2)?.preserve && (['blockquote', 'pre', 'code'].includes(tagName) || /(?:community-video-prompt|prompt-box)/.test(attrs.class || ''))) {
        const contents = html.slice(offset + token.length).split(new RegExp(`<\\/${tagName}\\s*>`, 'i'))[0];
        if (!/[\u3400-\u9fff]/.test(contents)) result = result.replace(/>$/, ' lang="en" translate="no">');
      }
      return result;
    }
    if (stack.some((entry) => entry.preserve) || !normalizeText(token)) return token;
    const source = normalizeText(token);
    const translated = translate(source);
    if (translated === source) {
      if (source.length > 70 && dictionary[source] === source) return token.replace(/\S[\s\S]*\S|\S/, `<span lang="en" translate="no">${escapeText(source)}</span>`);
      return token;
    }
    return token.replace(/\S[\s\S]*\S|\S/, escapeText(translated));
  });
}

const languageMarkup = (locale, englishPath) => {
  const englishTarget = `${englishPath}?lang=en`;
  const chineseTarget = `/zh${englishPath === '/' ? '/' : englishPath}?lang=zh`;
  return `<nav class="site-language-switch" data-site-language-switch aria-label="${locale === 'zh' ? '网站语言' : 'Site language'}"><a href="${chineseTarget}" data-language="zh" lang="zh-Hans"${locale === 'zh' ? ' aria-current="true"' : ''}>中文</a><span aria-hidden="true">|</span><a href="${englishTarget}" data-language="en" lang="en"${locale === 'en' ? ' aria-current="true"' : ''}>EN</a></nav>`;
};

export function attachLanguageMetadata(html, englishPath, locale) {
  const canonical = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1];
  let canonicalPath = englishPath;
  if (canonical) {
    try {
      const canonicalUrl = new URL(canonical, ORIGIN);
      if (canonicalUrl.origin === ORIGIN) canonicalPath = canonicalUrl.pathname.replace(/^\/zh(?=\/|$)/, '') || '/';
    } catch { /* Keep the page path if the source canonical is malformed. */ }
  }
  const enUrl = `${ORIGIN}${canonicalPath}`;
  const zhUrl = `${ORIGIN}/zh${canonicalPath === '/' ? '/' : canonicalPath}`;
  let output = html.replace(/\s*<div\b[^>]*class=["']site-language-(?:standalone|footer-control)["'][^>]*>\s*(?:<nav\b[^>]*data-site-language-switch[^>]*>[\s\S]*?<\/nav>\s*)?<\/div>/gi, '')
    .replace(/\s*<link\b[^>]*\brel=["']alternate["'][^>]*\bhreflang=["'][^"']+["'][^>]*>/gi, '')
    .replace(/\s*<link\b[^>]*href=["']\/assets\/site-language\.css["'][^>]*>/gi, '')
    .replace(/\s*<script\b[^>]*src=["']\/assets\/site-language\.js["'][^>]*>\s*<\/script>/gi, '')
    .replace(/\s*<meta\b[^>]*property=["']og:locale(?::alternate)?["'][^>]*>/gi, '')
    .replace(/\s*<nav\b[^>]*data-site-language-switch[^>]*>[\s\S]*?<\/nav>/gi, '');
  output = output.replace(/\s*<\/head>/i, `\n  <link rel="alternate" hreflang="en" href="${enUrl}">\n  <link rel="alternate" hreflang="zh-Hans" href="${zhUrl}">\n  <link rel="alternate" hreflang="x-default" href="${enUrl}">\n  <link rel="stylesheet" href="/assets/site-language.css">\n  <script src="/assets/site-language.js" defer></script>\n  <meta property="og:locale" content="${locale === 'zh' ? 'zh_CN' : 'en_US'}">\n  <meta property="og:locale:alternate" content="${locale === 'zh' ? 'en_US' : 'zh_CN'}">\n</head>`);
  const markup = languageMarkup(locale, englishPath);
  if (/<div\b[^>]*class=["'][^"']*header-actions/.test(output)) output = output.replace(/(<div\b[^>]*class=["'][^"']*header-actions[^"']*["'][^>]*>)/, `$1\n        ${markup}`);
  else if (/<nav\b[^>]*class=["'][^"']*desktop-nav/.test(output)) output = output.replace(/(<nav\b[^>]*class=["'][^"']*desktop-nav[^"']*["'][^>]*>[\s\S]*?<\/nav>)/, `$1\n      ${markup}`);
  else if (/<header\b[^>]*>[\s\S]*?<nav\b[^>]*>[\s\S]*?<\/nav>/i.test(output)) output = output.replace(/(<header\b[^>]*>[\s\S]*?<nav\b[^>]*>[\s\S]*?<\/nav>)/i, `$1\n      ${markup}`);
  else output = output.replace(/<body([^>]*)>/, `<body$1>\n  <div class="site-language-standalone">${markup}</div>`);
  const footerMarkup = markup.replace('aria-label=', 'data-language-footer aria-label=');
  if (/<footer\b[^>]*>[\s\S]*?<nav\b[^>]*>[\s\S]*?<\/nav>/i.test(output)) output = output.replace(/(<footer\b[^>]*>[\s\S]*?<nav\b[^>]*>[\s\S]*?<\/nav>)/i, `$1\n      ${footerMarkup}`);
  else output = output.replace(/<\/footer>/i, `<div class="site-language-footer-control">${footerMarkup}</div>\n</footer>`);
  return output;
}

async function readArticleOverrides(rootDirectory) {
  try { return JSON.parse(await fs.readFile(path.join(rootDirectory, 'scripts/i18n/article-overrides.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
}

export async function collectTranslationSources({ rootDirectory = DEFAULT_ROOT } = {}) {
  const files = (await fs.readdir(rootDirectory)).filter((file) => file.endsWith('.html')).sort();
  const overrides = await readArticleOverrides(rootDirectory);
  const publicPaths = new Set(files.map((file) => file === 'index.html' ? '/' : `/${file.replace(/\.html$/, '')}`));
  const pages = {};
  for (const file of files) {
    const source = overrides[file] ?? await fs.readFile(path.join(rootDirectory, file), 'utf8');
    const values = new Set();
    transformHtml(source, { englishPath: file === 'index.html' ? '/' : `/${file.replace(/\.html$/, '')}`, publicPaths, collect: (value) => values.add(normalizeText(value)) });
    pages[file] = [...values].filter(isTranslatable);
  }
  return pages;
}

export async function generateChineseSite({ rootDirectory = DEFAULT_ROOT, injectEnglish = true, strict = true, files: requestedFiles } = {}) {
  const catalog = JSON.parse(await fs.readFile(path.join(rootDirectory, 'scripts/i18n/zh-Hans.json'), 'utf8'));
  const dictionary = Object.fromEntries(catalog.entries.map(({ source, translation }) => [normalizeText(source), translation]));
  const files = (await fs.readdir(rootDirectory)).filter((file) => file.endsWith('.html')).sort();
  const overrides = await readArticleOverrides(rootDirectory);
  const publicPaths = new Set(files.map((file) => file === 'index.html' ? '/' : `/${file.replace(/\.html$/, '')}`));
  const missing = [];
  const pages = [];
  await fs.mkdir(path.join(rootDirectory, 'zh'), { recursive: true });
  for (const file of files) {
    if (requestedFiles && !requestedFiles.includes(file)) continue;
    const source = await fs.readFile(path.join(rootDirectory, file), 'utf8');
    const englishPath = file === 'index.html' ? '/' : `/${file.replace(/\.html$/, '')}`;
    const chineseSource = overrides[file] ?? source;
    const translated = transformHtml(chineseSource, { englishPath, publicPaths, dictionary, collect: (value) => { if (isTranslatable(value) && !(value in dictionary)) missing.push({ file, source: value }); } });
    const output = attachLanguageMetadata(translated, englishPath, 'zh').replace(/src=["']\/main\.js["']/g, 'src="/assets/main.zh.js"');
    pages.push({ file, source, englishPath, output });
  }
  if (strict && missing.length) throw new Error(`Missing ${missing.length} Chinese translations. Add source/translation entries to scripts/i18n/zh-Hans.json. First: ${missing[0].file}: ${missing[0].source}`);
  for (const { file, source, englishPath, output } of pages) {
    await fs.writeFile(path.join(rootDirectory, 'zh', file), output, 'utf8');
    if (injectEnglish) {
      const english = attachLanguageMetadata(source, englishPath, 'en');
      if (english !== source) await fs.writeFile(path.join(rootDirectory, file), english, 'utf8');
    }
  }
  const uiTranslations = JSON.parse(await fs.readFile(path.join(rootDirectory, 'scripts/i18n/static-ui.zh-Hans.json'), 'utf8'));
  let localizedMain = await fs.readFile(path.join(rootDirectory, 'main.js'), 'utf8');
  for (const [english, chinese] of Object.entries(uiTranslations)) localizedMain = localizedMain.replaceAll(english, chinese);
  await fs.writeFile(path.join(rootDirectory, 'assets/main.zh.js'), `// Generated by scripts/generate-zh-site.mjs. Edit scripts/i18n/static-ui.zh-Hans.json.\n${localizedMain}`, 'utf8');
  return { pages: pages.length, missing };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--extract')) {
    const sources = await collectTranslationSources();
    await fs.writeFile(path.join(DEFAULT_ROOT, 'scripts/i18n/sources.json'), `${JSON.stringify(sources, null, 2)}\n`, 'utf8');
    console.log(`Extracted ${Object.values(sources).flat().length} source entries from ${Object.keys(sources).length} pages.`);
  } else {
    const result = await generateChineseSite({ strict: !process.argv.includes('--allow-missing') });
    console.log(`Generated ${result.pages} Chinese pages${result.missing.length ? ` (${result.missing.length} untranslated entries)` : ''}.`);
  }
}
