import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { queryAutodlVideoTask } from '../../../../scripts/autodl-video.mjs'
import { createDb } from '../../../db'
import { createVideoGenerationTaskStore } from '../../../db/video-generation-tasks'
import { createAuth } from '../../../lib/auth'
import {
  protectVideoGenerationPoll,
  type VideoProviderQueryResult,
} from '../../../lib/protected-video-generation'

const LOCAL_TASK_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function jsonError(status: number, code: string, message: string) {
  return Response.json({ success: false, code, message }, {
    status,
    headers: { 'cache-control': 'no-store' },
  })
}

function isSameOriginRequest(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

function safeProviderLogDetails(error: unknown) {
  const value = error as { code?: unknown; providerStatus?: unknown; retriable?: unknown } | null
  const rawCode = typeof value?.code === 'string' ? value.code : 'UNCLASSIFIED'
  const code = /^[A-Z0-9_]{1,64}$/.test(rawCode) ? rawCode : 'UNCLASSIFIED'
  const providerStatus = typeof value?.providerStatus === 'number'
    && Number.isSafeInteger(value.providerStatus)
    && value.providerStatus >= 100
    && value.providerStatus <= 599
    ? value.providerStatus
    : undefined
  return {
    code,
    retriable: value?.retriable === true,
    ...(providerStatus === undefined ? {} : { providerStatus }),
  }
}

function logVideoEvent(event: string, details: Record<string, unknown> = {}) {
  console.error(JSON.stringify({ event, ...details }).slice(0, 500))
}

function unavailableResponse() {
  return jsonError(
    503,
    'VIDEO_SERVICE_UNAVAILABLE',
    'Video generation is temporarily unavailable. Please try again later.',
  )
}

export const Route = createFileRoute('/api/videos/status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isSameOriginRequest(request)) {
          return jsonError(403, 'CROSS_SITE_REQUEST', 'Cross-site video status requests are not allowed.')
        }

        const url = new URL(request.url)
        const taskParameters = url.searchParams.getAll('task')
        const localTaskId = taskParameters[0] ?? ''
        if (url.searchParams.size !== 1
          || taskParameters.length !== 1
          || !LOCAL_TASK_UUID_PATTERN.test(localTaskId)) {
          return jsonError(400, 'INVALID_VIDEO_TASK', 'A valid video task is required.')
        }

        const databaseUrl = env.DATABASE_URL?.trim() ?? ''
        const token = env.AUTODL_TOKEN?.trim() ?? ''
        if (!databaseUrl || !token) {
          logVideoEvent('video_status_unavailable', { reason: 'missing_configuration' })
          return unavailableResponse()
        }

        const taskStore = createVideoGenerationTaskStore(createDb(databaseUrl))
        return protectVideoGenerationPoll({
          request,
          localTaskId,
          getSession: async (sessionRequest) => {
            const session = await createAuth(sessionRequest, env).api.getSession({ headers: sessionRequest.headers })
            return session?.user?.id ? { user: { id: session.user.id } } : null
          },
          taskStore,
          query: async (providerTaskId) => {
            try {
              return await queryAutodlVideoTask(providerTaskId, { token }) as VideoProviderQueryResult
            } catch (error) {
              logVideoEvent('video_status_provider_error', safeProviderLogDetails(error))
              throw error
            }
          },
        })
      },
    },
  },
})
