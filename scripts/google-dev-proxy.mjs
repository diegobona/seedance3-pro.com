import { createServer } from 'node:http'

const allowedGoogleTargets = new Set([
  'https://oauth2.googleapis.com/token',
  'https://www.googleapis.com/oauth2/v3/certs',
  'https://www.googleapis.com/oauth2/v3/userinfo',
])

const ignoredRequestHeaders = new Set([
  'connection',
  'content-length',
  'host',
  'x-seedance-proxy-token',
  'x-seedance-target-url',
])

const ignoredResponseHeaders = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'transfer-encoding',
])

export function isAllowedGoogleTarget(value) {
  try {
    const url = new URL(value)
    return url.search === ''
      && url.hash === ''
      && allowedGoogleTargets.has(`${url.origin}${url.pathname}`)
  } catch {
    return false
  }
}

async function readRequestBody(request) {
  const chunks = []
  let length = 0
  for await (const chunk of request) {
    length += chunk.length
    if (length > 1024 * 1024) {
      throw new Error('Request body exceeds the local proxy limit.')
    }
    chunks.push(chunk)
  }
  return chunks.length ? Buffer.concat(chunks) : undefined
}

function copyRequestHeaders(request) {
  const headers = new Headers()
  for (const [name, value] of Object.entries(request.headers)) {
    if (ignoredRequestHeaders.has(name) || value === undefined) continue
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item)
    } else {
      headers.set(name, value)
    }
  }
  return headers
}

function sendJson(response, status, payload) {
  const body = Buffer.from(JSON.stringify(payload))
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(body.length),
    'cache-control': 'no-store',
  })
  response.end(body)
}

export function createGoogleDevProxyServer({ proxyToken, fetchImpl = fetch }) {
  if (!proxyToken) throw new Error('BETTER_AUTH_SECRET is required by the local Google proxy.')

  return createServer(async (request, response) => {
    if (request.url !== '/google') {
      sendJson(response, 404, { error: 'not_found' })
      return
    }
    if (request.headers['x-seedance-proxy-token'] !== proxyToken) {
      sendJson(response, 403, { error: 'forbidden' })
      return
    }

    const target = request.headers['x-seedance-target-url']
    if (typeof target !== 'string' || !isAllowedGoogleTarget(target)) {
      sendJson(response, 403, { error: 'target_not_allowed' })
      return
    }

    try {
      const body = request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await readRequestBody(request)
      const upstream = await fetchImpl(target, {
        method: request.method,
        headers: copyRequestHeaders(request),
        body,
        redirect: 'manual',
        signal: AbortSignal.timeout(30_000),
      })
      const responseBody = Buffer.from(await upstream.arrayBuffer())
      const responseHeaders = {}
      upstream.headers.forEach((value, name) => {
        if (!ignoredResponseHeaders.has(name)) responseHeaders[name] = value
      })
      responseHeaders['content-length'] = String(responseBody.length)
      responseHeaders['cache-control'] = 'no-store'
      response.writeHead(upstream.status, responseHeaders)
      response.end(responseBody)
    } catch (error) {
      console.error('[google-dev-proxy] Google request failed:', error instanceof Error ? error.message : error)
      sendJson(response, 502, { error: 'google_proxy_failed' })
    }
  })
}
