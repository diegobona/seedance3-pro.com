import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

export function createDb(databaseUrl: string) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required. Create a Neon database and add its connection string to .env.local.')
  }
  return drizzle(databaseUrl, { schema })
}

export type Database = ReturnType<typeof createDb>

export type AppDatabase = Database | D1Database
export type DatabaseEnvironment = { DATABASE_URL?: string; DATABASE_BACKEND?: string; DB?: D1Database }

export function databaseConfigured(environment: DatabaseEnvironment) {
  const backend = environment.DATABASE_BACKEND ?? 'neon'
  return backend === 'd1' ? Boolean(environment.DB) : backend === 'neon' && Boolean(environment.DATABASE_URL?.trim())
}

export function isD1Database(database: AppDatabase): database is D1Database {
  return typeof (database as D1Database).prepare === 'function' && typeof (database as D1Database).batch === 'function'
}

export function createAppDatabase(environment: DatabaseEnvironment): AppDatabase {
  const backend = environment.DATABASE_BACKEND ?? 'neon'
  if (backend === 'd1') {
    if (!environment.DB) throw new Error('D1 database binding DB is required.')
    return environment.DB
  }
  if (backend !== 'neon') throw new Error('Unknown database backend.')
  return createDb(environment.DATABASE_URL ?? '')
}
