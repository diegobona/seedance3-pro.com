import assert from 'node:assert/strict'
import test from 'node:test'
import { createD1TestDatabase } from './helpers/d1-test-db'
import { createGuestVideoTrialStore } from '../src/db/guest-video-trials'
import { createVideoGenerationTaskStore } from '../src/db/video-generation-tasks'
import { protectVideoGenerationStart, protectVideoGenerationPoll, type VideoGenerationPayload } from '../src/lib/protected-video-generation'
import { selectVideoWorkflow, submitVideoTask, queryVideoTask, SEEAPI_TEXT_WORKFLOW_ID, SEEAPI_IMAGE_WORKFLOW_ID } from '../src/lib/video-providers'
import type { Database } from '../src/db'

test('SeeAPI guest transport settles text and image trials, blocks a third call, and refunds failed attempts', async () => {
  const h = await createD1TestDatabase()
  try {
    const guests = createGuestVideoTrialStore(h.db)
    const tasks = createVideoGenerationTaskStore(h.db as unknown as Database)
    const environment = { GUEST_VIDEO_PROVIDER: 'seeapi', SEEAPI_API_KEY: 'local-mock-key' }
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
        assert.equal(target, 'https://api.seeapi.com/v1/generations')
        const body = JSON.parse(init?.body as string)
        assert.equal(body.model, 'minimax-h3-max-turbo')
        assert.equal(body.provider, 'fal')
        assert.equal(body.input.duration_seconds, 5)
        assert.equal(body.input.resolution, '768P')
        assert.match((init?.headers as Record<string, string>)['Idempotency-Key'], /^seedance-video:[a-f0-9-]{36}$/)
        endpoints.push(body.endpoint)
        if (body.endpoint === 'image-to-video') {
          assert.equal(body.input.first_frame_image, 'https://example.test/reference.png')
          assert.equal(body.input.aspect_ratio, undefined, 'the reference frame determines image-mode aspect ratio')
        } else {
          assert.equal(body.endpoint, 'text-to-video')
          assert.equal(body.input.aspect_ratio, '16:9')
          assert.equal(body.input.first_frame_image, undefined)
        }
        const id = `mock-task-${++submissions}`
        accepted.set(id, { failed: failNext })
        failNext = false
        return Response.json({ generation: { id, status: 'processing' } }, { status: 202 })
      }
      const id = target.slice('https://api.seeapi.com/v1/generations/'.length)
      assert.equal(target, `https://api.seeapi.com/v1/generations/${id}`)
      assert.ok(accepted.has(id), 'queries use the task ID from the original submission')
      return Response.json({ generation: accepted.get(id)?.failed
        ? { id, status: 'failed' }
        : { id, status: 'succeeded', result: { assets: [{ type: 'video', url: `https://outputs.example.test/${id}.mp4` }] } },
      })
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

    const guest = await createGuest('seeapi-two-successes')
    for (const [input, workflow] of [[payload, SEEAPI_TEXT_WORKFLOW_ID], [image, SEEAPI_IMAGE_WORKFLOW_ID]] as const) {
      const result = await finish(guest, await start(guest, input))
      assert.equal(result.response.status, 200)
      assert.equal((await tasks.getForUser(result.taskId, guest))?.workflowId, workflow)
    }
    assert.deepEqual(endpoints, ['text-to-video', 'image-to-video'])
    assert.equal(await guests.getBalance(guest), 0)
    assert.equal(calls.length, 4)
    assert.equal((await start(guest)).status, 402)
    assert.equal(calls.length, 4, 'exhaustion is enforced before another supplier request')

    const retryGuest = await createGuest('seeapi-failed-then-success')
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
