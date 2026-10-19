import assert from 'node:assert/strict'
import test from 'node:test'
import { databaseMaintenanceResponse } from '../src/lib/database-maintenance'

test('maintenance is inactive unless the flag is exactly 1', () => {
  for (const flag of [undefined, '', '0', 'false', 'true', ' 1 ']) {
    assert.equal(databaseMaintenanceResponse(new Request('https://example.com/api/videos/generate', { method: 'POST' }), flag), null)
  }
})

test('maintenance blocks requests with a retryable uncached JSON response', async () => {
  for (const [path, method] of [
    ['/api/videos/generate', 'POST'],
    ['/api/auth/get-session', 'GET'],
    ['/', 'GET'],
    ['/api/videos/references', 'POST'],
    ['/api/videos/references/', 'GET'],
    ['/api/videos/references/extra', 'GET'],
  ]) {
    const response = databaseMaintenanceResponse(new Request(`https://example.com${path}`, { method }), '1')
    assert.ok(response)
    assert.equal(response.status, 503)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.equal(response.headers.get('retry-after'), '60')
    assert.match(response.headers.get('content-type') ?? '', /application\/json/)
    assert.deepEqual(await response.json(), {
      success: false,
      code: 'DATABASE_MIGRATION',
      message: 'Database migration in progress. Please try again shortly.',
    })
  }
})

test('maintenance permits only GET and HEAD of the exact R2 reference route', () => {
  for (const method of ['GET', 'HEAD']) {
    assert.equal(databaseMaintenanceResponse(new Request('https://example.com/api/videos/references?key=references%2Fimage.png', { method }), '1'), null)
  }
})

test('HEAD maintenance responses have no body', async () => {
  const response = databaseMaintenanceResponse(new Request('https://example.com/api/auth/get-session', { method: 'HEAD' }), '1')
  assert.ok(response)
  assert.equal(response.status, 503)
  assert.equal(response.body, null)
  assert.equal(await response.text(), '')
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('retry-after'), '60')
})

test('maintenance never reads or consumes a request body', async () => {
  const request = new Request('https://example.com/api/videos/generate', { method: 'POST', body: 'preserve me' })
  assert.ok(databaseMaintenanceResponse(request, '1'))
  assert.equal(request.bodyUsed, false)
  assert.equal(await request.text(), 'preserve me')
})
