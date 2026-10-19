import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TABLES } from './migrate-neon-to-d1.mjs'

const GUARD = '_seedance3_d1_cutover_readonly'
const identifier = (value) => `"${value.replaceAll('"', '""')}"`
const qualified = (name) => `public.${identifier(name)}`
const tableNames = TABLES.map((table) => `'${table.name.replaceAll("'", "''")}'`).join(', ')

/** @param {'install' | 'remove'} action */
export function buildNeonCutoverGuardStatements(action) {
  if (action !== 'install' && action !== 'remove') throw new TypeError('Invalid cutover guard action')
  const statements = [
    "SET LOCAL lock_timeout = '10s'",
    "SET LOCAL statement_timeout = '30s'",
    // The lock waits for existing writers before publishing the guard atomically.
    `LOCK TABLE ${TABLES.map((table) => qualified(table.name)).join(', ')} IN SHARE ROW EXCLUSIVE MODE`,
  ]
  if (action === 'install') {
    statements.push(`CREATE OR REPLACE FUNCTION ${qualified(GUARD)}() RETURNS trigger
LANGUAGE plpgsql AS $cutover_guard$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '25006', MESSAGE = 'Database migration in progress; source writes are disabled.';
  RETURN NULL;
END;
$cutover_guard$`)
  }
  for (const table of TABLES) {
    statements.push(`DROP TRIGGER IF EXISTS ${identifier(GUARD)} ON ${qualified(table.name)}`)
    if (action === 'install') statements.push(`CREATE TRIGGER ${identifier(GUARD)} BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON ${qualified(table.name)} FOR EACH STATEMENT EXECUTE FUNCTION ${qualified(GUARD)}()`)
  }
  if (action === 'remove') statements.push(`DROP FUNCTION IF EXISTS ${qualified(GUARD)}()`)
  return statements
}

// Only metadata is returned. No user data, SQL arguments or connection details are logged.
const verificationSql = `SELECT count(*)::int AS guard_count FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_namespace pn ON pn.oid = p.pronamespace
WHERE n.nspname = 'public' AND c.relname IN (${tableNames})
AND t.tgname = '${GUARD}' AND NOT t.tgisinternal AND t.tgenabled = 'O' AND t.tgtype = 62
AND pn.nspname = 'public' AND p.proname = '${GUARD}' AND p.pronargs = 0`

async function main(argv) {
  if (argv.length !== 1 || !['--install', '--remove'].includes(argv[0]) || !process.env.DATABASE_URL) throw new Error('Invalid guard command configuration')
  const action = argv[0] === '--install' ? 'install' : 'remove'
  const { neon } = await import('@neondatabase/serverless')
  const sql = neon(process.env.DATABASE_URL)
  const statements = [...buildNeonCutoverGuardStatements(action), verificationSql]
  const results = await sql.transaction(statements.map((statement) => sql.query(statement)), {
    fetchOptions: { signal: AbortSignal.timeout(60_000) },
  })
  const expected = action === 'install' ? TABLES.length : 0
  if (results?.at(-1)?.[0]?.guard_count !== expected) throw new Error('Guard metadata verification failed')
  console.log(JSON.stringify(action === 'install' ? { installed: true, guardedTables: expected } : { removed: true }))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(() => {
    console.error('Neon cutover guard command failed; private input and provider details omitted.')
    process.exitCode = 1
  })
}
