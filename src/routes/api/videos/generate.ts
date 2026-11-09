import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { optimizeGuestVideoPrompt, type PromptOptimizationStatus } from '../../../lib/guest-prompt-optimization'
import { readVideoGenerationInput } from '../../../lib/video-generation-input'
import { selectVideoWorkflow, assertVideoProviderConfigured, submitVideoTask, COMPSHARE_FIRST_FRAME_WORKFLOW_ID, YIR_IMAGE_WORKFLOW_ID, SEEAPI_IMAGE_WORKFLOW_ID } from '../../../lib/video-providers'
import { createAppDatabase, databaseConfigured, isD1Database } from '../../../db'
import { recordVideoCreation } from '../../../lib/creation-library'
import { createVideoGenerationTaskStore } from '../../../db/video-generation-tasks'
import { createTrackedVideoTaskStore, createVideoTaskActivity } from '../../../lib/video-task-activity'
import { createAuth } from '../../../lib/auth'
import { verifyGuestVideoRequest } from '../../../lib/guest-video-verification'
import { reconcileGuestCredits } from '../../../lib/guest-credit-reconciliation'
import { createGuestVideoTrialStore } from '../../../db/guest-video-trials'
import { resolveGuestVideoTrial, withGuestVideoCookie, guestVideoTrialErrorResponse, guestVideoNetworkHash } from '../../../lib/guest-video-trial'
import { readGuestVideoResourceOwner } from '../../../lib/guest-resource-ownership'
import { resolveVideoReferences, uploadVideoReference } from '../../../lib/video-references'
import { areSeeApiReferencesReachable } from '../../../../scripts/seeapi-video.mjs'
import {
  protectVideoGenerationStart,
  guestVideoPayloadError,
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

        const hasDatabase = databaseConfigured(env)
        const IMAGE_RATE_LIMITER = env.IMAGE_RATE_LIMITER
        if (!hasDatabase || !env.VIDEO_REFERENCES || typeof IMAGE_RATE_LIMITER?.limit !== 'function') {
          logVideoEvent('video_generate_unavailable', { reason: 'missing_configuration' })
          return unavailableResponse()
        }

        try {
          // Validate before provisioning a guest or assigning their lifetime allowance.
          const validation = await readVideoGenerationInput(request)
          if (!validation.ok) return validation.response
          const db = createAppDatabase(env)
          const session = await createAuth(request, env).api.getSession({ headers: request.headers })
          if (!session?.user?.id) {
            const error = guestVideoPayloadError(validation.payload)
            if (error) return error
            const verification = await verifyGuestVideoRequest(request, env, 'guest_video_generate')
            if (verification) return verification
          }
          let workflowId: string
          try {
            workflowId = selectVideoWorkflow(validation.payload, env, { guest: !session?.user?.id })
            assertVideoProviderConfigured(workflowId, env)
          } catch (error) {
            logVideoEvent('video_generate_unavailable', safeProviderLogDetails(error))
            if ((error as { code?: string }).code === 'COMPSHARE_CONFIGURATION_ERROR') {
              return jsonError(400, 'INVALID_VIDEO_REQUEST', 'Reference video input is invalid. The prompt cannot exceed 7,000 characters.')
            }
            if ((error as { code?: string }).code === 'SEEAPI_INPUT_ERROR') {
              return jsonError(400, 'INVALID_VIDEO_REQUEST', 'Guest videos support 5 seconds at 768p: up to 5 reference images, or a first frame with an optional last frame.')
            }
            return unavailableResponse()
          }
          const networkKey = await guestVideoNetworkHash(request, env.BETTER_AUTH_SECRET, 'daily-free-network')
          const taskStore = createTrackedVideoTaskStore(createVideoGenerationTaskStore(db, networkKey), createVideoTaskActivity(env.VIDEO_REFERENCES))
          if (session?.user?.id) await reconcileGuestCredits(request, session.user.id, env.BETTER_AUTH_SECRET, db)
          const guestStore = createGuestVideoTrialStore(db)
          const guest = session?.user?.id ? null : await resolveGuestVideoTrial(request, {
            secret: env.BETTER_AUTH_SECRET, store: guestStore, create: true,
          })
          const guestResourceOwner = session?.user?.id
            ? await readGuestVideoResourceOwner(request, session.user.id, { secret: env.BETTER_AUTH_SECRET, store: guestStore })
            : guest?.session.user.id
          let promptOptimization: PromptOptimizationStatus = 'off'
          let optimizedPrompt: string | undefined
          let response = await protectVideoGenerationStart({
            request,
            getSession: async () => session?.user?.id ? { user: { id: session.user.id } } : guest?.session ?? null,
            taskStore,
            resolveWorkflow: () => workflowId,
            preflight: async (protectedRequest, userId) => {
              if (validation.payload.resolution !== '768p') {
                return {
                  ok: false as const,
                  response: jsonError(
                    400,
                    'TRIAL_RESOLUTION_UNAVAILABLE',
                    'Free trial video generation supports 768p only.',
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
              if (validation.references?.length) {
                // Verification has already succeeded for this entire operation.
                // Preserve the quota check before writing a reference; reservation
                // below remains atomic and is the final authority on available credits.
                if (guest && await guestStore.getBalance(userId) < 5) {
                  return { ok: false as const, response: jsonError(403, 'GUEST_TRIAL_USED',
                    'This device or network has already claimed the guest video trial. Sign up to keep creating.') }
                }
                const uploadedIds: string[] = []
                for (const reference of validation.references) {
                  const upload = await uploadVideoReference(new Request(request.url, {
                    method: 'POST', headers: { 'content-type': reference.type }, body: reference,
                  }), { getUserId: async () => userId, bucket: env.VIDEO_REFERENCES, limiter: env.VIDEO_UPLOAD_RATE_LIMITER })
                  if (!upload.ok) return { ok: false as const, response: upload }
                  const uploaded = await upload.json() as { id: string }
                  uploadedIds.push(uploaded.id)
                }
                validation.payload.referenceImageIds = uploadedIds
              }
              if (validation.payload.referenceImageIds) {
                try {
                  const referenceOrigin = workflowId === YIR_IMAGE_WORKFLOW_ID ? env.YIR_PUBLIC_REFERENCE_ORIGIN : env.SEEAPI_PUBLIC_REFERENCE_ORIGIN
                  const localSeeApi = [SEEAPI_IMAGE_WORKFLOW_ID, YIR_IMAGE_WORKFLOW_ID].includes(workflowId)
                    && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname)
                  if (localSeeApi && !referenceOrigin?.trim()) {
                    return { ok: false as const, response: jsonError(400, 'LOCAL_REFERENCE_ORIGIN_REQUIRED',
                      'Local reference images need a public HTTPS image bridge before they can be used by the video provider.') }
                  }
                  validation.payload.referenceImageUrls = await resolveVideoReferences(
                    validation.payload.referenceImageIds, userId, env.VIDEO_REFERENCES,
                    Date.now(), guestResourceOwner ? [guestResourceOwner] : [],
                    { ...(localSeeApi ? { publicOrigin: referenceOrigin!.trim() } : {}),
                      inline: workflowId === COMPSHARE_FIRST_FRAME_WORKFLOW_ID
                      && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname) },
                  )
                  if (localSeeApi && !await areSeeApiReferencesReachable(validation.payload.referenceImageUrls)) {
                    return { ok: false as const, response: jsonError(503, 'LOCAL_REFERENCE_UNAVAILABLE',
                      'The reference image connection is unavailable. Generation was not submitted and your allowance was not charged.') }
                  }
                } catch {
                  return { ok: false as const, response: jsonError(400, 'INVALID_VIDEO_REFERENCE',
                    'A reference image expired or is unavailable. Please remove it and upload it again.') }
                }
              }
              return validation
            },
            submit: async (payload, context) => {
              // Called only after the protected flow has atomically reserved trial seconds.
              const optimized = await optimizeGuestVideoPrompt(payload, { guest: Boolean(guest), environment: env,
                onDiagnostic: details => logVideoEvent('video_prompt_optimization_fallback', details) })
              promptOptimization = optimized.status
              if (optimized.status === 'optimized') optimizedPrompt = optimized.payload.prompt
              if(session?.user?.id && isD1Database(db)) {
                try { await recordVideoCreation(db,context.localTaskId,session.user.id,payload.prompt,context.workflowId) }
                catch { logVideoEvent('creation_video_metadata_deferred') }
              }
              try {
                return await submitVideoTask(optimized.payload, { ...context, environment: env })
              } catch (error) {
                logVideoEvent('video_generate_provider_error', safeProviderLogDetails(error))
                throw error
              }
            },
          })
          // Return only this request's actual generation prompt, never rewrite instructions
          // or reference URLs. Keep it in the private JSON body, not HTTP headers/logs.
          if (response.ok && optimizedPrompt !== undefined) {
            const body = await response.json() as Record<string, unknown>
            response = Response.json({ ...body, promptOptimization: { status: 'optimized', prompt: optimizedPrompt } }, {
              status: response.status, headers: response.headers,
            })
            response.headers.set('cache-control', 'no-store')
          }
          response.headers.set('x-seedance-prompt-optimization', promptOptimization)
          return withGuestVideoCookie(response, guest)
        } catch (error) { return guestVideoTrialErrorResponse(error) }
      },
    },
  },
})
