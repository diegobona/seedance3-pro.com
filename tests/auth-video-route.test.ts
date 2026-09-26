import assert from 'node:assert/strict'
import test from 'node:test'
import {
  protectVideoGenerationPoll,
  protectVideoGenerationStart,
  type VideoGenerationTask,
} from '../src/lib/protected-video-generation'

const validPayload = {
  prompt: 'A paper boat crossing a moonlit lake',
  duration: 10,
  resolution: '480p',
  aspectRatio: '16:9',
}

test('reference generation records the correct workflow while keeping duration-based credits', async () => {
  const harness = startHarness({ preflight: async (_request: Request, userId: string) => {
    assert.equal(userId, 'user-1')
    return { ok: true, payload: { ...validPayload, referenceImageIds: [crypto.randomUUID()], referenceImageUrls: ['https://seedance3-pro.com/api/videos/references?id=test'] } }
  } })
  const response = await protectVideoGenerationStart(harness.options as never)
  assert.equal(response.status, 202)
  assert.deepEqual(harness.calls.reserve[0], ['user-1', 10, {
    workflowId: 'minimax_h3_image_audio_to_video_v2_15s', duration: 10, resolution: '480p', aspectRatio: '16:9',
  }])
})

function startHarness(overrides: Record<string, unknown> = {}) {
  const calls = {
    reserve: [] as unknown[][],
    attach: [] as unknown[][],
    finalize: [] as unknown[][],
    submit: 0,
  }
  const task = {
    id: 'local-task-1',
    userId: 'user-1',
    reservationId: 'reservation-1',
    providerTaskId: null,
    workflowId: 'minimax_h3_lightx2v_no_pic',
    duration: 10,
    resolution: '480p',
    aspectRatio: '16:9',
    status: 'submitting',
    resultUrl: null,
    providerError: null,
    pollAttempts: 0,
    nextPollAt: null,
    leaseUntil: null,
    lastPolledAt: null,
    createdAt: new Date('2026-09-21T00:00:00Z'),
    updatedAt: new Date('2026-09-21T00:00:00Z'),
    completedAt: null,
  }
  const store = {
    reserveAndCreate: async (...args: unknown[]) => {
      calls.reserve.push(args)
      return { task, remainingCredits: 5 }
    },
    attachProviderTask: async (...args: unknown[]) => {
      calls.attach.push(args)
      return { ...task, providerTaskId: 'provider-1', status: 'queued' }
    },
    finalizeSubmissionFailure: async (...args: unknown[]) => {
      calls.finalize.push(args)
      return { task: { ...task, status: args[1] }, remainingCredits: 15 }
    },
    getBalance: async () => 5,
  }
  return {
    calls,
    task,
    options: {
      request: new Request('https://example.test/api/videos/generate', { method: 'POST' }),
      getSession: async () => ({ user: { id: 'user-1' } }),
      preflight: async () => ({ ok: true as const, payload: validPayload }),
      taskStore: store,
      submit: async () => {
        calls.submit += 1
        return { providerTaskId: 'provider-1' }
      },
      ...overrides,
    },
  }
}

test('start authenticates before validation, credits, or provider work', async () => {
  const calls: string[] = []
  const response = await protectVideoGenerationStart({
    request: new Request('https://example.test/api/videos/generate', { method: 'POST' }),
    getSession: async () => {
      calls.push('auth')
      return null
    },
    preflight: async () => {
      calls.push('preflight')
      throw new Error('must not validate')
    },
    taskStore: {
      reserveAndCreate: async () => {
        calls.push('reserve')
        throw new Error('must not reserve')
      },
    } as never,
    submit: async () => {
      calls.push('submit')
      throw new Error('must not submit')
    },
  })

  assert.equal(response.status, 401)
  assert.deepEqual(calls, ['auth'])
})

test('start returns preflight failures without charging or submitting', async () => {
  const harness = startHarness({
    preflight: async () => ({
      ok: false as const,
      response: Response.json({ success: false, message: 'Bad input.' }, { status: 400 }),
    }),
  })

  const response = await protectVideoGenerationStart(harness.options as never)

  assert.equal(response.status, 400)
  assert.equal(harness.calls.reserve.length, 0)
  assert.equal(harness.calls.submit, 0)
})

