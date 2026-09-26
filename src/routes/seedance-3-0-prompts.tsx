import { createFileRoute } from '@tanstack/react-router'
import { StudioShowcasePage } from '../components/studio-showcase-page'

export const Route = createFileRoute('/seedance-3-0-prompts')({
  head: () => ({
    meta: [
      { title: 'Seedance 3.0 Prompt Library Coming Soon | SEEDANCE 3.0' },
      { name: 'description', content: 'The Seedance 3.0 Prompt Library is coming soon. Browse the videos already available in our showcase.' },
      { name: 'robots', content: 'noindex,follow' },
    ],
    links: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  }),
  component: () => <StudioShowcasePage model="seedance-3-0" />,
})
