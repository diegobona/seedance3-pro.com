import { HeadContent, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import poseEntryVisibility from '../../assets/pose-entry-visibility.js?raw'
import '../../assets/pose-entry-visibility.css'
import siteLanguage from '../../assets/site-language.js?raw'
import '../../assets/site-language.css'
import { localeFromPath, localizedPath } from '../../app/site-locale.mjs'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#090a0c' },
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
        <link rel="alternate" hrefLang="en" href={enUrl} />
        <link rel="alternate" hrefLang="zh-Hans" href={zhUrl} />
        <link rel="alternate" hrefLang="x-default" href={enUrl} />
        <script dangerouslySetInnerHTML={{ __html: poseEntryVisibility }} />
        <script dangerouslySetInnerHTML={{ __html: siteLanguage }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
