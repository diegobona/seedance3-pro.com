import { createFileRoute } from '@tanstack/react-router'
import { ComingSoonPage } from '../components/coming-soon-page'

export const Route = createFileRoute('/seedance-3-0-prompts')({
  head: () => ({
    meta: [
      { title: 'Seedance 3.0 Showcase & Prompts Coming Soon | SEEDANCE 3.0' },
      { name: 'description', content: 'The Seedance 3.0 video showcase and prompt library are coming soon. Browse the videos already available in our showcase.' },
      { name: 'robots', content: 'noindex,follow' },
    ],
    links: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  }),
  component: () => <ComingSoonPage kind="Seedance 3.0 showcase" title="Seedance 3.0 prompts are coming soon." description="This model-specific showcase is reserved for Seedance 3.0 examples and their prompts. You can browse the video ideas already available in the current showcase." primaryHref="/showcase.html" primaryLabel="Explore current videos" />,
})
