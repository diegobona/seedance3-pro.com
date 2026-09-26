// Public URLs are extensionless; repository filenames remain .html for the CMS.
export function publicArticlePath(fileName) {
  return `/${fileName.replace(/\.html$/i, "")}`;
}

export function articleFileFromCard(card) {
  const slug = card.match(/href="(?:\.\/|\/)([a-z0-9][a-z0-9-]*)(?:\.html)?"/i)?.[1];
  return slug ? `${slug}.html` : "";
}

export function normalizeSitemapUrls(sitemap) {
  return sitemap.replace(/(<loc>https:\/\/seedance3-pro\.com\/)([^<]+)\.html(<\/loc>)/g,
    (_match, prefix, slug, suffix) => `${prefix}${slug === "index" ? "" : slug}${suffix}`);
}
