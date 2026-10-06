import { isLanguageNeutralPath, localeFromPath, stripLocalePath } from '../../app/site-locale.mjs'
import { legacyModelRedirect } from '../../app/seo-routes.mjs'

export const PUBLIC_PAGES_ORIGIN = 'https://seedance3-pro-com.pages.dev'

export function canonicalSiteRedirect(request: Request): Response | null {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null
  const url = new URL(request.url)
  if (url.hostname !== 'seedance3-pro.com' && url.hostname !== 'www.seedance3-pro.com') return null
  // Authentication callbacks and server calls must retain their cookie origin.
  if (/^\/(?:api|_serverFn|@tanstack-start)(?:\/|$)/.test(stripLocalePath(url.pathname))) return null
  const htmlAlias = !isLanguageNeutralPath(url.pathname) && /\.html$/i.test(url.pathname)
  if (url.hostname !== 'www.seedance3-pro.com' && !htmlAlias) return null

  // Resolve old model aliases directly, avoiding an intermediate clean guide URL.
  const modelDestination = legacyModelRedirect(url)
  if (modelDestination) return Response.redirect(`https://seedance3-pro.com${modelDestination}`, 301)
  url.protocol = 'https:'
  url.hostname = 'seedance3-pro.com'
  url.port = ''
  if (htmlAlias) url.pathname = url.pathname.replace(/\/index\.html$/i, '/').replace(/\.html$/i, '')
  return Response.redirect(url.href, 301)
}

export function isStudioDocument(pathname: string) {
  const path = stripLocalePath(pathname)
  return path === '/app' || path.startsWith('/app/') || path === '/prompt-guide'
    || /^\/(?:minimax-h3|gpt-image-2|seedance-3-0)-prompts(?:\/|$)/.test(path)
}

// A separate Pages origin avoids re-entering this Worker's all-site route.
export async function fetchPublicPage(request: Request, fetchImpl: typeof fetch = fetch) {
  const url = new URL(request.url)
  const upstream = new URL(url.pathname + url.search, PUBLIC_PAGES_ORIGIN)
  const headers = new Headers(request.headers)
  headers.delete('cookie')
  headers.delete('authorization')
  headers.delete('host')
  const response = await fetchImpl(new Request(upstream, {
    method: request.method,
    headers,
    redirect: 'manual',
  }))
  const responseHeaders = new Headers(response.headers)
  const location = responseHeaders.get('location')
  if (location) {
    const destination = new URL(location, upstream)
    if (destination.origin === PUBLIC_PAGES_ORIGIN) {
      destination.protocol = url.protocol
      destination.host = url.host
      responseHeaders.set('location', destination.href)
    }
  }
  if (responseHeaders.get('content-type')?.includes('text/html')) {
    responseHeaders.set('content-language', localeFromPath(url.pathname) === 'zh' ? 'zh-Hans' : 'en')
    responseHeaders.set('cache-control', 'private, no-store')
  }
  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}
