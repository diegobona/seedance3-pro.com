import { submitYirVideoTask, queryYirVideoTask, YIR_TEXT_WORKFLOW_ID, YIR_IMAGE_WORKFLOW_ID } from '../../scripts/yir-video.mjs'
import { validGuestVideoInput } from '../../app/guest-video-input.mjs'
import { submitAutodlVideoTask, queryAutodlVideoTask, AUTODL_UPGRADED_REFERENCE_WORKFLOW_ID } from '../../scripts/autodl-video.mjs'
import { assertCompshareVideoPayload, submitCompshareVideoTask, queryCompshareVideoTask, COMPSHARE_FIRST_FRAME_WORKFLOW_ID } from '../../scripts/compshare-video.mjs'
import { VIDEO_WORKFLOW_ID, REFERENCE_VIDEO_WORKFLOW_ID, type VideoGenerationPayload, type VideoProviderQueryResult } from './protected-video-generation'
import { submitSeeApiVideoTask, querySeeApiVideoTask, SEEAPI_TEXT_WORKFLOW_ID, SEEAPI_IMAGE_WORKFLOW_ID } from '../../scripts/seeapi-video.mjs'

export { YIR_TEXT_WORKFLOW_ID, YIR_IMAGE_WORKFLOW_ID, COMPSHARE_FIRST_FRAME_WORKFLOW_ID, AUTODL_UPGRADED_REFERENCE_WORKFLOW_ID, SEEAPI_TEXT_WORKFLOW_ID, SEEAPI_IMAGE_WORKFLOW_ID }
export type VideoProviderEnvironment = { H3_REFERENCE_PROVIDER?: string; AUTODL_TOKEN?: string; COMPSHARE_API_KEY?: string; GUEST_VIDEO_PROVIDER?: string; SEEAPI_API_KEY?: string; YIR_API_KEY?: string }

function providerConfigurationError(retriable = false) {
  return Object.assign(new Error('Video provider is not configured.'), { code: 'VIDEO_PROVIDER_CONFIGURATION_ERROR', status: 503, retriable })
}

export function selectVideoWorkflow(payload: VideoGenerationPayload, environment: VideoProviderEnvironment, { guest = false } = {}): string {
  if (guest && ['seeapi', 'yir'].includes(environment.GUEST_VIDEO_PROVIDER?.trim() ?? '')) {
    const count = Math.max(payload.referenceImageIds?.length ?? 0, payload.referenceImageUrls?.length ?? 0)
    const validImages = environment.GUEST_VIDEO_PROVIDER?.trim() === 'yir'
      ? validGuestVideoInput(payload.inputMode, count) : payload.inputMode === undefined && count <= 1
    if (payload.duration !== 5 || payload.resolution !== '768p' || !validImages) {
      throw Object.assign(new Error('Guest videos support five seconds and one reference image.'), { code: 'SEEAPI_INPUT_ERROR' })
    }
    // Previous guest AutoDL selection is retained below for rollback:
    // return selectVideoWorkflow(payload, { ...environment, GUEST_VIDEO_PROVIDER: undefined })
    if (environment.GUEST_VIDEO_PROVIDER?.trim() === 'yir') return count ? YIR_IMAGE_WORKFLOW_ID : YIR_TEXT_WORKFLOW_ID
    return count ? SEEAPI_IMAGE_WORKFLOW_ID : SEEAPI_TEXT_WORKFLOW_ID
  }
  if (payload.inputMode !== undefined) throw providerConfigurationError()
  if (!payload.referenceImageIds && !payload.referenceImageUrls) return VIDEO_WORKFLOW_ID
  const provider = environment.H3_REFERENCE_PROVIDER?.trim() || 'autodl'
  if (provider === 'autodl-upgraded') return AUTODL_UPGRADED_REFERENCE_WORKFLOW_ID
  if (provider === 'autodl') return REFERENCE_VIDEO_WORKFLOW_ID
  if (provider !== 'compshare') throw providerConfigurationError()
  assertCompshareVideoPayload(payload, { requireReferenceUrl: false })
  return COMPSHARE_FIRST_FRAME_WORKFLOW_ID
}

