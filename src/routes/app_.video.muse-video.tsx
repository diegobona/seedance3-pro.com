import { localizeHead } from '../lib/site-i18n'
import { createFileRoute } from '@tanstack/react-router'
import { MuseWorkspacePage } from '../components/muse-workspace-page'

const url = 'https://seedance3-pro.com/app/video/muse-video'

export const Route = createFileRoute('/app_/video/muse-video')({
  head: () => (localizeHead({
    meta: [
      { title: 'Muse Video Workspace Preview | SEEDANCE' },
      { name: 'description', content: 'Preview the Muse Video workspace and draft a video prompt. Generation is not available in this workspace yet.' },
      { name: 'robots', content: 'noindex,follow' },
      { property: 'og:url', content: url },
    ],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }, '/app/video/muse-video', 'en')),
  component: () => <MuseWorkspacePage model="muse-video" />,
})
