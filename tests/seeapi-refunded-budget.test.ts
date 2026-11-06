import assert from 'node:assert/strict'
import test from 'node:test'
import { createD1TestDatabase } from './helpers/d1-test-db'
import { createGuestVideoTrialStore } from '../src/db/guest-video-trials'
import { createVideoGenerationTaskStore } from '../src/db/video-generation-tasks'
import { protectVideoGenerationStart, protectVideoGenerationPoll, type VideoGenerationPayload } from '../src/lib/protected-video-generation'
import { selectVideoWorkflow, submitVideoTask, queryVideoTask } from '../src/lib/video-providers'
import type { Database } from '../src/db'

type Outcome = { status: 'failed'; consumed_credits?: number } | { status: 'succeeded'; consumed_credits: number }
const text: VideoGenerationPayload = { prompt: 'A paper fox walks across a lake', duration: 5, resolution: '768p', aspectRatio: '16:9' }
const image: VideoGenerationPayload = { ...text, referenceImageIds: [crypto.randomUUID()], referenceImageUrls: ['https://example.test/frame.png'] }

async function fixture(outcomes: Outcome[]) {
  const h = await createD1TestDatabase()
  const guests = createGuestVideoTrialStore(h.db)
  const network = 'e'.repeat(64)
  const tasks = createVideoGenerationTaskStore(h.db as unknown as Database, network)
  const id = crypto.randomUUID(), userId = `guest-${id}`
  await guests.create({ id, userId, networkHash: network, budgetKey: network })
  const environment = { GUEST_VIDEO_PROVIDER: 'seeapi', SEEAPI_API_KEY: 'local-mock-key' }
  const accepted = new Map<string, Outcome>()
  let requests = 0, submissions = 0
  const fetchImpl: typeof fetch = async (url, init) => {
    requests++
    if (init?.method === 'POST') {
      assert.equal(url, 'https://api.seeapi.com/v1/generations')
      const body = JSON.parse(init.body as string)
      assert.equal(body.model, 'minimax-h3-max-turbo')
      assert.equal(body.input.duration_seconds, 5)
      const outcome = outcomes[submissions]
      assert.ok(outcome, 'unexpected supplier generation')
      const taskId = `task_mock_${++submissions}`
      accepted.set(taskId, outcome)
      return Response.json({ generation: { id: taskId, status: 'processing' } }, { status: 202 })
    }
    const taskId = String(url).split('/').pop()!
    const outcome = accepted.get(taskId)
    assert.ok(outcome)
    return Response.json({ generation: { id: taskId, ...outcome,
      ...(outcome.status === 'succeeded' ? { result: { assets: [{ type: 'video', url: `https://outputs.example.test/${taskId}.mp4` }] } } : {}),
    } })
  }
  const start = (payload = text) => protectVideoGenerationStart({
    request: new Request('https://seedance3-pro.com/api/videos/generate', { method: 'POST' }),
    getSession: async () => ({ user: { id: userId, isGuest: true } }),
    preflight: async () => ({ ok: true, payload }), taskStore: tasks,
    resolveWorkflow: value => selectVideoWorkflow(value, environment, { guest: true }),
    submit: (value, context) => submitVideoTask(value, { ...context, environment, fetchImpl }),
  })
  const finish = async (response: Response) => {
    assert.equal(response.status, 202)
    const { task } = await response.json() as { task: { id: string } }
    return protectVideoGenerationPoll({
      request: new Request(`https://seedance3-pro.com/api/videos/status?task_id=${task.id}`),
      localTaskId: task.id, getSession: async () => ({ user: { id: userId, isGuest: true } }),
      taskStore: tasks, now: new Date(Date.now() + 60_000),
      query: (providerTaskId, context) => queryVideoTask(providerTaskId, { ...context, environment, fetchImpl }),
    })
  }
  return { ...h, guests, tasks, userId, start, finish, requests: () => requests, submissions: () => submissions }
}

test('two provider-confirmed zero-charge failures do not consume the budget for two successful guest videos', async () => {
  const h = await fixture([
    { status: 'failed', consumed_credits: 0 }, { status: 'failed', consumed_credits: 0 },
    { status: 'succeeded', consumed_credits: 90 }, { status: 'succeeded', consumed_credits: 90 },
  ])
  try {
    for (let i = 0; i < 2; i++) {
      assert.equal((await h.finish(await h.start(image))).status, 502)
      assert.equal(await h.guests.getBalance(h.userId), 10)
    }
    assert.equal((await h.finish(await h.start(text))).status, 200)
    assert.equal(await h.guests.getBalance(h.userId), 5)
    assert.equal((await h.finish(await h.start(image))).status, 200)
    assert.equal(await h.guests.getBalance(h.userId), 0)
    const ledger = await h.db.prepare(`SELECT sum(free_cost_micros) AS cost,
      sum(CASE WHEN status IN ('reserved','settled') THEN network_free_credits ELSE 0 END) AS network_used,
      sum(CASE WHEN status='refunded' AND free_cost_micros=0 THEN 1 ELSE 0 END) AS zero_charge_failures
      FROM generation_credit_reservation WHERE user_id=?`).bind(h.userId).first<{ cost: number; network_used: number; zero_charge_failures: number }>()
    assert.deepEqual(ledger, { cost: 600_000, network_used: 10, zero_charge_failures: 2 })
    const previousRequests = h.requests()
    assert.equal((await h.start()).status, 402)
    assert.equal(h.requests(), previousRequests, 'an exhausted trial never contacts SeeAPI again')
    assert.equal(h.submissions(), 4)
  } finally { await h.dispose() }
})

for (const consumed of [undefined, 18]) test(`failed supplier tasks with ${consumed === undefined ? 'unknown' : 'positive'} charges retain the safety budget`, async () => {
  const failed: Outcome = { status: 'failed', ...(consumed === undefined ? {} : { consumed_credits: consumed }) }
  const h = await fixture([failed, failed, { status: 'succeeded', consumed_credits: 90 }])
  try {
    for (let i = 0; i < 2; i++) assert.equal((await h.finish(await h.start(image))).status, 502)
    assert.equal((await h.finish(await h.start(text))).status, 200)
    assert.equal(await h.guests.getBalance(h.userId), 5)
    const before = h.requests()
    const rejected = await h.start()
    assert.equal(rejected.status, 402)
    assert.equal((await rejected.json() as { code: string }).code, 'FREE_BUDGET_EXCEEDED')
    assert.equal(h.requests(), before, 'the safety cap is enforced before a new supplier request')
    const ledger = await h.db.prepare('SELECT sum(free_cost_micros) AS cost FROM generation_credit_reservation WHERE user_id=?').bind(h.userId).first<{ cost: number }>()
    assert.equal(ledger?.cost, 900_000)
  } finally { await h.dispose() }
})
