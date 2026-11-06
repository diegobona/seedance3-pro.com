export const BRAND_VERSION = '20261028-checkout-ui';
export const BRAND_MARK = `/assets/seedance-mark.svg?v=${BRAND_VERSION}`;

export function brandAssetUrl(path) {
  const assetPath = path.split('?')[0];
  const version = /\/(?:site-navigation|home-video)\.css$/.test(assetPath) ? '20261031-creations'
    : assetPath.endsWith('/home-video.js') || assetPath.endsWith('/site-trust.css') ? '20261101-credit-packs' : BRAND_VERSION;
  return `${assetPath}?v=${version}`;
}

export function withSiteBrand(html) {
  let output = html.replace(/^[ \t]*<link\b[^\n>]*data-site-brand[^>]*>\r?\n?/gm, '');
  output = output.replace(/(src|href)="([^"?]+)(?:\?[^\"]*)?"/g, (match, attribute, path) => {
    if (/(?:^|\/)(?:favicon\.(?:svg|ico)|apple-touch-icon\.png|seedance-mark\.svg|home-(?:video|auth)\.js)$/.test(path)
      || attribute === 'href' && /(?:^|\/)(?:site|showcase|home-video|home-auth|site-language|site-navigation|site-trust|pose-to-image|pose-reference-camera-angle-examples)\.css$/.test(path)) {
      return `${attribute}="${brandAssetUrl(path)}"`;
    }
    return match;
  });
  return output.replace('</head>', `  <link data-site-brand rel="stylesheet" href="/assets/site-brand.css?v=${BRAND_VERSION}">\n</head>`);
}
