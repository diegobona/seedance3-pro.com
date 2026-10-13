import { localizeHead } from '../lib/site-i18n'
import { createFileRoute } from '@tanstack/react-router'
import { StudioShowcasePage } from '../components/studio-showcase-page'

const url = 'https://seedance3-pro.com/seedance-3-0-prompts'

export const Route = createFileRoute('/zh/seedance-3-0-prompts')({
  head: () => (localizeHead({
    meta: [
      { title: 'Seedance 3.0 Prompt Library Preview | SEEDANCE 3.0' },
      { name: 'description', content: 'Browse planned Seedance 3.0 video prompt tests. Video examples are coming soon.' },
      { name: 'robots', content: 'index,follow,max-image-preview:large,max-video-preview:-1' },
    ],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }, "/seedance-3-0-prompts", 'zh')),
  component: () => <StudioShowcasePage model="seedance-3-0" />,
})
