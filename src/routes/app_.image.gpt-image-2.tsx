import { createFileRoute } from '@tanstack/react-router'
import { StudioPage } from './app'

const url = 'https://seedance3-pro.com/app/image/gpt-image-2'
const title = 'GPT Image 2 Generator & Editor Online | Seedance'
const description = 'Generate and edit images with GPT Image 2 online. Start from a prompt or reference image, choose a format, and create 1K trial images in Seedance.'

export const Route = createFileRoute('/app_/image/gpt-image-2')({
  head: () => ({
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'robots', content: 'index,follow,max-image-preview:large' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { property: 'og:image', content: 'https://seedance3-pro.com/assets/seedance3-cinematic-hero.webp' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }),
  component: () => <StudioPage initialModel="gpt-image-2" modelLanding />,
})
