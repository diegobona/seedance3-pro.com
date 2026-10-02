export const SUPPORTED_LOCALES = Object.freeze(['en', 'zh'])
export const LOCALE_COOKIE = 'seedance_locale'

export function localeFromPath(pathname = '/') {
  return pathname === '/zh' || pathname.startsWith('/zh/') ? 'zh' : 'en'
}

export function stripLocalePath(pathname = '/') {
  if (pathname === '/zh' || pathname === '/zh/') return '/'
  return pathname.startsWith('/zh/') ? pathname.slice(3) : pathname
}

export function isLanguageNeutralPath(pathname) {
  const path = stripLocalePath(pathname)
  return /^\/(?:api|_serverFn|@tanstack-start|app-assets|assets|media|blog-assets|admin)(?:\/|$)/.test(path)
    || /\.[a-z\d]+$/i.test(path) && !/\.html$/i.test(path)
}

// Keep search/hash intact; provider endpoints, files and external links stay neutral.
export function localizedPath(path, locale = 'en') {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return path
  const match = path.match(/^([^?#]*)(.*)$/)
  const pathname = stripLocalePath(match[1])
  if (isLanguageNeutralPath(pathname)) return pathname + match[2]
  return (locale === 'zh' ? '/zh' + (pathname === '/' ? '/' : pathname) : pathname) + match[2]
}

export function localeCookieValue(cookieHeader = '') {
  const value = String(cookieHeader || '').split(';').map(part => part.trim())
    .find(part => part.startsWith(LOCALE_COOKIE + '='))?.slice(LOCALE_COOKIE.length + 1)
  return SUPPORTED_LOCALES.includes(value) ? value : null
}

export function localeForCountry(country) {
  return ['CN', 'TW', 'HK'].includes(String(country || '').toUpperCase()) ? 'zh' : 'en'
}

export function preferredLocale(cookieHeader, country) {
  return localeCookieValue(cookieHeader) || localeForCountry(country)
}

export function languageChoiceCookie(locale, secure = true, hostname = '') {
  const domain = /(^|\.)seedance3-pro\.com$/.test(hostname) ? '; Domain=seedance3-pro.com' : ''
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${domain}${secure ? '; Secure' : ''}`
}

export function languageSwitchPath(path, locale) {
  const url = new URL(localizedPath(path, locale), 'https://seedance3-pro.com')
  url.searchParams.set('lang', locale)
  return url.pathname + url.search + url.hash
}

export function localeRedirect(request, country) {
  if (!['GET', 'HEAD'].includes(request.method)) return null
  const url = new URL(request.url)
  if (isLanguageNeutralPath(url.pathname)) return null
  const languageChoice = url.searchParams.get('lang')
  if (SUPPORTED_LOCALES.includes(languageChoice)) {
    url.searchParams.delete('lang')
    url.pathname = localizedPath(url.pathname, languageChoice)
    return new Response(null, { status: 302, headers: {
      location: url.href,
      'set-cookie': languageChoiceCookie(languageChoice, url.protocol === 'https:', url.hostname),
      'cache-control': 'private, no-store',
      vary: 'Cookie',
    } })
  }
  if (url.pathname === '/zh') {
    url.pathname = '/zh/'
  } else if (localeFromPath(url.pathname) === 'en' && preferredLocale(request.headers.get('cookie'), country) === 'zh') {
    url.pathname = localizedPath(url.pathname, 'zh')
  } else return null
  return new Response(null, { status: 302, headers: {
    location: url.href,
    'cache-control': 'private, no-store',
    vary: 'Cookie',
  } })
}
