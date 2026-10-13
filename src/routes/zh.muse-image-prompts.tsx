import { localizeHead } from '../lib/site-i18n'
import { createFileRoute } from '@tanstack/react-router'
import { StudioShowcasePage } from '../components/studio-showcase-page'

const url = 'https://seedance3-pro.com/muse-image-prompts'
const title = 'Muse Image Prompt Library | Starter Templates'
const description = 'Browse Muse Image starter prompts for illustrations, product images, and more. Read a template and open it in the workspace to draft your image prompt.'

export const Route = createFileRoute('/zh/muse-image-prompts')({
  head: () => (localizeHead({
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'robots', content: 'index,follow,max-image-preview:large' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
    ],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }, '/muse-image-prompts', 'zh')),
  component: () => <StudioShowcasePage model="muse-image" />,
})
