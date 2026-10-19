import { withCreditHeaders } from './generation-credits'

export const VIDEO_WORKFLOW_ID = 'minimax_h3_lightx2v_no_pic'
export const REFERENCE_VIDEO_WORKFLOW_ID = 'minimax_h3_image_audio_to_video_v2_15s'

export type VideoGenerationTaskStatus =
  | 'submitting'
  | 'submission_unknown'
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'expired'

export type VideoGenerationPayload = {
  prompt: string
  duration: number
  resolution: string
  aspectRatio: string
  referenceImageIds?: string[]
  referenceImageUrls?: string[]
}

export type VideoGenerationPreflight =
  | { ok: true; payload: VideoGenerationPayload }
  | { ok: false; response: Response }

type SessionLike = { user: { id: string; isGuest?: boolean } } | null

export function guestVideoPayloadError(payload: VideoGenerationPayload) {
  if ([5, 10].includes(payload.duration) && payload.resolution === '480p') return null
  return Response.json({ success: false, code: 'GUEST_TRIAL_PARAMETERS',
    message: 'Guest videos support 5 or 10 seconds at 480p.' }, {
    status: 400, headers: { 'cache-control': 'no-store' },
  })
}

export type VideoTaskMetadata = Pick<VideoGenerationPayload, 'duration' | 'resolution' | 'aspectRatio'> & { workflowId: string }

export interface VideoGenerationTask {
  id: string
  userId: string
  reservationId: string
  providerTaskId: string | null
  workflowId: string
  duration: number
  resolution: string
  aspectRatio: string
  status: VideoGenerationTaskStatus
  resultUrl: string | null
  providerError: string | null
  pollAttempts: number
  nextPollAt: Date | null
  leaseUntil: Date | null
  lastPolledAt: Date | null
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
}

export interface VideoTaskTransitionResult {
  task: VideoGenerationTask
  remainingCredits: number
}

export interface VideoGenerationTaskStore {
  reserveAndCreate(userId: string, credits: number, metadata: VideoTaskMetadata, localTaskId?: string): Promise<VideoTaskTransitionResult | null>
  listUnfinishedTasks(afterId?: string, limit?: number): Promise<Array<Pick<VideoGenerationTask, 'id' | 'status'>>>
  getTaskStates(taskIds: string[]): Promise<Array<Pick<VideoGenerationTask, 'id' | 'status'>>>
  attachProviderTask(localTaskId: string, providerTaskId: string): Promise<VideoGenerationTask>
  finalizeSubmissionFailure(
    localTaskId: string,
    status: 'submission_unknown' | 'failed',
    message: string,
  ): Promise<VideoTaskTransitionResult>
  getForUser(localTaskId: string, userId: string): Promise<VideoGenerationTask | null>
  claimForPoll(localTaskId: string, userId: string, now: Date, leaseDurationMs: number): Promise<VideoGenerationTask | null>
  claimPending(limit: number, now?: Date, leaseDurationMs?: number): Promise<VideoGenerationTask[]>
  scheduleNextPoll(
    localTaskId: string,
    status: 'queued' | 'running',
    now: Date,
    retryAfterSeconds?: number,
    expectedLeaseUntil?: Date,
  ): Promise<VideoGenerationTask>
  markRunning(localTaskId: string, now: Date, retryAfterSeconds: number | undefined, expectedLeaseUntil: Date): Promise<VideoGenerationTask>
  finalizeSuccess(localTaskId: string, resultUrl: string, expectedLeaseUntil: Date): Promise<VideoTaskTransitionResult>
  finalizeFailure(localTaskId: string, message: string, expectedLeaseUntil: Date): Promise<VideoTaskTransitionResult>
  expireOverdue(now?: Date): Promise<VideoGenerationTask[]>
  getBalance(userId: string): Promise<number>
}

