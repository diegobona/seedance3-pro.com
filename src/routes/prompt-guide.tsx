import { createFileRoute } from '@tanstack/react-router'
import { ComingSoonPage } from '../components/coming-soon-page'

export const Route = createFileRoute('/prompt-guide')({
  head: () => ({
    meta: [
      { title: 'Prompt Guide Coming Soon | SEEDANCE 3.0' },
      { name: 'description', content: 'The SEEDANCE prompt guide is being prepared. Explore the video and image tools and current examples in the meantime.' },
      { name: 'robots', content: 'noindex,follow' },
    ],
    links: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  }),
  component: () => <ComingSoonPage kind="Prompt guide" title="A practical prompt guide is on its way." description="We are building a guide for directing video scenes, refining images, and working from pose references. Each section will be based on workflows you can actually try here." primaryHref="/app/video/minimax-h3" primaryLabel="Try the H3 video tool" />,
})
