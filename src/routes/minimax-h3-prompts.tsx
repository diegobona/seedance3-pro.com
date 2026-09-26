import { createFileRoute } from '@tanstack/react-router'
import { StudioShowcasePage } from '../components/studio-showcase-page'

const url = 'https://seedance3-pro.com/minimax-h3-prompts'
const title = 'MiniMax H3 Prompt Library | Original Examples'
const description = 'Browse MiniMax H3 video prompts with original examples and creative notes. Watch each scene, read its exact prompt, and try your own version in the generator.'

export const Route = createFileRoute('/minimax-h3-prompts')({
  head: () => ({
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'robots', content: 'index,follow,max-image-preview:large,max-video-preview:-1' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { property: 'og:image', content: 'https://seedance3-pro.com/media/showcase-h3/2026-09-25/corgi-sprint.jpg' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: 'https://seedance3-pro.com/media/showcase-h3/2026-09-25/corgi-sprint.jpg' },
    ],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }),
  component: () => <StudioShowcasePage model="minimax-h3" />,
})
