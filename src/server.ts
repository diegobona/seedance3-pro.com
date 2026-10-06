import handler from '@tanstack/react-start/server-entry'
import legacyWorker from '../worker.js'
import { reconcileVideoGenerationTasks } from './lib/video-task-reconciler'
import { legacyModelRedirect, modelIdFromPath } from '../app/seo-routes.mjs'
import { localeFromPath, localizedPath, stripLocalePath, localeRedirect } from '../app/site-locale.mjs'
import { fetchPublicPage, isStudioDocument } from './lib/site-static-proxy'
import poseEntryVisibility from '../assets/pose-entry-visibility.js?raw'
import { collectSeedanceNews, NEWS_CRON, readNewsState } from './lib/seedance-news'
import { newsDocument, newsPageRequest, rewriteNewsResponse } from './lib/seedance-news-page'

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

const legacyPromptPaths: Record<string, string> = {
  '/prompts/minimax-h3/videos': '/minimax-h3-prompts',
  '/prompts/gpt-image-2/images': '/gpt-image-2-prompts',
}
const legacyH3VideoCasePrefix = '/prompts/minimax-h3/videos/'

function isLegacyApiRequest(request: Request) {
  const { pathname } = new URL(request.url)
  return legacyApiPaths.has(pathname) || pathname.startsWith('/api/job/')
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const { pathname } = url
    const basePath = stripLocalePath(pathname)
    // Static Pages and React workspaces must use the same referral guard version.
    if (pathname === '/assets/pose-entry-visibility.js' && (request.method === 'GET' || request.method === 'HEAD')) {
      return new Response(request.method === 'HEAD' ? null : poseEntryVisibility, {
        headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' },
      })
    }
    if (request.method === 'GET' || request.method === 'HEAD') {
      const redirect = localeRedirect(request, request.cf?.country)
      if (redirect) return redirect
      const locale = localeFromPath(pathname)
      const promptDestination = legacyPromptPaths[basePath]
      if (promptDestination) return Response.redirect(`https://seedance3-pro.com${localizedPath(promptDestination, locale)}${url.search}`, 308)
      if (basePath.startsWith(legacyH3VideoCasePrefix)) {
        const slug = basePath.slice(legacyH3VideoCasePrefix.length)
        if (slug && !slug.includes('/')) return Response.redirect(`https://seedance3-pro.com${localizedPath(`/minimax-h3-prompts/${slug}`, locale)}${url.search}`, 308)
      }
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
      return rewriteNewsResponse(request, response, state)
    }
    return fetchPublicPage(request)
  },
  scheduled(controller, env, ctx) {
    if (controller.cron === NEWS_CRON) {
      if (!env.CMS_JOBS) throw new Error('Official news storage is not configured')
      return collectSeedanceNews(env.CMS_JOBS).then(() => undefined)
    }
    const legacyScheduled = Promise.resolve(legacyWorker.scheduled(controller, env, ctx))
    ctx.waitUntil(reconcileVideoGenerationTasks(env))
    return legacyScheduled
  },
} satisfies WorkerHandler
