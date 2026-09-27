import { createFileRoute } from '@tanstack/react-router'
import { Seedance3PreviewPage } from '../components/seedance3-preview-page'

const url = 'https://seedance3-pro.com/app/video/seedance-3'

export const Route = createFileRoute('/app_/video/seedance-3')({
  head: () => ({
    meta: [
      { title: 'Seedance 3.0 Video Workspace Preview | SEEDANCE' },
      { name: 'description', content: 'Preview the Seedance 3.0 video workspace and draft a prompt. Generation is coming soon.' },
      { name: 'robots', content: 'noindex,follow' },
      { property: 'og:url', content: url },
    ],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }),
  component: Seedance3PreviewPage,
})
