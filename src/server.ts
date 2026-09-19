import handler from '@tanstack/react-start/server-entry'
import legacyWorker from '../worker.js'

interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void
}

interface ScheduledControllerLike {
  cron: string
  scheduledTime: number
  noRetry(): void
}

interface WorkerHandler {
  fetch(request: Request, env: Env, ctx: WorkerContext): Response | Promise<Response>
  scheduled(controller: ScheduledControllerLike, env: Env, ctx: WorkerContext): void | Promise<void>
}

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
    const { pathname } = new URL(request.url)
    if (pathname.startsWith('/app-assets/')) {
      return env.ASSETS.fetch(request)
    }
    if (isLegacyApiRequest(request) || request.method === 'OPTIONS') {
      return legacyWorker.fetch(request, env, ctx)
    }
    return handler.fetch(request)
  },
  scheduled(controller, env, ctx) {
    return legacyWorker.scheduled(controller, env, ctx)
  },
} satisfies WorkerHandler
