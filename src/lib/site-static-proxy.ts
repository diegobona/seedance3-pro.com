import { localeFromPath, stripLocalePath } from '../../app/site-locale.mjs'

export const PUBLIC_PAGES_ORIGIN = 'https://seedance3-pro-com.pages.dev'

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