test('start reserves one credit per second without persisting the prompt, then submits and attaches once', async () => {
  const harness = startHarness()

  const response = await protectVideoGenerationStart(harness.options as never)

  assert.equal(response.status, 202)
  assert.deepEqual(harness.calls.reserve, [[
    'user-1',
    10,
    {
      workflowId: 'minimax_h3_lightx2v_no_pic',
      duration: 10,
      resolution: '480p',
      aspectRatio: '16:9',
    },
  ]])
  assert.equal(harness.calls.submit, 1)
  assert.deepEqual(harness.calls.attach, [['local-task-1', 'provider-1']])
  assert.equal(response.headers.get('x-seedance-credit-cost'), '10')
  assert.equal(response.headers.get('x-seedance-credit-remaining'), '5')
  const body = await response.json() as Record<string, unknown>
  assert.deepEqual(body, {
    success: true,
    task: { id: 'local-task-1', status: 'queued' },
    credits: { cost: 10, remaining: 5 },
  })
  assert.equal(JSON.stringify(harness.calls.reserve).includes(validPayload.prompt), false)
  assert.equal(JSON.stringify(body).includes('provider-1'), false)
})

test('start returns insufficient credits without submitting', async () => {
  const harness = startHarness()
  harness.options.taskStore.reserveAndCreate = (async (...args: unknown[]) => {
    harness.calls.reserve.push(args)
    return null
  }) as never
  harness.options.taskStore.getBalance = async () => 4

  const response = await protectVideoGenerationStart(harness.options as never)

  assert.equal(response.status, 402)
  assert.equal(harness.calls.submit, 0)
  assert.equal(response.headers.get('x-seedance-credit-cost'), '10')
  assert.equal(response.headers.get('x-seedance-credit-remaining'), '4')
})

test('start converts database failures to a safe service response', async () => {
  const harness = startHarness()
  harness.options.taskStore.reserveAndCreate = (async () => {
    throw new Error('database password leaked')
  }) as never

  const response = await protectVideoGenerationStart(harness.options as never)

  assert.equal(response.status, 503)
  assert.equal(harness.calls.submit, 0)
  assert.equal((await response.text()).includes('database password'), false)
})

test('definite submit failure terminalizes as failed and refunds', async () => {
  const harness = startHarness({
    submit: async () => {
      harness.calls.submit += 1
      throw Object.assign(new Error('rejected'), { ambiguous: false })
    },
  })

  const response = await protectVideoGenerationStart(harness.options as never)

  assert.equal(response.status, 502)
  assert.deepEqual(harness.calls.finalize, [['local-task-1', 'failed', 'rejected']])
  assert.equal(response.headers.get('x-seedance-credit-remaining'), '15')
})

test('ambiguous submit failure is not retried and terminalizes as submission_unknown', async () => {
  const harness = startHarness({
    submit: async () => {
      harness.calls.submit += 1
      throw Object.assign(new Error('timeout'), { ambiguous: true })
    },
  })

  const response = await protectVideoGenerationStart(harness.options as never)

  assert.equal(response.status, 502)
  assert.equal(harness.calls.submit, 1)
  assert.deepEqual(harness.calls.finalize, [['local-task-1', 'submission_unknown', 'timeout']])
})

test('attachment retries once, then refunds as submission_unknown and returns a safe 503', async () => {
  const harness = startHarness()
  harness.options.taskStore.attachProviderTask = async (...args: unknown[]) => {
    harness.calls.attach.push(args)
    throw new Error('database password leaked')
  }

  const response = await protectVideoGenerationStart(harness.options as never)

  assert.equal(response.status, 503)
  assert.equal(harness.calls.submit, 1)
  assert.equal(harness.calls.attach.length, 2)
  assert.deepEqual(harness.calls.finalize, [[
    'local-task-1',
    'submission_unknown',
    'Provider submission could not be safely attached.',
  ]])
  assert.equal((await response.text()).includes('database password'), false)
})

