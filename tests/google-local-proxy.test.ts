import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { resolve } from 'node:path'

type ProxyFetchFactory = (options: {
  fetchImpl: typeof fetch
  proxyURL: string
  proxyToken: string
}) => typeof fetch

let createGoogleProxyFetch: ProxyFetchFactory | undefined
let isAllowedGoogleTarget: ((value: string) => boolean) | undefined

try {
  const module = await import('../src/lib/google-proxy-fetch')
  createGoogleProxyFetch = module.createGoogleProxyFetch
} catch {
  // The first TDD run intentionally reaches this branch before implementation.
}

try {
  const module = await import('../scripts/google-dev-proxy.mjs')
  isAllowedGoogleTarget = module.isAllowedGoogleTarget
} catch {
  // The first TDD run intentionally reaches this branch before implementation.
}

test('local Google OAuth requests are routed through the loopback proxy', async () => {
  assert.equal(typeof createGoogleProxyFetch, 'function')

  const received: Request[] = []
  const fetchImpl: typeof fetch = async (input, init) => {
    received.push(new Request(input, init))
    return new Response('{}', { status: 200 })
  }
  const proxiedFetch = createGoogleProxyFetch!({
    fetchImpl,
    proxyURL: 'http://127.0.0.1:4312/google',
    proxyToken: 'derived-local-token',
  })

  await proxiedFetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'code=temporary-code',
  })

  assert.equal(received.length, 1)
  assert.equal(received[0].url, 'http://127.0.0.1:4312/google')
  assert.equal(received[0].method, 'POST')
  assert.equal(received[0].headers.get('x-seedance-target-url'), 'https://oauth2.googleapis.com/token')
  assert.equal(received[0].headers.get('x-seedance-proxy-token'), 'derived-local-token')
  assert.equal(await received[0].text(), 'code=temporary-code')
})

test('non-Google requests bypass the local OAuth proxy', async () => {
  assert.equal(typeof createGoogleProxyFetch, 'function')

  const received: Request[] = []
  const fetchImpl: typeof fetch = async (input, init) => {
    received.push(new Request(input, init))
    return new Response('ok')
  }
  const proxiedFetch = createGoogleProxyFetch!({
    fetchImpl,
    proxyURL: 'http://127.0.0.1:4312/google',
    proxyToken: 'derived-local-token',
  })

  await proxiedFetch('https://api.tu-zi.com/v1/images/generations')

  assert.equal(received.length, 1)
  assert.equal(received[0].url, 'https://api.tu-zi.com/v1/images/generations')
  assert.equal(received[0].headers.get('x-seedance-proxy-token'), null)
})

test('the Node proxy only permits the Google endpoints required by authentication', () => {
  assert.equal(typeof isAllowedGoogleTarget, 'function')
  assert.equal(isAllowedGoogleTarget!('https://oauth2.googleapis.com/token'), true)
  assert.equal(isAllowedGoogleTarget!('https://www.googleapis.com/oauth2/v3/certs'), true)
  assert.equal(isAllowedGoogleTarget!('https://www.googleapis.com/oauth2/v3/userinfo'), true)
  assert.equal(isAllowedGoogleTarget!('https://evil.example/google'), false)
  assert.equal(isAllowedGoogleTarget!('http://oauth2.googleapis.com/token'), false)
})

test('the standard dev command starts the proxy-aware launcher', () => {
  const packageJson = JSON.parse(readFileSync(resolve(import.meta.dirname, '..', 'package.json'), 'utf8'))
  assert.match(packageJson.scripts.dev, /scripts[\\/]dev\.mjs/)
})
