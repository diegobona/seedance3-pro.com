import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { LEGAL_PAGE_SLUGS, getLegalContent } from '../app/legal-content.mjs';
import { withSiteNavigation } from '../app/site-navigation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'https://seedance3-pro.com';
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function renderPage(slug, locale) {
  const page = getLegalContent(slug, locale);
  const zh = locale === 'zh';
  const pathname = `${zh ? '/zh' : ''}/${slug}`;
  const sections = page.sections.map(section => `<section aria-labelledby="${section.id}">\n        <h2 id="${section.id}">${escape(section.title)}</h2>\n        ${section.content}\n      </section>`).join('\n      ');
  const toc = page.sections.map(section => `<a href="#${section.id}">${escape(section.title)}</a>`).join('');
  const html = `<!doctype html>
<html lang="${zh ? 'zh-Hans' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(page.title)} | SEEDANCE 3.0</title>
  <meta name="description" content="${escape(page.description)}">
  <meta name="theme-color" content="#090c0c">
  <link rel="canonical" href="${origin}${pathname}">
  <link rel="alternate" hreflang="en" href="${origin}/${slug}">
  <link rel="alternate" hreflang="zh-Hans" href="${origin}/zh/${slug}">
  <link rel="alternate" hreflang="x-default" href="${origin}/${slug}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="SEEDANCE 3.0">
  <meta property="og:title" content="${escape(page.title)} | SEEDANCE 3.0">
  <meta property="og:description" content="${escape(page.description)}">
  <meta property="og:url" content="${origin}${pathname}">
  <meta property="og:locale" content="${zh ? 'zh_CN' : 'en_US'}">
  <meta property="og:locale:alternate" content="${zh ? 'en_US' : 'zh_CN'}">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="stylesheet" href="/site.css">
  <link rel="stylesheet" href="/assets/site-language.css">
  <link rel="stylesheet" href="/assets/site-trust.css?v=20261021">
  <script src="/assets/site-language.js" defer></script>
</head>
<body class="trust-page">
  <header class="site-header"></header>
  <main id="main-content" class="trust-document">
    <article aria-labelledby="page-title">
      <h1 id="page-title">${escape(page.title)}</h1>
      <p class="trust-lead">${escape(page.lead)}</p>
      <nav class="trust-toc" aria-label="${zh ? '本页目录' : 'On this page'}">${toc}</nav>
      ${sections}
    </article>
  </main>
  <footer class="site-footer"></footer>
</body>
</html>
`;
  return withSiteNavigation(html, pathname);
}

for (const locale of ['en', 'zh']) {
  const directory = path.join(root, locale === 'zh' ? 'zh' : '');
  await mkdir(directory, { recursive: true });
  for (const slug of LEGAL_PAGE_SLUGS) {
    await writeFile(path.join(directory, `${slug}.html`), renderPage(slug, locale), 'utf8');
  }
}
console.log('Generated 8 bilingual trust and policy pages.');
