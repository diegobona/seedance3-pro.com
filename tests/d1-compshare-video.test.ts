import assert from 'node:assert/strict'
import test from 'node:test'
import { createD1TestDatabase } from './helpers/d1-test-db'
import { createVideoGenerationTaskStore } from '../src/db/video-generation-tasks'
import { createGuestVideoTrialStore } from '../src/db/guest-video-trials'
import { protectVideoGenerationStart, protectVideoGenerationPoll } from '../src/lib/protected-video-generation'
import { selectVideoWorkflow, submitVideoTask, queryVideoTask, COMPSHARE_FIRST_FRAME_WORKFLOW_ID as compshare } from '../src/lib/video-providers'

test('D1 CompShare reservation keeps its UUID/workflow, settles once, and preserves guest scope after login', async () => {
  const h = await createD1TestDatabase()
  try {
    const userId = `guest-${crypto.randomUUID()}`
    await createGuestVideoTrialStore(h.db).create({ id: crypto.randomUUID(), userId, networkHash: 'd'.repeat(64) })
    const store = createVideoGenerationTaskStore(h.db)
    const environment = { H3_REFERENCE_PROVIDER: 'compshare', COMPSHARE_API_KEY: 'fake-key' }
    let postCalls = 0, queryCalls = 0, submittedLocalId = ''
    const payload = { prompt: 'Offline first-frame contract', duration: 5, resolution: '480p', aspectRatio: '9:16',
      referenceImageIds: [crypto.randomUUID()], referenceImageUrls: ['https://seedance3-pro.com/api/videos/references?id=offline'],
    }
    const getSession = async () => ({ user: { id: userId, isGuest: true } })
    const response = await protectVideoGenerationStart({
      request: new Request('https://example.test/api/videos/generate'), getSession, taskStore: store,
      preflight: async () => ({ ok: true, payload }), resolveWorkflow: p => selectVideoWorkflow(p, environment),
      submit: async (p, context) => {
        submittedLocalId = context.localTaskId
        const row = await store.getForUser(context.localTaskId, userId)
        assert.equal(row?.workflowId, compshare)
        assert.equal(row.status, 'submitting')
        return submitVideoTask(p, { ...context, environment, fetchImpl: async (_url, init) => {
          postCalls++
          assert.equal((init!.headers as Record<string, string>)['Idempotency-Key'], `seedance-video:${context.localTaskId}`)
          return Response.json({ task_id: 'comp-task' })
        } })
      },
    })
    assert.equal(response.status, 202)
    const localTaskId = (await response.json() as { task: { id: string } }).task.id
    assert.equal(localTaskId, submittedLocalId)
    assert.equal(response.headers.get('x-seedance-credit-remaining'), '5')
    const pollOptions = { request: new Request(`https://example.test/api/videos/status?task=${localTaskId}`), localTaskId, getSession, taskStore: store,
      now: new Date(Date.now() + 1000),
      query: (id: string, context: { workflowId: string }) => queryVideoTask(id, { ...context,
        environment: { ...environment, H3_REFERENCE_PROVIDER: 'autodl' }, fetchImpl: async () => {
          queryCalls++; return Response.json({ task: { id, status: 'succeeded', content: { url: 'https://example.test/result.mp4' } } })
        },
      }),
    }
    const foreign = await protectVideoGenerationPoll({ ...pollOptions, getSession: async () => ({ user: { id: 'signed-in-account' } }) })
    assert.equal(foreign.status, 404)
    assert.equal(queryCalls, 0)
    const first = await protectVideoGenerationPoll(pollOptions)
    assert.equal(first.status, 200)
    assert.equal(first.headers.get('x-seedance-credit-scope'), 'guest-video')
    assert.equal(first.headers.get('x-seedance-credit-remaining'), '5')
    const cached = await protectVideoGenerationPoll({ ...pollOptions, query: () => queryVideoTask('comp-task', { workflowId: compshare, environment: {} }) })
    assert.equal(cached.status, 200)
    assert.equal(queryCalls, 1)
    assert.equal(postCalls, 1)
    assert.equal((await h.db.prepare('SELECT count(*) AS count FROM video_generation_task').first<{ count: number }>())?.count, 1)
    assert.equal((await h.db.prepare('SELECT generation_count FROM "user" WHERE id=?').bind(userId).first<{ generation_count: number }>())?.generation_count, 1)
  } finally { await h.dispose() }
})

test('D1 explicit CompShare failed/cancelled tasks refund exactly once with no new submissions', async () => {
  const h = await createD1TestDatabase()
  try {
    const userId = crypto.randomUUID()
    await h.db.prepare('INSERT INTO "user" (id,name,email,plan,credit_balance) VALUES (?,?,?,\'paid\',15)').bind(userId, 'Offline test', `${userId}@example.test`).run()
    const store = createVideoGenerationTaskStore(h.db)
    let calls = 0
    for (const status of ['failed', 'cancelled']) {
      const reservation = (await store.reserveAndCreate(userId, 5, { workflowId: compshare, duration: 5, resolution: '480p', aspectRatio: '16:9' }))!
      await store.attachProviderTask(reservation.task.id, status)
      const options = { request: new Request('https://example.test/api/videos/status'), localTaskId: reservation.task.id,
        getSession: async () => ({ user: { id: userId } }), taskStore: store, now: new Date(Date.now() + 1000),
        query: (id: string, context: { workflowId: string }) => queryVideoTask(id, { ...context,
          environment: { COMPSHARE_API_KEY: 'fake-key' }, fetchImpl: async (_url, init) => {
            calls++; assert.equal(init?.method, 'GET'); return Response.json({ task: { id, status } })
          },
        }),
      }
      assert.equal((await protectVideoGenerationPoll(options)).status, 502)
      assert.equal((await protectVideoGenerationPoll(options)).status, 502)
      assert.equal(await store.getBalance(userId), 15)
    }
    assert.equal(calls, 2)
  } finally { await h.dispose() }
})
