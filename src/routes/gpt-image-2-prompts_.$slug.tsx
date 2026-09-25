import { createFileRoute, notFound } from '@tanstack/react-router'
import { GptImageCaseDetail } from '../components/gpt-image-case-page'
import { getGptImageCase, gptImageCaseUrl } from '../data/gpt-image-cases'

const siteUrl = 'https://seedance3-pro.com'

export const Route = createFileRoute('/gpt-image-2-prompts_/$slug')({
  loader: ({ params }) => {
    const imageCase = getGptImageCase(params.slug)
    if (!imageCase) throw notFound()
    return imageCase
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const canonicalUrl = siteUrl + gptImageCaseUrl(loaderData.slug)
    const description = loaderData.summary + ' See the original image and the exact GPT Image 2 prompt used to create it.'
    return {
      meta: [
        { title: loaderData.seoTitle },
        { name: 'description', content: description },
        { name: 'robots', content: 'index,follow,max-image-preview:large' },
        { property: 'og:type', content: 'article' },
        { property: 'og:title', content: loaderData.seoTitle },
        { property: 'og:description', content: description },
        { property: 'og:url', content: canonicalUrl },
        { property: 'og:image', content: siteUrl + loaderData.imageUrl },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      links: [
        { rel: 'canonical', href: canonicalUrl },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    }
  },
  component: () => <GptImageCaseDetail imageCase={Route.useLoaderData()} />,
})
