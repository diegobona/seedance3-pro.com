import { StudioPage } from './app'
import { localizeHead } from '../lib/site-i18n'
import { createFileRoute } from '@tanstack/react-router'
import '../../app/studio.css'
import '../styles/auth.css'
import '../styles/model-landing.css'

export const Route = createFileRoute('/zh/app')({
  validateSearch: (search: Record<string, unknown>) =>
    typeof search.model === 'string' && search.model ? { model: search.model } : {},
  head: () => (localizeHead({
    meta: [
      { title: 'AI Creative Studio | SEEDANCE 3.0' },
      { name: 'description', content: 'Generate and edit images in the SEEDANCE creative studio.' },
      { name: 'robots', content: 'noindex,follow' },
    ],
    links: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  }, "/app", 'zh')),
  component: AppPage,
})

function AppPage() {
  const { model } = Route.useSearch()
  return <StudioPage initialModel={model} />
}
