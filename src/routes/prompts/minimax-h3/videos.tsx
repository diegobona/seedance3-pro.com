import { createFileRoute } from '@tanstack/react-router'
import { ComingSoonPage } from '../../../components/coming-soon-page'

export const Route = createFileRoute('/prompts/minimax-h3/videos')({
  head: () => ({
    meta: [
      { title: 'MiniMax H3 Video Examples Coming Soon | SEEDANCE 3.0' },
      { name: 'description', content: 'A MiniMax H3 video case library is coming soon. Watch current examples or try text-to-video generation now.' },
      { name: 'robots', content: 'noindex,follow' },
    ],
    links: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  }),
  component: () => <ComingSoonPage kind="Video case library" title="MiniMax H3 video cases are coming soon." description="We are preparing a browsable collection of video results and the creative directions behind them. You can watch the current H3 samples in our showcase today." primaryHref="/app/video/minimax-h3" primaryLabel="Create with MiniMax H3" />,
})
