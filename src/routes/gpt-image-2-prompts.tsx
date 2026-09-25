import { createFileRoute } from '@tanstack/react-router'
import { StudioShowcasePage } from '../components/studio-showcase-page'

const url = 'https://seedance3-pro.com/gpt-image-2-prompts'
const title = 'GPT Image 2 Prompts & Image Showcase | Original Examples'
const description = 'Explore five original GPT Image 2 images in distinct styles, with the exact text prompt and creative direction for each example.'

export const Route = createFileRoute('/gpt-image-2-prompts')({
  head: () => ({
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'robots', content: 'index,follow,max-image-preview:large' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { property: 'og:image', content: 'https://seedance3-pro.com/media/showcase-gpt-image-2/2026-09-26/summit-circus-satire.webp' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }),
  component: () => <StudioShowcasePage model="gpt-image-2" />,
})