export type VideoProviderQueryResult =
  | { status: 'queued' | 'running' | 'unknown'; terminal: false; retryAfterSeconds?: number }
  | { status: 'failed'; terminal: true }
  | { status: 'succeeded'; terminal: true; videoUrl: string }

export type VideoTaskProviderContext = { workflowId: string; localTaskId: string }

interface ProtectedVideoGenerationStartOptions {
  request: Request
  getSession: (request: Request) => Promise<SessionLike>
  preflight: (request: Request, userId: string) => Promise<VideoGenerationPreflight>
  taskStore: VideoGenerationTaskStore
  resolveWorkflow?: (payload: VideoGenerationPayload) => string
  submit: (payload: VideoGenerationPayload, context: VideoTaskProviderContext) => Promise<{ providerTaskId: string }>
}

interface ProtectedVideoGenerationPollOptions {
  request: Request
  localTaskId: string
  getSession: (request: Request) => Promise<SessionLike>
  taskStore: VideoGenerationTaskStore
  query: (providerTaskId: string, context: VideoTaskProviderContext) => Promise<VideoProviderQueryResult>
  now?: Date
  leaseDurationMs?: number
}

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'Video provider request failed.'
  return message.slice(0, 500)
}

async function retryOnce<T>(operation: () => Promise<T>) {
  try {
    return await operation()
  } catch {
    return operation()
  }
}

async function protectVideoGenerationStartUnsafe({
  request,
  getSession,
  preflight,
  taskStore,
  resolveWorkflow,
  submit,
}: ProtectedVideoGenerationStartOptions) {
  const session = await getSession(request)
  if (!session?.user?.id) {
    return Response.json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Log in to generate videos.',
    }, {
      status: 401,
      headers: { 'cache-control': 'no-store' },
    })
  }

  const validation = await preflight(request, session.user.id)
  if (!validation.ok) return validation.response

  const payload = validation.payload
  if (session.user.isGuest) {
    const error = guestVideoPayloadError(payload)
    if (error) return error
  }
  const creditCost = payload.duration
  const workflowId = resolveWorkflow?.(payload)
    ?? (payload.referenceImageIds?.length ? REFERENCE_VIDEO_WORKFLOW_ID : VIDEO_WORKFLOW_ID)
  const reservation = await taskStore.reserveAndCreate(session.user.id, creditCost, {
    workflowId,
    duration: payload.duration,
    resolution: payload.resolution,
    aspectRatio: payload.aspectRatio,
  })
  if (!reservation) {
    const remainingCredits = await taskStore.getBalance(session.user.id)
    return withCreditHeaders(Response.json({
      success: false,
      code: session.user.isGuest ? 'GUEST_TRIAL_INSUFFICIENT' : 'INSUFFICIENT_CREDITS',
      message: session.user.isGuest
        ? 'Not enough free video seconds for this duration. Choose 5 seconds or sign up to keep creating.'
        : `You need ${creditCost} credits to generate this video.`,
      credits: { cost: creditCost, remaining: remainingCredits },
    }, { status: 402 }), creditCost, remainingCredits)
  }

  let providerTaskId: string
  try {
    providerTaskId = (await submit(payload, {
      workflowId: reservation.task.workflowId, localTaskId: reservation.task.id,
    })).providerTaskId
  } catch (error) {
    const ambiguous = Boolean((error as { ambiguous?: unknown } | null)?.ambiguous)
    const status = ambiguous ? 'submission_unknown' : 'failed'
    const finalized = await retryOnce(() => taskStore.finalizeSubmissionFailure(
      reservation.task.id,
      status,
      safeErrorMessage(error),
    ))
    return withCreditHeaders(Response.json({
      success: false,
      code: ambiguous ? 'VIDEO_SUBMISSION_UNKNOWN' : 'VIDEO_SUBMISSION_FAILED',
      message: ambiguous
        ? 'Video submission could not be confirmed. Your credits were refunded.'
        : 'Video submission failed. Your credits were refunded.',
    }, { status: 502 }), creditCost, finalized.remainingCredits)
  }

  let attached: VideoGenerationTask
  try {
    attached = await retryOnce(() => taskStore.attachProviderTask(reservation.task.id, providerTaskId))
  } catch {
    let remainingCredits = reservation.remainingCredits
    try {
      const finalized = await retryOnce(() => taskStore.finalizeSubmissionFailure(
        reservation.task.id,
        'submission_unknown',
        'Provider submission could not be safely attached.',
      ))
      remainingCredits = finalized.remainingCredits
    } catch {
      // The task remains recoverable as `submitting`; never leak provider details.
    }
    return withCreditHeaders(Response.json({
      success: false,
      code: 'VIDEO_SUBMISSION_UNAVAILABLE',
      message: 'Video submission could not be safely recorded. Please try again later.',
    }, { status: 503 }), creditCost, remainingCredits)
  }

  return withCreditHeaders(Response.json({
    success: true,
    task: { id: attached.id, status: attached.status },
    credits: { cost: creditCost, remaining: reservation.remainingCredits },
  }, { status: 202 }), creditCost, reservation.remainingCredits)
}

