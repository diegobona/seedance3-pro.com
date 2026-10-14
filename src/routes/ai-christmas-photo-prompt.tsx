import { createFileRoute } from '@tanstack/react-router'
import { StudioShowcasePage } from '../components/studio-showcase-page'
import { christmasPhotoDescription, christmasPhotoTitle, christmasPhotoUrl } from '../data/christmas-photo-prompts'
import { localizeHead } from '../lib/site-i18n'

export const Route = createFileRoute('/ai-christmas-photo-prompt')({
  head: () => localizeHead({
    meta: [
      { title: christmasPhotoTitle },
      { name: 'description', content: christmasPhotoDescription },
      { name: 'robots', content: 'index,follow,max-image-preview:large' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: christmasPhotoTitle },
      { property: 'og:description', content: christmasPhotoDescription },
      { property: 'og:url', content: christmasPhotoUrl },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: christmasPhotoTitle },
      { name: 'twitter:description', content: christmasPhotoDescription },
    ],
    links: [{ rel: 'canonical', href: christmasPhotoUrl }, { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  }, '/ai-christmas-photo-prompt', 'en'),
  component: () => <StudioShowcasePage model="christmas-photo" />,
})
