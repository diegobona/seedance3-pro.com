import { useEffect, useRef } from 'react'
import { renderSitePromo } from '../../app/site-promo.mjs'
import { initializeSitePromo } from '../../assets/site-promo.mjs'

export function SitePromoBanner({ locale }: { locale: 'en' | 'zh' }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const banner = host.current?.querySelector<HTMLElement>('[data-site-promo]')
    if (banner) return initializeSitePromo(banner)
  }, [locale])

  return <div ref={host} className="site-promo-host" dangerouslySetInnerHTML={{ __html: renderSitePromo(locale) }} />
}
