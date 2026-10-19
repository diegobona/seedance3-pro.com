import { FLUX_3_PATH, flux3Content } from '../../app/flux-3-content.mjs'
import { localizeHead, type SiteLocale } from './site-i18n'

// Match the H3 model route's metadata and canonical URL convention.
export function flux3Head(locale: SiteLocale) {
  const { title, description } = flux3Content(locale)
  const url = 'https://seedance3-pro.com' + FLUX_3_PATH
  const image = 'https://seedance3-pro.com/assets/seedance3-cinematic-hero.webp'
  return localizeHead({
    meta: [
      { title }, { name: 'description', content: description },
      { name: 'keywords', content: 'FLUX 3,FLUX 3 video generation,FLUX 3 image generation,FLUX 3 vs FLUX 2' },
      { name: 'robots', content: 'index,follow,max-image-preview:large,max-video-preview:-1' },
      { property: 'og:type', content: 'website' }, { property: 'og:title', content: title },
      { property: 'og:description', content: description }, { property: 'og:url', content: url },
      { property: 'og:image', content: image }, { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title }, { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
    ],
    links: [{ rel: 'canonical', href: url }, { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  }, FLUX_3_PATH, locale)
}
