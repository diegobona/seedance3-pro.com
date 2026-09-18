import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { createAuth } from '../../../lib/auth'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => createAuth(request, env).handler(request),
      POST: ({ request }) => createAuth(request, env).handler(request),
    },
  },
})
