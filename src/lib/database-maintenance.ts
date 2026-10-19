export function databaseMaintenanceResponse(request: Request, paused?: string): Response | null {
  if (paused !== '1') return null

  if ((request.method === 'GET' || request.method === 'HEAD') && new URL(request.url).pathname === '/api/videos/references') {
    return null
  }

  return new Response(request.method === 'HEAD' ? null : JSON.stringify({
    success: false,
    code: 'DATABASE_MIGRATION',
    message: 'Database migration in progress. Please try again shortly.',
  }), {
    status: 503,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'retry-after': '60',
    },
  })
}
