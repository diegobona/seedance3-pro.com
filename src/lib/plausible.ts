// Public, site-specific URL copied from Plausible's installation screen.
export const PLAUSIBLE_SCRIPT_URL = 'https://plausible.io/js/pa-PZq2HOzqSHoOSYMX7k2Ws.js'
export const PLAUSIBLE_INIT = 'window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()'

export function withPlausibleAnalytics(request: Request, response: Response) {
  const url = new URL(request.url)
  if (request.method !== 'GET' || !response.ok || !response.headers.get('content-type')?.includes('text/html')
    || !['seedance3-pro.com', 'www.seedance3-pro.com'].includes(url.hostname)
    || /^\/admin(?:\/|$)/.test(url.pathname)) return response

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.delete('etag')
  return new HTMLRewriter().on('head', {
    element(element) {
      element.append(`<script id="plausible-script" async src="${PLAUSIBLE_SCRIPT_URL}"></script><script id="plausible-init">${PLAUSIBLE_INIT}</script>`, { html: true })
    },
  }).transform(new Response(response.body, { status: response.status, statusText: response.statusText, headers }))
}