function pollHarness(taskOverrides: Partial<VideoGenerationTask> = {}) {
  let task: VideoGenerationTask = {
    id: 'local-task-1',
    userId: 'user-1',
    reservationId: 'reservation-1',
    providerTaskId: 'provider-secret-1',
    workflowId: 'minimax_h3_lightx2v_no_pic',
    duration: 10,
    resolution: '480p',
    aspectRatio: '16:9',
    status: 'queued',
    resultUrl: null,
    providerError: null,
    pollAttempts: 0,
    nextPollAt: new Date('2026-09-21T00:00:00Z'),
    leaseUntil: null,
    lastPolledAt: null,
    createdAt: new Date('2026-09-21T00:00:00Z'),
    updatedAt: new Date('2026-09-21T00:00:00Z'),
    completedAt: null,
    ...taskOverrides,
  }
  const calls = {
    lookup: 0,
    claim: 0,
    query: 0,
    schedule: [] as unknown[][],
    running: [] as unknown[][],
    success: [] as unknown[][],
    failure: [] as unknown[][],
  }
  const store = {
    getForUser: async () => {
      calls.lookup += 1
      return task
    },
    claimForPoll: async () => {
      calls.claim += 1
      if (task.status !== 'queued' && task.status !== 'running') return null
      task = { ...task, leaseUntil: new Date('2026-09-21T00:01:30Z') }
      return task
    },
    scheduleNextPoll: async (...args: unknown[]) => {
      calls.schedule.push(args)
      task = { ...task, status: args[1] as 'queued' | 'running', leaseUntil: null, pollAttempts: task.pollAttempts + 1 }
      return task
    },
    markRunning: async (...args: unknown[]) => {
      calls.running.push(args)
      task = { ...task, status: 'running', leaseUntil: null, pollAttempts: task.pollAttempts + 1 }
      return task
    },
    finalizeSuccess: async (...args: unknown[]) => {
      calls.success.push(args)
      task = { ...task, status: 'succeeded', resultUrl: args[1] as string, completedAt: new Date() }
      return { task, remainingCredits: 5 }
    },
    finalizeFailure: async (...args: unknown[]) => {
      calls.failure.push(args)
      task = { ...task, status: 'failed', providerError: args[1] as string, completedAt: new Date() }
      return { task, remainingCredits: 15 }
    },
    getBalance: async () => task.status === 'failed' ? 15 : 5,
  }
  return {
    calls,
    store,
    setTask(value: VideoGenerationTask | null) {
      task = value as VideoGenerationTask
      store.getForUser = (async () => {
        calls.lookup += 1
        return value
      }) as never
    },
    options: {
      request: new Request('https://example.test/api/videos/status?task=local-task-1'),
      localTaskId: 'local-task-1',
      getSession: async () => ({ user: { id: 'user-1' } }),
      taskStore: store,
      query: async () => {
        calls.query += 1
        return { status: 'queued' as const, terminal: false as const }
      },
      now: new Date('2026-09-21T00:01:00Z'),
      leaseDurationMs: 30_000,
    },
  }
}

test('poll authenticates before task lookup or provider work', async () => {
  const harness = pollHarness()
  const response = await protectVideoGenerationPoll({
    ...harness.options,
    getSession: async () => null,
  } as never)

  assert.equal(response.status, 401)
  assert.equal(harness.calls.lookup, 0)
  assert.equal(harness.calls.query, 0)
})

test('poll hides tasks owned by another user', async () => {
  const harness = pollHarness()
  harness.setTask(null)

  const response = await protectVideoGenerationPoll(harness.options as never)

  assert.equal(response.status, 404)
  assert.equal(harness.calls.claim, 0)
  assert.equal(harness.calls.query, 0)
})

test('poll returns a cached terminal success without claiming or querying', async () => {
  const harness = pollHarness({
    status: 'succeeded',
    resultUrl: 'https://cdn.example.test/video.mp4',
    completedAt: new Date('2026-09-21T00:00:30Z'),
  })

  const response = await protectVideoGenerationPoll(harness.options as never)

  assert.equal(response.status, 200)
  assert.equal(harness.calls.claim, 0)
  assert.equal(harness.calls.query, 0)
  assert.deepEqual(await response.json(), {
    success: true,
    task: {
      id: 'local-task-1',
      status: 'succeeded',
      resultUrl: 'https://cdn.example.test/video.mp4',
    },
  })
})

test('queued provider state schedules another poll without changing credits', async () => {
  const harness = pollHarness()

  const response = await protectVideoGenerationPoll(harness.options as never)

  assert.equal(response.status, 202)
  assert.equal(harness.calls.query, 1)
  assert.deepEqual(harness.calls.schedule, [[
    'local-task-1',
    'queued',
    new Date('2026-09-21T00:01:00Z'),
    undefined,
    new Date('2026-09-21T00:01:30Z'),
  ]])
  assert.equal(harness.calls.success.length, 0)
  assert.equal(harness.calls.failure.length, 0)
})

