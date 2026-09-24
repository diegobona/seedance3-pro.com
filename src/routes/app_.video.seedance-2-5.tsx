import { createFileRoute } from '@tanstack/react-router'
import { StudioPage } from './app'

const url = 'https://seedance3-pro.com/app/video/seedance-2-5'
const title = 'Seedance 2.5 Video Studio Preview | Seedance'
const description = 'Explore the Seedance 2.5 video workspace. Create a text-to-video trial clip in 5, 10 or 15 seconds at 480p.'

export const Route = createFileRoute('/app_/video/seedance-2-5')({
  head: () => ({
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'robots', content: 'index,follow,max-image-preview:large,max-video-preview:-1' },
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
  component: () => <StudioPage initialModel="seedance-2-5" modelLanding />,
})
