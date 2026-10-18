import { readFile, readdir } from 'node:fs/promises'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'

export async function createD1TestDatabase(options: { migrations?: boolean } = {}) {
  const runtime = new Miniflare(convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("D1 test runtime") } }',
    compatibilityDate: '2026-09-18',
    d1Databases: { DB: `test-${crypto.randomUUID()}` },
  }))
  try {
    const db = await runtime.getD1Database('DB') as unknown as D1Database
    if (options.migrations !== false) {
      // Resolve relative to the repository, not the tests/helpers directory.
      const root = new URL('../../', import.meta.url)
      const migrations = new URL('migrations/d1/', root)
      for (const name of (await readdir(migrations)).filter(name => name.endsWith('.sql')).sort()) {
        const source = await readFile(new URL(name, migrations), 'utf8')
        for (const statement of source.split(/^\s*--> statement-breakpoint\s*$/m)) {
          if (statement.trim()) await db.prepare(statement).run()
        }
      }
    }
    return { db, dispose: () => runtime.dispose() }
  } catch (error) {
    await runtime.dispose()
    throw error
  }
}
