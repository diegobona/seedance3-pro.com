import { localizeHead } from '../lib/site-i18n'
import { createFileRoute } from '@tanstack/react-router'
import { StudioShowcasePage } from '../components/studio-showcase-page'

const url = 'https://seedance3-pro.com/muse-video-prompts'
const title = 'Muse Video Prompt Library | Starter Templates'
const description = 'Browse Muse Video starter prompts for cinematic scenes, product stories, and more. Read a template and open it in the workspace to draft your video prompt.'

export const Route = createFileRoute('/zh/muse-video-prompts')({
  head: () => (localizeHead({
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'robots', content: 'index,follow,max-image-preview:large,max-video-preview:-1' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
    ],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }, '/muse-video-prompts', 'zh')),
  component: () => <StudioShowcasePage model="muse-video" />,
})
