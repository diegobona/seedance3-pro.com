import { submitAutodlVideoTask, queryAutodlVideoTask } from '../../scripts/autodl-video.mjs'
import { assertCompshareVideoPayload, submitCompshareVideoTask, queryCompshareVideoTask, COMPSHARE_FIRST_FRAME_WORKFLOW_ID } from '../../scripts/compshare-video.mjs'
import { VIDEO_WORKFLOW_ID, REFERENCE_VIDEO_WORKFLOW_ID, type VideoGenerationPayload, type VideoProviderQueryResult } from './protected-video-generation'

export { COMPSHARE_FIRST_FRAME_WORKFLOW_ID }
export type VideoProviderEnvironment = { H3_REFERENCE_PROVIDER?: string; AUTODL_TOKEN?: string; COMPSHARE_API_KEY?: string }

function providerConfigurationError(retriable = false) {
  return Object.assign(new Error('Video provider is not configured.'), { code: 'VIDEO_PROVIDER_CONFIGURATION_ERROR', status: 503, retriable })
}

export function selectVideoWorkflow(payload: VideoGenerationPayload, environment: VideoProviderEnvironment): string {
  if (!payload.referenceImageIds && !payload.referenceImageUrls) return VIDEO_WORKFLOW_ID
  const provider = environment.H3_REFERENCE_PROVIDER?.trim() || 'autodl'
  if (provider === 'autodl') return REFERENCE_VIDEO_WORKFLOW_ID
  if (provider !== 'compshare') throw providerConfigurationError()
  assertCompshareVideoPayload(payload, { requireReferenceUrl: false })
  return COMPSHARE_FIRST_FRAME_WORKFLOW_ID
}

export function videoProviderToken(workflowId: string, environment: VideoProviderEnvironment): string {
  if (workflowId === COMPSHARE_FIRST_FRAME_WORKFLOW_ID) return environment.COMPSHARE_API_KEY?.trim() ?? ''
  if (workflowId === VIDEO_WORKFLOW_ID || workflowId === REFERENCE_VIDEO_WORKFLOW_ID) return environment.AUTODL_TOKEN?.trim() ?? ''
  throw providerConfigurationError()
}

export function assertVideoProviderConfigured(workflowId: string, environment: VideoProviderEnvironment, forQuery = false) {
  const token = videoProviderToken(workflowId, environment)
  if (!token || /[\r\n]/.test(token)) throw providerConfigurationError(forQuery)
}

type DispatchOptions = { workflowId: string; environment: VideoProviderEnvironment; fetchImpl?: typeof fetch }
export async function submitVideoTask(payload: VideoGenerationPayload, options: DispatchOptions & { localTaskId: string }): Promise<{ providerTaskId: string }> {
  assertVideoProviderConfigured(options.workflowId, options.environment)
  if (options.workflowId === COMPSHARE_FIRST_FRAME_WORKFLOW_ID) {
    return submitCompshareVideoTask(payload, { apiKey: options.environment.COMPSHARE_API_KEY, localTaskId: options.localTaskId, fetchImpl: options.fetchImpl })
  }
  // Both historical workflows retain their original AutoDL transport.
  const expected = payload.referenceImageUrls ? REFERENCE_VIDEO_WORKFLOW_ID : VIDEO_WORKFLOW_ID
  if (options.workflowId !== expected) throw providerConfigurationError()
  return submitAutodlVideoTask(payload, { token: options.environment.AUTODL_TOKEN, fetchImpl: options.fetchImpl })
}

export async function queryVideoTask(providerTaskId: string, options: DispatchOptions): Promise<VideoProviderQueryResult> {
  // Validate the stored channel even if its credentials are temporarily missing.
  assertVideoProviderConfigured(options.workflowId, options.environment, true)
  const token = videoProviderToken(options.workflowId, options.environment)
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
