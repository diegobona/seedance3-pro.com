import { localizeHead } from '../lib/site-i18n'
import { createFileRoute } from '@tanstack/react-router'
import { StudioPage } from './app'

const url = 'https://seedance3-pro.com/app/image/gpt-image-2-5-1k'
const title = 'GPT Image 2.5 Generator | Tuzi Image Creation & Editing'
const description = 'Generate and edit images with GPT Image 2.5, a Tuzi routing alias. Use text prompts or reference images at supported fixed sizes for 5 credits per image.'
const previewImage = 'https://seedance3-pro.com/assets/apple-touch-icon.png'

export const Route = createFileRoute('/zh/app_/image/gpt-image-2-5-1k')({
  head: () => (localizeHead({
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'robots', content: 'index,follow,max-image-preview:large' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: url },
      { property: 'og:image', content: previewImage },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: previewImage },
    ],
    links: [
      { rel: 'canonical', href: url },
      { rel: 'alternate', hrefLang: 'en', href: url },
      { rel: 'alternate', hrefLang: 'zh-Hans', href: 'https://seedance3-pro.com/zh/app/image/gpt-image-2-5-1k' },
      { rel: 'alternate', hrefLang: 'x-default', href: url },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }, '/app/image/gpt-image-2-5-1k', 'zh')),
  component: () => <StudioPage initialModel="gpt-image-2-5-1k" modelLanding />,
})
