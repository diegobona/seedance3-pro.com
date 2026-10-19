import assert from 'node:assert/strict'
import test from 'node:test'
import { selectVideoWorkflow, assertVideoProviderConfigured, submitVideoTask, queryVideoTask, COMPSHARE_FIRST_FRAME_WORKFLOW_ID as compshare } from '../src/lib/video-providers'
import { VIDEO_WORKFLOW_ID as text, REFERENCE_VIDEO_WORKFLOW_ID as reference } from '../src/lib/protected-video-generation'

const payload = { prompt: 'A cloud moves', duration: 5, resolution: '480p', aspectRatio: '16:9' }
const image = { ...payload, referenceImageIds: [crypto.randomUUID()], referenceImageUrls: ['https://seedance3-pro.com/api/videos/references?id=one'] }
const environment = { H3_REFERENCE_PROVIDER: 'compshare', AUTODL_TOKEN: 'autodl-token', COMPSHARE_API_KEY: 'sk-ml-private' }
const localTaskId = crypto.randomUUID()

test('switch selects only new 480p reference jobs; text stays AutoDL and unknown switches fail closed', () => {
  assert.equal(selectVideoWorkflow(image, environment), compshare)
  assert.equal(selectVideoWorkflow(image, { H3_REFERENCE_PROVIDER: 'autodl' }), reference)
  assert.equal(selectVideoWorkflow(image, {}), reference)
  assert.equal(selectVideoWorkflow(payload, environment), text)
  assert.throws(() => selectVideoWorkflow(image, { H3_REFERENCE_PROVIDER: 'typo' }))
  assert.throws(() => selectVideoWorkflow({ ...image, resolution: '768p' }, environment))
  assert.throws(() => selectVideoWorkflow({ ...image, prompt: 'x'.repeat(7001) }, environment))
  assert.equal(selectVideoWorkflow({ ...payload, prompt: 'x'.repeat(10_000) }, environment), text)
})

test('credentials are required for the selected allowlisted workflow only', () => {
  assert.doesNotThrow(() => assertVideoProviderConfigured(compshare, { COMPSHARE_API_KEY: 'key' }))
  assert.doesNotThrow(() => assertVideoProviderConfigured(text, { AUTODL_TOKEN: 'token' }))
  assert.doesNotThrow(() => assertVideoProviderConfigured(reference, { AUTODL_TOKEN: 'token' }))
  for (const workflow of [compshare, text, reference, 'unknown']) assert.throws(() => assertVideoProviderConfigured(workflow, {}))
})

test('submit dispatches the chosen workflow without fallback or additional provider calls', async () => {
  let calls = 0
  const fetchImpl: typeof fetch = async (url, init) => {
    calls++
    assert.equal(url, 'https://cp.compshare.cn/minimax/v2/video_generation')
    assert.equal((init!.headers as Record<string, string>)['Idempotency-Key'], `seedance-video:${localTaskId}`)
    return Response.json({ task_id: 'c1' })
  }
  assert.deepEqual(await submitVideoTask(image, { workflowId: compshare, localTaskId, environment, fetchImpl }), { providerTaskId: 'c1' })
  assert.equal(calls, 1)
  await assert.rejects(submitVideoTask(image, { workflowId: 'unknown', localTaskId, environment, fetchImpl }))
  assert.equal(calls, 1)
  await assert.rejects(submitVideoTask(image, { workflowId: compshare, localTaskId, environment, fetchImpl: async () => { calls++; throw new Error('network'); } }), error => Boolean((error as { ambiguous?: boolean }).ambiguous))
  assert.equal(calls, 2)
})

test('persisted workflow determines queries regardless of switch; legacy records remain AutoDL', async () => {
  for (const workflowId of [text, reference, compshare]) {
    let calls = 0
    const fetchImpl: typeof fetch = async (url, init) => {
      calls++
      if (workflowId === compshare) {
        assert.equal(url, 'https://cp.compshare.cn/minimax/v2/query/video_generation/task1')
        assert.equal((init!.headers as Record<string, string>).Authorization, 'Bearer sk-ml-private')
        return Response.json({ task: { id: 'task1', status: 'queued' } })
      }
      assert.equal(url, 'https://autodl.art/api/v1/comfyui/comfyui_workflow/result/task1')
      assert.equal((init!.headers as Record<string, string>).Authorization, 'autodl-token')
      return Response.json({ code: 'Success', data: { status: 'QUEUED' } })
    }
    assert.deepEqual(await queryVideoTask('task1', { workflowId, environment: { ...environment, H3_REFERENCE_PROVIDER: 'autodl' }, fetchImpl }), { status: 'queued', terminal: false })
    assert.equal(calls, 1)
  }
})

test('query missing credentials is retriable and never falls back; unknown workflows fail closed', async () => {
  let calls = 0
  const fetchImpl: typeof fetch = async () => { calls++; throw new Error('must not fetch') }
  for (const workflowId of [text, reference, compshare]) await assert.rejects(queryVideoTask('task1', { workflowId, environment: {}, fetchImpl }), error => Boolean((error as { retriable?: boolean }).retriable))
  await assert.rejects(queryVideoTask('task1', { workflowId: 'minimax-other', environment, fetchImpl }))
  assert.equal(calls, 0)
})

test('expired AutoDL credentials are also retriable when querying accepted tasks', async () => {
  for (const workflowId of [text, reference]) for (const status of [401, 403]) {
    await assert.rejects(queryVideoTask('old-task', { workflowId, environment,
      fetchImpl: async () => Response.json({}, { status }),
    }), error => (error as { retriable?: boolean }).retriable === true)
  }
})
