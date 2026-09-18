import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

export function createDb(databaseUrl: string) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required. Create a Neon database and add its connection string to .env.local.')
  }
  return drizzle(databaseUrl, { schema })
}

export type Database = ReturnType<typeof createDb>
