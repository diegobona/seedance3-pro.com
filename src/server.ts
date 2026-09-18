import handler from '@tanstack/react-start/server-entry'
import legacyWorker from '../worker.js'

const legacyApiPaths = new Set([
  '/api/upload-images',
  '/api/publish',
  '/api/post',
  '/api/retry-now',
])

function isLegacyApiRequest(request: Request) {
  const { pathname } = new URL(request.url)
  return legacyApiPaths.has(pathname) || pathname.startsWith('/api/job/')
}

export default {
  async fetch(request, env, ctx) {
    if (isLegacyApiRequest(request) || request.method === 'OPTIONS') {
      return legacyWorker.fetch(request, env, ctx)
    }
    return handler.fetch(request)
  },
  scheduled(controller, env, ctx) {
    return legacyWorker.scheduled(controller, env, ctx)
  },
} satisfies ExportedHandler<Env>
