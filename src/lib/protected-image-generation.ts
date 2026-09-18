type SessionLike = { user: { id: string } } | null

interface ProtectedImageGenerationOptions {
  request: Request
  getSession: (request: Request) => Promise<SessionLike>
  generate: (request: Request) => Promise<Response>
}

export async function protectImageGeneration({ request, getSession, generate }: ProtectedImageGenerationOptions) {
  const session = await getSession(request)
  if (!session?.user?.id) {
    return Response.json({
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'Log in to generate images.',
    }, {
      status: 401,
      headers: { 'cache-control': 'no-store' },
    })
  }
  return generate(request)
}
