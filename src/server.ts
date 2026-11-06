import handler from '@tanstack/react-start/server-entry'
import legacyWorker from '../worker.js'
import { reconcileVideoGenerationTasks } from './lib/video-task-reconciler'
import { legacyModelRedirect } from '../app/seo-routes.mjs'
import { hiddenModelDestination } from '../app/hidden-models.mjs'
import { partnerImageRedirect } from '../app/partner-image-redirect.mjs'
import { localeFromPath, stripLocalePath, localeRedirect } from '../app/site-locale.mjs'
import { canonicalSiteRedirect, fetchPublicPage, isStudioDocument } from './lib/site-static-proxy'
import { maintainCreationLibrary } from './lib/creation-storage'
import poseEntryVisibility from '../assets/pose-entry-visibility.js?raw'
import { collectSeedanceNews, NEWS_CRON, readNewsState } from './lib/seedance-news'
import { newsDocument, newsPageRequest, rewriteNewsResponse } from './lib/seedance-news-page'
import { databaseMaintenanceResponse } from './lib/database-maintenance'
import { withPlausibleAnalytics } from './lib/plausible'
import { processRefundNotifications } from './lib/refund-notifications'

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
    const maintenance = databaseMaintenanceResponse(request, env.DATABASE_MIGRATION_PAUSED)
    if (maintenance) return maintenance
    const url = new URL(request.url)
    const { pathname } = url
    const basePath = stripLocalePath(pathname)
    if (request.method === 'GET' || request.method === 'HEAD') {
      const destination = hiddenModelDestination(url)
      if (destination) return new Response(null, { status: 302, headers: {
        location: new URL(destination, url.origin).href, 'cache-control': 'no-store',
      } })
    }
    // Attribute partner links before canonical or locale hops can lose Referer.
    const partnerRedirect = partnerImageRedirect(request)
    if (partnerRedirect) return partnerRedirect
    const canonicalRedirect = canonicalSiteRedirect(request)
    if (canonicalRedirect) return canonicalRedirect
    // Static Pages and React workspaces must use the same referral guard version.
    if (pathname === '/assets/pose-entry-visibility.js' && (request.method === 'GET' || request.method === 'HEAD')) {
      return new Response(request.method === 'HEAD' ? null : poseEntryVisibility, {
        headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' },
      })
    }
    if (request.method === 'GET' || request.method === 'HEAD') {
      const redirect = localeRedirect(request, request.cf?.country)
      if (redirect) return redirect
      const destination = legacyModelRedirect(url)
      if (destination) return Response.redirect(`https://seedance3-pro.com${destination}`, /^\/flux-3(?:-video-generator)?(?:\.html)?$/.test(basePath) ? 301 : 308)
    }
    if (pathname.startsWith('/app-assets/')) {
      return env.ASSETS.fetch(request)
    }
    if (isLegacyApiRequest(request) || request.method === 'OPTIONS') {
      return legacyWorker.fetch(request, env, ctx)
    }
    if (pathname.startsWith('/api/') || pathname.startsWith('/@tanstack-start/') || pathname.startsWith('/_serverFn/') || isStudioDocument(pathname)) {
      const response = await handler.fetch(request)
      if (!isStudioDocument(pathname)) return response
      const headers = new Headers(response.headers)
      headers.set('content-language', localeFromPath(pathname) === 'zh' ? 'zh-Hans' : 'en')
      headers.set('cache-control', 'private, no-store')
      return new Response(response.body, { status: response.status, headers })
    }
    if (request.method === 'GET' && newsDocument(pathname) && env.CMS_JOBS) {
      const [response, state] = await Promise.all([
        fetchPublicPage(newsPageRequest(request)),
        readNewsState(env.CMS_JOBS).catch(() => {
          console.warn(JSON.stringify({ event: 'seedance_news_read_failed' }))
          return null
        }),
      ])
      return withPlausibleAnalytics(request, rewriteNewsResponse(request, response, state))
    }
    return withPlausibleAnalytics(request, await fetchPublicPage(request))
  },
  scheduled(controller, env, ctx) {
    if (env.DATABASE_MIGRATION_PAUSED === '1') return
    if (controller.cron === NEWS_CRON) {
      if (!env.CMS_JOBS) throw new Error('Official news storage is not configured')
      return collectSeedanceNews(env.CMS_JOBS).then(() => undefined)
    }
    const legacyScheduled = Promise.resolve(legacyWorker.scheduled(controller, env, ctx))
    ctx.waitUntil(reconcileVideoGenerationTasks(env))
    ctx.waitUntil(maintainCreationLibrary(env))
    ctx.waitUntil(processRefundNotifications(env))
    return legacyScheduled
  },
} satisfies WorkerHandler
