import { localeFromPath, localizedPath, stripLocalePath } from './site-locale.mjs';

// This depends on the source of this request; old direct image links stay valid.
export function partnerImageRedirect(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  const path = stripLocalePath(url.pathname).replace(/\/$/, '');
  const oldImage = path === '/app/image/gpt-image-2' || path === '/app/image/gpt-image-2-5' || path === '/gpt-image-2' || path === '/gpt-image-2.html'
    || (path === '/app' && url.searchParams.get('model') === 'gpt-image-2');
  if (!oldImage) return null;

  const marker = url.searchParams.get('ref');
  if (marker === 'pixal3d') return null;
  let anyposesReferrer = false;
  try {
    const hostname = new URL(request.headers.get('referer')).hostname.toLowerCase();
    anyposesReferrer = hostname === 'anyposes.com' || hostname.endsWith('.anyposes.com');
  } catch (_) {}
  if (marker !== 'anyposes' && !anyposesReferrer) return null;

  url.pathname = localizedPath('/app/image/gpt-image-2-5-1k', localeFromPath(url.pathname));
  url.searchParams.delete('model');
  // Redirect chains may strip the external Referer, so keep the source explicit.
  url.searchParams.set('ref', 'anyposes');
  if (url.hostname === 'www.seedance3-pro.com') {
    url.protocol = 'https:';
    url.hostname = 'seedance3-pro.com';
    url.port = '';
  }
  return new Response(null, { status: 302, headers: {
    location: url.href,
    'cache-control': 'private, no-store',
    vary: 'Referer',
  } });
}
