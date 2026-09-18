const googleServerEndpoints = new Set([
  'https://oauth2.googleapis.com/token',
  'https://www.googleapis.com/oauth2/v3/certs',
  'https://www.googleapis.com/oauth2/v3/userinfo',
])

type GoogleProxyFetchOptions = {
  fetchImpl: typeof fetch
  proxyURL: string
  proxyToken: string
}

type GoogleProxyState = {
  originalFetch: typeof fetch
  proxyURL: string
  proxyToken: string
}

const stateKey = '__seedanceGoogleProxyFetchState__'

function isGoogleServerEndpoint(value: string) {
  try {
    const url = new URL(value)
    return googleServerEndpoints.has(`${url.origin}${url.pathname}`)
  } catch {
    return false
  }
}

export function createGoogleProxyFetch({ fetchImpl, proxyURL, proxyToken }: GoogleProxyFetchOptions): typeof fetch {
  return async (input, init) => {
    const request = new Request(input, init)
    if (!isGoogleServerEndpoint(request.url)) {
      return fetchImpl(input, init)
    }

    const headers = new Headers(request.headers)
    headers.set('x-seedance-target-url', request.url)
    headers.set('x-seedance-proxy-token', proxyToken)

    const body = request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.arrayBuffer()

    return fetchImpl(proxyURL, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
    })
  }
}

export function installLocalGoogleProxyFetch(proxyToken: string, proxyURL = 'http://127.0.0.1:4312/google') {
  const runtime = globalThis as typeof globalThis & Record<string, unknown>
  const existing = runtime[stateKey] as GoogleProxyState | undefined
  const state: GoogleProxyState = existing ?? {
    originalFetch: globalThis.fetch.bind(globalThis),
    proxyURL,
    proxyToken,
  }

  state.proxyURL = proxyURL
  state.proxyToken = proxyToken
  runtime[stateKey] = state
  globalThis.fetch = createGoogleProxyFetch({
    fetchImpl: state.originalFetch,
    proxyURL: state.proxyURL,
    proxyToken: state.proxyToken,
  })
}
