import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import {
  preflightVideoGenerationRequest,
  submitAutodlVideoTask,
} from '../../../../scripts/autodl-video.mjs'
import { createDb } from '../../../db'
import { createVideoGenerationTaskStore } from '../../../db/video-generation-tasks'
import { createAuth } from '../../../lib/auth'
import { resolveVideoReferences } from '../../../lib/video-references'
import {
  protectVideoGenerationStart,
  type VideoGenerationPreflight,
} from '../../../lib/protected-video-generation'

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

export const Route = createFileRoute('/api/videos/generate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOriginRequest(request)) {
          return jsonError(403, 'CROSS_SITE_REQUEST', 'Cross-site video generation is not allowed.')
        }

        const databaseUrl = env.DATABASE_URL?.trim() ?? ''
        const token = env.AUTODL_TOKEN?.trim() ?? ''
        const IMAGE_RATE_LIMITER = env.IMAGE_RATE_LIMITER
        if (!databaseUrl || !token || typeof IMAGE_RATE_LIMITER?.limit !== 'function') {
          logVideoEvent('video_generate_unavailable', { reason: 'missing_configuration' })
          return unavailableResponse()
        }

        const taskStore = createVideoGenerationTaskStore(createDb(databaseUrl))
        return protectVideoGenerationStart({
          request,
          getSession: async (sessionRequest) => {
            const session = await createAuth(sessionRequest, env).api.getSession({ headers: sessionRequest.headers })
            return session?.user?.id ? { user: { id: session.user.id } } : null
          },
          taskStore,
          preflight: async (protectedRequest, userId) => {
            const validation = await preflightVideoGenerationRequest(protectedRequest) as VideoGenerationPreflight
            if (!validation.ok) return validation
            if (validation.payload.resolution !== '480p') {
              return {
                ok: false as const,
                response: jsonError(
                  400,
                  'TRIAL_RESOLUTION_UNAVAILABLE',
                  'Free trial video generation supports 480p only.',
                ),
              }
            }

            const actor = protectedRequest.headers.get('cf-connecting-ip') || 'anonymous'
            let rateLimit: { success: boolean }
            try {
              rateLimit = await IMAGE_RATE_LIMITER.limit({ key: `video-generation:${actor}` })
            } catch (error) {
              logVideoEvent('video_generate_rate_limit_error', safeProviderLogDetails(error))
              return { ok: false as const, response: unavailableResponse() }
            }
            if (!rateLimit.success) {
              return {
                ok: false as const,
                response: jsonError(
                  429,
                  'GENERATION_RATE_LIMITED',
                  'Generation limit reached. Please wait a minute and try again.',
                ),
              }
            }
            if (validation.payload.referenceImageIds) {
              try {
                validation.payload.referenceImageUrls = await resolveVideoReferences(
                  validation.payload.referenceImageIds, userId, env.VIDEO_REFERENCES,
                )
              } catch {
                return { ok: false as const, response: jsonError(400, 'INVALID_VIDEO_REFERENCE',
                  'A reference image expired or is unavailable. Please remove it and upload it again.') }
              }
            }
            return validation
          },
          submit: async (payload) => {
            try {
              return await submitAutodlVideoTask(payload, { token })
            } catch (error) {
              logVideoEvent('video_generate_provider_error', safeProviderLogDetails(error))
              throw error
            }
          },
        })
      },
    },
  },
})