function unavailableResponse() {
  return Response.json({
    success: false,
    code: 'VIDEO_SERVICE_UNAVAILABLE',
    message: 'Video generation is temporarily unavailable. Please try again later.',
  }, { status: 503, headers: { 'cache-control': 'no-store' } })
}

export async function protectVideoGenerationStart(options: ProtectedVideoGenerationStartOptions) {
  try {
    let scope = 'account'
    const response = await protectVideoGenerationStartUnsafe({ ...options, getSession: async request => {
      const session = await options.getSession(request)
      scope = session?.user.isGuest ? 'guest-video' : 'account'
      return session
    } })
    response.headers.set('x-seedance-credit-scope', scope)
    return response
  } catch {
    return unavailableResponse()
  }
}

function isTerminal(status: VideoGenerationTaskStatus) {
  return status === 'submission_unknown' || status === 'succeeded' || status === 'failed' || status === 'expired'
}

function terminalResponse(task: VideoGenerationTask, remainingCredits: number) {
  if (task.status === 'succeeded' && task.resultUrl) {
    return withCreditHeaders(Response.json({
      success: true,
      task: { id: task.id, status: task.status, resultUrl: task.resultUrl },
    }), task.duration, remainingCredits)
  }
  const expired = task.status === 'expired'
  return withCreditHeaders(Response.json({
    success: false,
    code: expired ? 'VIDEO_TASK_EXPIRED' : 'VIDEO_GENERATION_FAILED',
    message: expired
      ? 'This video generation task expired. Your credits were refunded.'
      : 'Video generation failed. Your credits were refunded.',
    task: { id: task.id, status: task.status },
  }, { status: expired ? 410 : 502 }), task.duration, remainingCredits)
}

function pendingResponse(task: VideoGenerationTask, remainingCredits: number, retriable = false) {
  return withCreditHeaders(Response.json({
    success: true,
    retriable,
    task: { id: task.id, status: task.status },
  }, { status: 202 }), task.duration, remainingCredits)
}

function isUsableMp4Url(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && url.pathname.toLowerCase().endsWith('.mp4')
  } catch {
    return false
  }
}