export function videoProviderToken(workflowId: string, environment: VideoProviderEnvironment): string {
  if ([YIR_TEXT_WORKFLOW_ID, YIR_IMAGE_WORKFLOW_ID].includes(workflowId)) return environment.YIR_API_KEY?.trim() ?? ''
  if ([SEEAPI_TEXT_WORKFLOW_ID, SEEAPI_IMAGE_WORKFLOW_ID].includes(workflowId)) return environment.SEEAPI_API_KEY?.trim() ?? ''
  if (workflowId === COMPSHARE_FIRST_FRAME_WORKFLOW_ID) return environment.COMPSHARE_API_KEY?.trim() ?? ''
  if ([VIDEO_WORKFLOW_ID, REFERENCE_VIDEO_WORKFLOW_ID, AUTODL_UPGRADED_REFERENCE_WORKFLOW_ID].includes(workflowId)) return environment.AUTODL_TOKEN?.trim() ?? ''
  throw providerConfigurationError()
}

export function assertVideoProviderConfigured(workflowId: string, environment: VideoProviderEnvironment, forQuery = false) {
  const token = videoProviderToken(workflowId, environment)
  if (!token || /[\r\n]/.test(token)) throw providerConfigurationError(forQuery)
}

type DispatchOptions = { workflowId: string; environment: VideoProviderEnvironment; fetchImpl?: typeof fetch }
export async function submitVideoTask(payload: VideoGenerationPayload, options: DispatchOptions & { localTaskId: string }): Promise<{ providerTaskId: string }> {
  assertVideoProviderConfigured(options.workflowId, options.environment)
  if ([YIR_TEXT_WORKFLOW_ID, YIR_IMAGE_WORKFLOW_ID].includes(options.workflowId)) {
    if (Boolean(payload.referenceImageUrls?.length) !== (options.workflowId === YIR_IMAGE_WORKFLOW_ID)) throw providerConfigurationError()
    return submitYirVideoTask(payload, { apiKey: options.environment.YIR_API_KEY, localTaskId: options.localTaskId, fetchImpl: options.fetchImpl })
  }
  if ([SEEAPI_TEXT_WORKFLOW_ID, SEEAPI_IMAGE_WORKFLOW_ID].includes(options.workflowId)) {
    const image = Boolean(payload.referenceImageUrls?.length)
    if (image !== (options.workflowId === SEEAPI_IMAGE_WORKFLOW_ID)) throw providerConfigurationError()
    return submitSeeApiVideoTask(payload, { apiKey: options.environment.SEEAPI_API_KEY, localTaskId: options.localTaskId, fetchImpl: options.fetchImpl })
  }
  if (options.workflowId === COMPSHARE_FIRST_FRAME_WORKFLOW_ID) {
    return submitCompshareVideoTask(payload, { apiKey: options.environment.COMPSHARE_API_KEY, localTaskId: options.localTaskId, fetchImpl: options.fetchImpl })
  }
  // Stored workflow IDs keep historical jobs on their original transport.
  const expected = payload.referenceImageUrls
    ? [REFERENCE_VIDEO_WORKFLOW_ID, AUTODL_UPGRADED_REFERENCE_WORKFLOW_ID] : [VIDEO_WORKFLOW_ID]
  if (!expected.includes(options.workflowId)) throw providerConfigurationError()
  return submitAutodlVideoTask(payload, { token: options.environment.AUTODL_TOKEN, workflowId: options.workflowId, fetchImpl: options.fetchImpl })
}

export async function queryVideoTask(providerTaskId: string, options: DispatchOptions): Promise<VideoProviderQueryResult> {
  // Validate the stored channel even if its credentials are temporarily missing.
  assertVideoProviderConfigured(options.workflowId, options.environment, true)
  const token = videoProviderToken(options.workflowId, options.environment)
  if ([YIR_TEXT_WORKFLOW_ID, YIR_IMAGE_WORKFLOW_ID].includes(options.workflowId)) {
    return await queryYirVideoTask(providerTaskId, { apiKey: token, fetchImpl: options.fetchImpl }) as VideoProviderQueryResult
  }
  if ([SEEAPI_TEXT_WORKFLOW_ID, SEEAPI_IMAGE_WORKFLOW_ID].includes(options.workflowId)) {
    return await querySeeApiVideoTask(providerTaskId, { apiKey: token, fetchImpl: options.fetchImpl }) as VideoProviderQueryResult
  }
  if (options.workflowId === COMPSHARE_FIRST_FRAME_WORKFLOW_ID) {
    return await queryCompshareVideoTask(providerTaskId, { apiKey: token, fetchImpl: options.fetchImpl }) as VideoProviderQueryResult
  }
  try {
    return await queryAutodlVideoTask(providerTaskId, { token, fetchImpl: options.fetchImpl }) as VideoProviderQueryResult
  } catch (error) {
    const providerStatus = (error as { providerStatus?: number } | null)?.providerStatus
    if (providerStatus === 401 || providerStatus === 403) {
      throw Object.assign(providerConfigurationError(true), { providerStatus })
    }
    throw error
  }
}
