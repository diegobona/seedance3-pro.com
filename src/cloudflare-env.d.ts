interface Env {
  VIDEO_REFERENCES?: WorkerBindings['VIDEO_REFERENCES']
  VIDEO_UPLOAD_RATE_LIMITER?: WorkerBindings['VIDEO_UPLOAD_RATE_LIMITER']
  ASSETS: { fetch(request: Request): Promise<Response> }
  DATABASE_URL?: string
  BETTER_AUTH_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  TUZI_API_KEY?: string
  TUZI_API_BASE?: string
  AUTODL_TOKEN?: string
  IMAGE_RATE_LIMITER?: {
    limit(input: { key: string }): Promise<{ success: boolean }>
  }
}
