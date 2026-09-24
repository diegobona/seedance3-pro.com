import { createFileRoute } from '@tanstack/react-router'
import { ComingSoonPage } from '../../../components/coming-soon-page'

export const Route = createFileRoute('/prompts/gpt-image-2/images')({
  head: () => ({
    meta: [
      { title: 'GPT Image 2 Image Examples Coming Soon | SEEDANCE 3.0' },
      { name: 'description', content: 'A GPT Image 2 image case library is coming soon. Explore current sample images or create an image from your own prompt.' },
      { name: 'robots', content: 'noindex,follow' },
    ],
    links: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  }),
  component: () => <ComingSoonPage kind="Image case library" title="GPT Image 2 image cases are coming soon." description="We are preparing image examples with clear creative goals and reusable directions. For now, explore the current images and try your own prompt or reference image in the studio." primaryHref="/app/image/gpt-image-2" primaryLabel="Create with GPT Image 2" />,
})