async function protectVideoGenerationPollUnsafe({
  request,
  localTaskId,
  getSession,
  taskStore,
  query,
  now = new Date(),
  leaseDurationMs = 30_000,
}: ProtectedVideoGenerationPollOptions): Promise<Response> {
  const session = await getSession(request)
  if (!session?.user?.id) {
    return Response.json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Log in to check video generation.',
    }, { status: 401, headers: { 'cache-control': 'no-store' } })
  }

  const existing = await taskStore.getForUser(localTaskId, session.user.id)
  if (!existing) {
    return Response.json({
      success: false,
      code: 'VIDEO_TASK_NOT_FOUND',
      message: 'Video generation task was not found.',
    }, { status: 404, headers: { 'cache-control': 'no-store' } })
  }
  const balance = await taskStore.getBalance(session.user.id)
  if (isTerminal(existing.status)) return terminalResponse(existing, balance)

  const claimed = await taskStore.claimForPoll(localTaskId, session.user.id, now, leaseDurationMs)
  if (!claimed?.providerTaskId || !claimed.leaseUntil) return pendingResponse(existing, balance)

  let providerResult: VideoProviderQueryResult
  try {
    providerResult = await query(claimed.providerTaskId, { workflowId: claimed.workflowId, localTaskId: claimed.id })
  } catch (error) {
    if (Boolean((error as { retriable?: unknown } | null)?.retriable)) {
      const retryAfterSeconds = (error as { retryAfterSeconds?: unknown }).retryAfterSeconds
      const retryAfter = typeof retryAfterSeconds === 'number' ? retryAfterSeconds : undefined
      const scheduled = await taskStore.scheduleNextPoll(
        claimed.id,
        claimed.status as 'queued' | 'running',
        now,
        retryAfter,
        claimed.leaseUntil,
      )
      if (isTerminal(scheduled.status)) {
        return terminalResponse(scheduled, await taskStore.getBalance(session.user.id))
      }
      return pendingResponse(scheduled, balance, true)
    }
    const finalized = await taskStore.finalizeFailure(
      claimed.id,
      'Video provider returned an invalid response.',
      claimed.leaseUntil,
    )
    if (!isTerminal(finalized.task.status)) return pendingResponse(finalized.task, finalized.remainingCredits, true)
    return terminalResponse(finalized.task, finalized.remainingCredits)
  }

  if (!providerResult.terminal) {
    const scheduled = providerResult.status === 'running'
      ? await taskStore.markRunning(claimed.id, now, providerResult.retryAfterSeconds, claimed.leaseUntil)
      : await taskStore.scheduleNextPoll(
          claimed.id,
          claimed.status as 'queued' | 'running',
          now,
          providerResult.retryAfterSeconds,
          claimed.leaseUntil,
        )
    if (isTerminal(scheduled.status)) {
      return terminalResponse(scheduled, await taskStore.getBalance(session.user.id))
    }
    return pendingResponse(scheduled, balance, providerResult.status === 'unknown')
  }

  if (providerResult.status === 'failed') {
    const finalized = await taskStore.finalizeFailure(claimed.id, 'Video generation failed.', claimed.leaseUntil)
    if (!isTerminal(finalized.task.status)) return pendingResponse(finalized.task, finalized.remainingCredits, true)
    return terminalResponse(finalized.task, finalized.remainingCredits)
  }

  if (!isUsableMp4Url(providerResult.videoUrl)) {
    const finalized = await taskStore.finalizeFailure(
      claimed.id,
      'Video provider returned an unusable result.',
      claimed.leaseUntil,
    )
    if (!isTerminal(finalized.task.status)) return pendingResponse(finalized.task, finalized.remainingCredits, true)
    return terminalResponse(finalized.task, finalized.remainingCredits)
  }
  const finalized = await taskStore.finalizeSuccess(claimed.id, providerResult.videoUrl, claimed.leaseUntil)
  if (!isTerminal(finalized.task.status)) return pendingResponse(finalized.task, finalized.remainingCredits, true)
  return terminalResponse(finalized.task, finalized.remainingCredits)
}

export async function protectVideoGenerationPoll(options: ProtectedVideoGenerationPollOptions) {
  try {
    let scope = 'account'
    const response = await protectVideoGenerationPollUnsafe({ ...options, getSession: async request => {
      const session = await options.getSession(request)
      scope = session?.user.isGuest ? 'guest-video' : 'account'
      return session
    } })
    response.headers.set('x-seedance-credit-scope', scope)
    return response
  } catch {
    return unavailableResponse()
  }
}
