import { createFileRoute } from '@tanstack/react-router'
import '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { createDb } from '../../db'
import { createLaunchWaitlistStore } from '../../db/launch-waitlist'
import { createAuth } from '../../lib/auth'
import {
  getLaunchWaitlistStatusResponse,
  joinLaunchWaitlistResponse,
} from '../../lib/launch-waitlist-response'

function isSameOriginRequest(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

function jsonError(status: number, code: string, message: string) {
  return Response.json({ success: false, code, message }, {
    status,
    headers: { 'cache-control': 'no-store' },
  })
}

async function respond(request: Request, action: 'status' | 'join') {
  const databaseUrl = env.DATABASE_URL?.trim() ?? ''
  if (!databaseUrl) {
    return jsonError(503, 'WAITLIST_UNAVAILABLE', 'Launch notifications are temporarily unavailable.')
  }

  try {
    const options = {
      request,
      getSession: async (sessionRequest: Request) => {
        const session = await createAuth(sessionRequest, env).api.getSession({ headers: sessionRequest.headers })
        return session?.user?.id ? { user: { id: session.user.id } } : null
      },
      store: createLaunchWaitlistStore(createDb(databaseUrl)),
    }
    return action === 'join'
      ? await joinLaunchWaitlistResponse(options)
      : await getLaunchWaitlistStatusResponse(options)
  } catch (error) {
    console.error(JSON.stringify({
      event: 'launch_waitlist_error',
      action,
      error: error instanceof Error ? error.name : 'UnknownError',
    }))
    return jsonError(503, 'WAITLIST_UNAVAILABLE', 'Launch notifications are temporarily unavailable.')
  }
}

export const Route = createFileRoute('/api/launch-waitlist')({
  server: {
    handlers: {
      GET: async ({ request }) => respond(request, 'status'),
      POST: async ({ request }) => {
        if (!isSameOriginRequest(request)) {
          return jsonError(403, 'CROSS_SITE_REQUEST', 'Cross-site waitlist enrollment is not allowed.')
        }
        return respond(request, 'join')
      },
    },
  },
})
