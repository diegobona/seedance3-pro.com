import { createFileRoute } from '@tanstack/react-router'
import { StudioShowcasePage } from '../components/studio-showcase-page'

export const Route = createFileRoute('/gpt-image-2-prompts')({
  head: () => ({
    meta: [
      { title: 'GPT Image 2 Showcase & Prompts Coming Soon | SEEDANCE 3.0' },
      { name: 'description', content: 'GPT Image 2 image examples and their prompts are coming soon. Explore the current showcase or create an image in the studio.' },
      { name: 'robots', content: 'noindex,follow' },
    ],
    links: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  }),
  component: () => <StudioShowcasePage model="gpt-image-2" />,
})
