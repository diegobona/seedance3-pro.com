import { localizeHead } from '../lib/site-i18n'
import { createFileRoute } from '@tanstack/react-router'
import { MuseWorkspacePage } from '../components/muse-workspace-page'

const url = 'https://seedance3-pro.com/app/image/muse-image'

export const Route = createFileRoute('/app_/image/muse-image')({
  head: () => (localizeHead({
    meta: [
      { title: 'Muse Image Workspace Preview | SEEDANCE' },
      { name: 'description', content: 'Preview the Muse Image workspace and draft an image prompt. Generation is not available in this workspace yet.' },
      { name: 'robots', content: 'noindex,follow' },
      { property: 'og:url', content: url },
    ],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }, '/app/image/muse-image', 'en')),
  component: () => <MuseWorkspacePage model="muse-image" />,
})