test('a terminal transition won by an overlapping poll returns the cached terminal result', async () => {
  const harness = pollHarness()
  harness.store.scheduleNextPoll = (async () => ({
    ...await harness.store.getForUser(),
    status: 'succeeded',
    resultUrl: 'https://cdn.example.test/race-winner.mp4',
    completedAt: new Date('2026-09-21T00:01:01Z'),
  })) as never

  const response = await protectVideoGenerationPoll(harness.options as never)

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    success: true,
    task: {
      id: 'local-task-1',
      status: 'succeeded',
      resultUrl: 'https://cdn.example.test/race-winner.mp4',
    },
  })
})

test('running provider state records running and schedules another poll without changing credits', async () => {
  const harness = pollHarness()
  harness.options.query = (async () => {
    harness.calls.query += 1
    return { status: 'running' as const, terminal: false as const }
  }) as never

  const response = await protectVideoGenerationPoll(harness.options as never)

  assert.equal(response.status, 202)
  assert.deepEqual(harness.calls.running, [[
    'local-task-1',
    new Date('2026-09-21T00:01:00Z'),
    undefined,
    new Date('2026-09-21T00:01:30Z'),
  ]])
  assert.equal(harness.calls.success.length, 0)
  assert.equal(harness.calls.failure.length, 0)
})

test('transient query failures schedule a retry without refunding', async () => {
  const harness = pollHarness()
  harness.options.query = (async () => {
    harness.calls.query += 1
    throw Object.assign(new Error('temporary upstream failure'), {
      retriable: true,
      providerStatus: 503,
      retryAfterSeconds: 20,
    })
  }) as never

  const response = await protectVideoGenerationPoll(harness.options as never)

  assert.equal(response.status, 202)
  assert.deepEqual(harness.calls.schedule, [[
    'local-task-1',
    'queued',
    new Date('2026-09-21T00:01:00Z'),
    20,
    new Date('2026-09-21T00:01:30Z'),
  ]])
  assert.equal(harness.calls.failure.length, 0)
  assert.equal((await response.text()).includes('temporary upstream failure'), false)
})

test('poll converts scheduling database failures to a safe service response', async () => {
  const harness = pollHarness()
  harness.options.query = (async () => {
    throw Object.assign(new Error('upstream'), { retriable: true })
  }) as never
  harness.store.scheduleNextPoll = (async () => {
    throw new Error('database password leaked')
  }) as never

  const response = await protectVideoGenerationPoll(harness.options as never)

  assert.equal(response.status, 503)
  assert.equal((await response.text()).includes('database password'), false)
})

test('explicit provider failure atomically terminalizes and refunds', async () => {
  const harness = pollHarness()
  harness.options.query = (async () => {
    harness.calls.query += 1
    return { status: 'failed' as const, terminal: true as const }
  }) as never

  const response = await protectVideoGenerationPoll(harness.options as never)

  assert.equal(response.status, 502)
  assert.deepEqual(harness.calls.failure, [[
    'local-task-1',
    'Video generation failed.',
    new Date('2026-09-21T00:01:30Z'),
  ]])
  assert.equal(response.headers.get('x-seedance-credit-remaining'), '15')
})

test('usable HTTPS mp4 success atomically settles and is cached for repeated polls', async () => {
  const harness = pollHarness()
  harness.options.query = (async () => {
    harness.calls.query += 1
    return {
      status: 'succeeded' as const,
      terminal: true as const,
      videoUrl: 'https://cdn.example.test/video.mp4',
    }
  }) as never

  const first = await protectVideoGenerationPoll(harness.options as never)
  const second = await protectVideoGenerationPoll(harness.options as never)

  assert.equal(first.status, 200)
  assert.equal(second.status, 200)
  assert.equal(harness.calls.query, 1)
  assert.equal(harness.calls.success.length, 1)
  assert.deepEqual(harness.calls.success[0], [
    'local-task-1',
    'https://cdn.example.test/video.mp4',
    new Date('2026-09-21T00:01:30Z'),
  ])
  assert.equal((await first.text()).includes('provider-secret-1'), false)
})

test('expired tasks never expose a late provider result', async () => {
  const harness = pollHarness({
    status: 'expired',
    resultUrl: null,
    completedAt: new Date('2026-09-21T00:00:30Z'),
  })

  const response = await protectVideoGenerationPoll(harness.options as never)

  assert.equal(response.status, 410)
  assert.equal(harness.calls.query, 0)
  assert.equal((await response.text()).includes('resultUrl'), false)
})
