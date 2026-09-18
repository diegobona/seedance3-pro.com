import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { createDb } from '../db'
import { authSchema } from '../db/schema'

type AuthEnvironment = {
  DATABASE_URL?: string
  BETTER_AUTH_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
}

function readAuthEnvironment(): AuthEnvironment {
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  }
}

function requireSecret(value: string | undefined) {
  if (!value || value.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must be configured with at least 32 characters.')
  }
  return value
}

export function createAuth(request: Request, environment: AuthEnvironment = readAuthEnvironment()) {
  const origin = new URL(request.url).origin
  const hasGoogle = Boolean(environment.GOOGLE_CLIENT_ID && environment.GOOGLE_CLIENT_SECRET)

  return betterAuth({
    appName: 'SEEDANCE Creative Studio',
    baseURL: origin,
    secret: requireSecret(environment.BETTER_AUTH_SECRET),
    trustedOrigins: [
      origin,
      'http://localhost:4310',
      'https://seedance3-pro.com',
      'https://www.seedance3-pro.com',
    ],
    database: drizzleAdapter(createDb(environment.DATABASE_URL ?? ''), {
      provider: 'pg',
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: false,
    },
    socialProviders: hasGoogle ? {
      google: {
        clientId: environment.GOOGLE_CLIENT_ID!,
        clientSecret: environment.GOOGLE_CLIENT_SECRET!,
      },
    } : {},
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ['google'],
      },
    },
    user: {
      additionalFields: {
        role: { type: 'string', required: false, defaultValue: 'user', input: false },
        plan: { type: 'string', required: false, defaultValue: 'free', input: false },
        generationCount: { type: 'number', required: false, defaultValue: 0, input: false },
        monthlyGenerationCount: { type: 'number', required: false, defaultValue: 0, input: false },
        generationLimit: { type: 'number', required: false, defaultValue: 0, input: false },
        creditBalance: { type: 'number', required: false, defaultValue: 0, input: false },
        paymentCustomerId: { type: 'string', required: false, input: false, returned: false },
        subscriptionStatus: { type: 'string', required: false, defaultValue: 'inactive', input: false },
        subscriptionExpiresAt: { type: 'date', required: false, input: false },
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 20,
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'],
      },
    },
    plugins: [tanstackStartCookies()],
  })
}

export type Auth = ReturnType<typeof createAuth>
