import { HeadContent, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import poseEntryVisibility from '../../assets/pose-entry-visibility.js?raw'
import '../../assets/pose-entry-visibility.css'
import siteLanguage from '../../assets/site-language.js?raw'
import '../../assets/site-language.css'
import { localeFromPath, localizedPath } from '../../app/site-locale.mjs'
import { SiteTrustFooter } from '../components/site-trust'
import { PLAUSIBLE_INIT, PLAUSIBLE_SCRIPT_URL } from '../lib/plausible'
import { BRAND_VERSION } from '../../app/site-brand.mjs'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#090a0c' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: `/favicon.svg?v=${BRAND_VERSION}` },
      { rel: 'icon', type: 'image/x-icon', sizes: 'any', href: `/favicon.ico?v=${BRAND_VERSION}` },
      { rel: 'apple-touch-icon', sizes: '180x180', href: `/assets/apple-touch-icon.png?v=${BRAND_VERSION}` },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: state => state.location.pathname })
  const locale = localeFromPath(pathname)
  const enUrl = `https://seedance3-pro.com${localizedPath(pathname, 'en')}`
  const zhUrl = `https://seedance3-pro.com${localizedPath(pathname, 'zh')}`
  return (
    <html lang={locale === 'zh' ? 'zh-Hans' : 'en'} suppressHydrationWarning>
      <head>
        <HeadContent />
        <link rel="preload" href="/assets/fonts/source-serif-4-roman.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="stylesheet" href="/assets/fonts/noto-serif-sc.css?v=20261024-editorial" />
        <link rel="stylesheet" href="/assets/site-typography.css?v=20261024-editorial" />
        <link data-site-brand rel="stylesheet" href={`/assets/site-brand.css?v=${BRAND_VERSION}`} />
        <link rel="alternate" hrefLang="en" href={enUrl} />
        <link rel="alternate" hrefLang="zh-Hans" href={zhUrl} />
        <link rel="alternate" hrefLang="x-default" href={enUrl} />
        <script dangerouslySetInnerHTML={{ __html: poseEntryVisibility }} />
        <script dangerouslySetInnerHTML={{ __html: siteLanguage }} />
        {import.meta.env.PROD && <>
          <script id="plausible-script" async src={PLAUSIBLE_SCRIPT_URL} />
          <script id="plausible-init" dangerouslySetInnerHTML={{ __html: PLAUSIBLE_INIT }} />
        </>}
      </head>
      <body>
        {children}
        {!/^\/(?:zh\/)?billing\/?$/.test(pathname) && <SiteTrustFooter />}
        <Scripts />
      </body>
    </html>
  )
}
