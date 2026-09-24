import handler from '@tanstack/react-start/server-entry'
import legacyWorker from '../worker.js'
import { reconcileVideoGenerationTasks } from './lib/video-task-reconciler'
import { legacyModelRedirect, modelIdFromPath } from '../app/seo-routes.mjs'

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
    const url = new URL(request.url)
    const { pathname } = url
    if (request.method === 'GET' || request.method === 'HEAD') {
      const destination = legacyModelRedirect(url)
      if (destination) return Response.redirect(`https://seedance3-pro.com${destination}`, 308)
      if (url.hostname === 'www.seedance3-pro.com' && modelIdFromPath(pathname)) {
        return Response.redirect(`https://seedance3-pro.com${pathname}${url.search}`, 308)
      }
    }
    if (pathname.startsWith('/app-assets/')) {
      return env.ASSETS.fetch(request)
    }
    if (isLegacyApiRequest(request) || request.method === 'OPTIONS') {
      return legacyWorker.fetch(request, env, ctx)
    }
    return handler.fetch(request)
  },
  scheduled(controller, env, ctx) {
    const legacyScheduled = Promise.resolve(legacyWorker.scheduled(controller, env, ctx))
    ctx.waitUntil(reconcileVideoGenerationTasks(env))
    return legacyScheduled
  },
} satisfies WorkerHandler
