import { createFileRoute } from '@tanstack/react-router'
import { H3VideoCaseIndex } from '../../../components/h3-video-case-page'

const url = 'https://seedance3-pro.com/prompts/minimax-h3/videos'
const title = 'MiniMax H3 Prompt Library | Original Examples'
const description = 'Watch original MiniMax H3 videos and explore the exact text prompts used to create each short scene.'

export const Route = createFileRoute('/prompts/minimax-h3/videos')({
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
    ],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }),
  component: H3VideoCaseIndex,
})
