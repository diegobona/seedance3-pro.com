import { createFileRoute } from '@tanstack/react-router'
import { ComingSoonPage } from '../components/coming-soon-page'

export const Route = createFileRoute('/gpt-image-2-prompts')({
  head: () => ({
    meta: [
      { title: 'GPT Image 2 Showcase & Prompts Coming Soon | SEEDANCE 3.0' },
      { name: 'description', content: 'GPT Image 2 image examples and their prompts are coming soon. Explore the current showcase or create an image in the studio.' },
      { name: 'robots', content: 'noindex,follow' },
    ],
    links: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  }),
  component: () => <ComingSoonPage kind="GPT Image 2 showcase" title="GPT Image 2 prompts are coming soon." description="We are preparing image examples with their prompts and creative notes. For now, explore the current showcase or create an image in the studio." primaryHref="/app/image/gpt-image-2" primaryLabel="Create with GPT Image 2" />,
})
