import { createFileRoute } from '@tanstack/react-router'
import { flux3Head } from '../lib/flux-3-head'
import { StudioPage } from './app'

export const Route = createFileRoute('/app_/video/flux-3')({
  head: () => flux3Head('en'),
  component: () => <StudioPage initialModel="minimax-h3" modelLanding landingPage="flux-3" />,
})
