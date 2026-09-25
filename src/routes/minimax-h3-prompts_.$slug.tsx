import { createFileRoute, notFound } from '@tanstack/react-router'
import { H3VideoCaseDetail } from '../components/h3-video-case-page'
import { getH3VideoCase, h3VideoCaseUrl } from '../data/h3-video-cases'

const siteUrl = 'https://seedance3-pro.com'

export const Route = createFileRoute('/minimax-h3-prompts_/$slug')({
  loader: ({ params }) => {
    const videoCase = getH3VideoCase(params.slug)
    if (!videoCase) throw notFound()
    return videoCase
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const canonicalUrl = siteUrl + h3VideoCaseUrl(loaderData.slug)
    const description = loaderData.summary + ' Watch the original five-second video and read the exact prompt used to create it.'
    return {
      meta: [
        { title: loaderData.seoTitle },
        { name: 'description', content: description },
        { name: 'robots', content: 'index,follow,max-image-preview:large,max-video-preview:-1' },
        { property: 'og:type', content: 'video.other' },
        { property: 'og:title', content: loaderData.seoTitle },
        { property: 'og:description', content: description },
        { property: 'og:url', content: canonicalUrl },
        { property: 'og:image', content: siteUrl + loaderData.posterUrl },
        { property: 'og:video', content: siteUrl + loaderData.videoUrl },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      links: [
        { rel: 'canonical', href: canonicalUrl },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    }
  },
  component: () => <H3VideoCaseDetail videoCase={Route.useLoaderData()} />,
})
