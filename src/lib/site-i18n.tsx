import { useRouterState } from '@tanstack/react-router'
import translations from '../data/ui-zh.json'
import { localeFromPath as resolveLocale, localizedPath as resolvePath } from '../../app/site-locale.mjs'

export type SiteLocale = 'en' | 'zh'
const dictionary: Record<string, string> = translations
const lowercaseDictionary = Object.fromEntries(Object.entries(dictionary).map(([key, value]) => [key.toLowerCase(), value]))

export function localeFromPath(pathname: string): SiteLocale {
  return resolveLocale(pathname)
}

export function localizedPath(href: string, locale: SiteLocale): string {
  return resolvePath(href, locale)
}

export function translate(locale: SiteLocale, text: string): string {
  if (locale === 'en') return text
  const normalized = text.replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
  const value = dictionary[normalized] ?? lowercaseDictionary[normalized.toLowerCase()]
  if (value === undefined) {
    for (const suffix of [' Watch the original video and read the exact prompt used to create it.', ' See the original image and the exact GPT Image 2 prompt used to create it.']) {
      if (text.endsWith(suffix)) return translate(locale, text.slice(0, -suffix.length)) + translate(locale, suffix.trim())
    }
    return text
  }
  return (text.startsWith(' ') ? ' ' : '') + value + (text.endsWith(' ') ? ' ' : '')
}

// Translate editorial content while preserving generation prompts and machine values.
export function localizedContent<T>(value: T, locale: SiteLocale): T {
  if (typeof value === 'string') return translate(locale, value) as T
  if (Array.isArray(value)) return value.map(item => localizedContent(item, locale)) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
      ['prompt', 'slug', 'id', 'aspectRatio', 'size', 'videoUrl', 'posterUrl', 'imageUrl', 'sourceUrl'].includes(key) ? item : localizedContent(item, locale),
    ])) as T
  }
  return value
}

export function useSiteI18n() {
  const pathname = useRouterState({ select: state => state.location.pathname })
  const locale = localeFromPath(pathname)
  return {
    locale,
    t: (text: string) => translate(locale, text),
    path: (href: string) => localizedPath(href, locale),
    content: <T,>(value: T) => localizedContent(value, locale),
  }
}

export function localizeHead<T extends { meta?: Record<string, unknown>[]; links?: Record<string, unknown>[] }>(head: T, pathname: string, locale: SiteLocale): T {
  const canonical = head.links?.find(link => link.rel === 'canonical')?.href
  const pagePath = typeof canonical === 'string' ? new URL(canonical, 'https://seedance3-pro.com').pathname : pathname
  const url = 'https://seedance3-pro.com' + localizedPath(pagePath, locale)
  const meta = (head.meta ?? []).map(item => {
    if (typeof item.title === 'string') return { ...item, title: translate(locale, item.title) }
    if (item.name === 'description' || ['og:title', 'og:description', 'twitter:title', 'twitter:description'].includes(item.property as string) || ['twitter:title', 'twitter:description'].includes(item.name as string)) {
      return { ...item, content: typeof item.content === 'string' ? translate(locale, item.content) : item.content }
    }
    if (item.property === 'og:url') return { ...item, content: url }
    return item
  })
  return {
    ...head,
    meta: [...meta, { property: 'og:locale', content: locale === 'zh' ? 'zh_CN' : 'en_US' }],
    links: [...(head.links ?? []).filter(link => link.rel !== 'canonical'), { rel: 'canonical', href: url }],
  } as T
}
