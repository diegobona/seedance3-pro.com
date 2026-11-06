import assert from 'node:assert/strict'
import test from 'node:test'
import { createD1TestDatabase } from './helpers/d1-test-db'
import { createGuestVideoTrialStore } from '../src/db/guest-video-trials'
import { createVideoGenerationTaskStore } from '../src/db/video-generation-tasks'
import { protectVideoGenerationStart, protectVideoGenerationPoll, type VideoGenerationPayload } from '../src/lib/protected-video-generation'
import { selectVideoWorkflow, submitVideoTask, queryVideoTask, YIR_TEXT_WORKFLOW_ID, YIR_IMAGE_WORKFLOW_ID } from '../src/lib/video-providers'
import type { Database } from '../src/db'

test('Yir guest transport settles text and image trials, blocks a third call, and refunds failed attempts', async () => {
  const h = await createD1TestDatabase()
  try {
    const guests = createGuestVideoTrialStore(h.db)
    const tasks = createVideoGenerationTaskStore(h.db as unknown as Database)
    const environment = { GUEST_VIDEO_PROVIDER: 'yir', YIR_API_KEY: 'local-mock-key' }
    const calls: Array<{ method: string; url: string }> = []
    const accepted = new Map<string, { failed: boolean }>()
    const endpoints: string[] = []
    let failNext = false
    let submissions = 0
    const fetchImpl: typeof fetch = async (url, init) => {
      const target = String(url)
      const method = init?.method || 'GET'
      calls.push({ method, url: target })
      assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer local-mock-key')
      if (method === 'POST') {
        assert.equal(target, 'https://gateway.yir.ai/v1/videos/generations')
        const body = JSON.parse(init?.body as string)
        assert.equal(body.model, 'minimax/minimax-h3')
        assert.deepEqual(body.routing, { only: ['metaso'], fallback: false })
        assert.equal(body.parameters.duration, 5)
        assert.equal(body.parameters.resolution, '768P')
        assert.match((init?.headers as Record<string, string>)['Idempotency-Key'], /^seedance-video:[a-f0-9-]{36}$/)
        endpoints.push(body.input.type)
        if (body.input.type === 'image') {
          assert.equal(body.input.references?.[0]?.url, 'https://example.test/reference.png')
          assert.equal(body.parameters.aspect_ratio, 'adaptive', 'the reference frame determines image-mode aspect ratio')
        } else {
          assert.equal(body.input.type, 'text')
          assert.equal(body.parameters.aspect_ratio, '16:9')
          assert.equal(body.input.references?.[0]?.url, undefined)
        }
        const id = `mock-task-${++submissions}`
        accepted.set(id, { failed: failNext })
        failNext = false
        return Response.json({ id, status: 'queued' }, { status: 202 })
      }
      const id = target.slice('https://gateway.yir.ai/v1/jobs/'.length)
      assert.equal(target, `https://gateway.yir.ai/v1/jobs/${id}`)
      assert.ok(accepted.has(id), 'queries use the task ID from the original submission')
      return Response.json(accepted.get(id)?.failed
        ? { id, status: 'failed' }
        : { id, status: 'succeeded', result: { files: [{ media_type: 'video/mp4', url: `https://outputs.example.test/${id}.mp4` }] } },
      )
    }
    const payload: VideoGenerationPayload = { prompt: 'A paper boat gliding across a lake', duration: 5, resolution: '768p', aspectRatio: '16:9' }
    const image: VideoGenerationPayload = { ...payload, referenceImageIds: [crypto.randomUUID()], referenceImageUrls: ['https://example.test/reference.png'] }
    const createGuest = async (networkHash: string) => {
      const id = crypto.randomUUID(), userId = `guest-${id}`
      await guests.create({ id, userId, networkHash })
      return userId
    }
    const start = (userId: string, input = payload) => protectVideoGenerationStart({
      request: new Request('https://seedance3-pro.com/api/videos/generate', { method: 'POST' }),
      getSession: async () => ({ user: { id: userId, isGuest: true } }),
      preflight: async () => ({ ok: true, payload: input }), taskStore: tasks,
      resolveWorkflow: value => selectVideoWorkflow(value, environment, { guest: true }),
      submit: (value, context) => submitVideoTask(value, { ...context, environment, fetchImpl }),
    })
    const finish = async (userId: string, response: Response) => {
      assert.equal(response.status, 202)
      const { task } = await response.json() as { task: { id: string } }
      return { taskId: task.id, response: await protectVideoGenerationPoll({
        request: new Request(`https://seedance3-pro.com/api/videos/status?task_id=${task.id}`),
        localTaskId: task.id, getSession: async () => ({ user: { id: userId, isGuest: true } }),
        taskStore: tasks, now: new Date(Date.now() + 60_000),
        query: (providerTaskId, context) => queryVideoTask(providerTaskId, { ...context, environment, fetchImpl }),
      }) }
    }

    const guest = await createGuest('yir-two-successes')
    for (const [input, workflow] of [[payload, YIR_TEXT_WORKFLOW_ID], [image, YIR_IMAGE_WORKFLOW_ID]] as const) {
      const result = await finish(guest, await start(guest, input))
      assert.equal(result.response.status, 200)
      assert.equal((await tasks.getForUser(result.taskId, guest))?.workflowId, workflow)
    }
    assert.deepEqual(endpoints, ['text', 'image'])
    assert.equal(await guests.getBalance(guest), 0)
    assert.equal(calls.length, 4)
    assert.equal((await start(guest)).status, 402)
    assert.equal(calls.length, 4, 'exhaustion is enforced before another supplier request')

    const retryGuest = await createGuest('yir-failed-then-success')
    failNext = true
    const failure = await finish(retryGuest, await start(retryGuest))
    assert.equal(failure.response.status, 502)
    assert.equal(await guests.getBalance(retryGuest), 10, 'failed generation restores all five reserved seconds')
    for (const input of [payload, image]) {
      const success = await finish(retryGuest, await start(retryGuest, input))
      assert.equal(success.response.status, 200)
    }
    assert.equal(await guests.getBalance(retryGuest), 0)
    const before = calls.length
    assert.equal((await start(retryGuest)).status, 402)
    assert.equal(calls.length, before)
  } finally { await h.dispose() }
})
