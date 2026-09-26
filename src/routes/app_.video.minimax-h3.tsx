import { createFileRoute } from '@tanstack/react-router'
import { StudioPage } from './app'

const url = 'https://seedance3-pro.com/app/video/minimax-h3'
const title = 'MiniMax H3 Video Generator | Text & Image to Video'
const description = 'Create MiniMax H3 videos online from text or reference images. Describe your scene, choose your settings, and explore original video prompts and examples.'

export const Route = createFileRoute('/app_/video/minimax-h3')({
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
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: 'https://seedance3-pro.com/assets/seedance3-cinematic-hero.webp' },
    ],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }),
  component: () => <StudioPage initialModel="minimax-h3" modelLanding />,
})
