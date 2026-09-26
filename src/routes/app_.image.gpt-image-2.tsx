import { createFileRoute } from '@tanstack/react-router'
import { StudioPage } from './app'

const url = 'https://seedance3-pro.com/app/image/gpt-image-2'
const title = 'GPT Image 2 Generator | AI Image Creation & Editing'
const description = 'Generate and edit images with GPT Image 2 online. Combine reference images, describe your changes, or start with an original prompt from the Prompt Library.'
const previewImage = 'https://seedance3-pro.com/media/showcase-gpt-image-2/2026-09-26/foldable-pocket-universe.webp'

export const Route = createFileRoute('/app_/image/gpt-image-2')({
  head: () => ({
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'robots', content: 'index,follow,max-image-preview:large' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { property: 'og:image', content: previewImage },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: previewImage },
    ],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }),
  component: () => <StudioPage initialModel="gpt-image-2" modelLanding />,
})
