import assert from 'node:assert/strict'
import test from 'node:test'
import {
  LAUNCH_BONUS_CREDITS,
  getLaunchWaitlistStatusResponse,
  joinLaunchWaitlistResponse,
} from '../src/lib/launch-waitlist-response'

const statusRequest = new Request('https://seedance3-pro.com/api/launch-waitlist')
const joinRequest = new Request('https://seedance3-pro.com/api/launch-waitlist', { method: 'POST' })

test('launch waitlist requires an authenticated account before reading or joining', async () => {
  let storeCalls = 0
  const store = {
    getStatus: async () => {
      storeCalls += 1
      return { joined: false, bonusCredits: LAUNCH_BONUS_CREDITS }
    },
    join: async () => {
      storeCalls += 1
      return { joined: true, bonusCredits: LAUNCH_BONUS_CREDITS }
    },
  }

  const statusResponse = await getLaunchWaitlistStatusResponse({
    request: statusRequest,
    getSession: async () => null,
    store,
  })
  const joinResponse = await joinLaunchWaitlistResponse({
    request: joinRequest,
    getSession: async () => null,
    store,
  })

  assert.equal(statusResponse.status, 401)
  assert.equal(joinResponse.status, 401)
  assert.equal(storeCalls, 0)
})

test('launch waitlist status exposes the fixed launch bonus without mutating enrollment', async () => {
  let receivedUserId = ''
  const response = await getLaunchWaitlistStatusResponse({
    request: statusRequest,
    getSession: async () => ({ user: { id: 'user-1' } }),
    store: {
      getStatus: async (userId) => {
        receivedUserId = userId
        return { joined: false, bonusCredits: LAUNCH_BONUS_CREDITS }
      },
      join: async () => assert.fail('GET must not join the waitlist'),
    },
  })

  assert.equal(receivedUserId, 'user-1')
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), {
    success: true,
    waitlist: { joined: false, bonusCredits: 5 },
  })
})

test('joining the launch waitlist is idempotent for an authenticated user', async () => {
  const enrolled = new Set<string>()
  let joinCalls = 0
  const options = {
    request: joinRequest,
    getSession: async () => ({ user: { id: 'user-1' } }),
    store: {
      getStatus: async (userId: string) => ({
        joined: enrolled.has(userId),
        bonusCredits: LAUNCH_BONUS_CREDITS,
      }),
      join: async (userId: string) => {
        joinCalls += 1
        enrolled.add(userId)
        return { joined: true, bonusCredits: LAUNCH_BONUS_CREDITS }
      },
    },
  }

  const first = await joinLaunchWaitlistResponse(options)
  const second = await joinLaunchWaitlistResponse(options)

  assert.equal(joinCalls, 2)
  assert.deepEqual(await first.json(), {
    success: true,
    waitlist: { joined: true, bonusCredits: 5 },
  })
  assert.deepEqual(await second.json(), {
    success: true,
    waitlist: { joined: true, bonusCredits: 5 },
  })
})
