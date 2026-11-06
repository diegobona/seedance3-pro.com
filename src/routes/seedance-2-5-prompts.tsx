import { localizeHead } from '../lib/site-i18n'
import { createFileRoute } from '@tanstack/react-router'
import { StudioShowcasePage } from '../components/studio-showcase-page'

const url = 'https://seedance3-pro.com/seedance-2-5-prompts'
const title = 'Seedance 2.5 Prompt Library | Templates & Examples'
const description = 'Browse 5-second video prompt templates for products, portraits, food, landscapes, pets and animation, alongside video examples. Copy a prompt and try your own version.'

export const Route = createFileRoute('/seedance-2-5-prompts')({
  head: () => (localizeHead({
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'robots', content: 'index,follow,max-image-preview:large,max-video-preview:-1' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { property: 'og:image', content: 'https://seedance3-pro.com/media/showcase-h3/2026-09-25/cat-fashion-runway.jpg' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: 'https://seedance3-pro.com/media/showcase-h3/2026-09-25/cat-fashion-runway.jpg' },
    ],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }, "/seedance-2-5-prompts", 'en')),
  component: () => <StudioShowcasePage model="minimax-h3" />,
})
