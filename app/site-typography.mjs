import { withSiteBrand } from './site-brand.mjs';

export const TYPOGRAPHY_VERSION = '20261024-editorial';

// One font entry point for static pages, including pages without the shared header.
export function withSiteTypography(html) {
  let output = html.replace(/^[ \t]*<link\b[^\n>]*data-site-typography[^>]*>\r?\n?/gm, '');
  for (const file of ['site.css', 'showcase.css', 'assets/site-language.css', 'assets/site-trust.css', 'assets/site-navigation.css', 'assets/home-video.css']) {
    const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    output = output.replace(new RegExp(`href="((?:\\./|/)?${escaped})(?:\\?[^\"]*)?"`, 'g'), `href="$1?v=${TYPOGRAPHY_VERSION}"`);
  }
  return withSiteBrand(output.replace('</head>', `  <link data-site-typography rel="preload" href="/assets/fonts/source-serif-4-roman.woff2" as="font" type="font/woff2" crossorigin>\n  <link data-site-typography rel="stylesheet" href="/assets/fonts/noto-serif-sc.css?v=${TYPOGRAPHY_VERSION}">\n  <link data-site-typography rel="stylesheet" href="/assets/site-typography.css?v=${TYPOGRAPHY_VERSION}">\n</head>`));
}
