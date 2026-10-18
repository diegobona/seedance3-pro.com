import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const defineTable = (name, columns, { timestamps = [], integers = [], booleans = [], dates = [], primaryKey = 'id' } = {}) => ({
  name, columns: columns.split(' '), timestamps: timestamps.split?.(' ').filter(Boolean) ?? timestamps,
  integers: integers.split?.(' ').filter(Boolean) ?? integers,
  booleans: booleans.split?.(' ').filter(Boolean) ?? booleans,
  dates: dates.split?.(' ').filter(Boolean) ?? dates, primaryKey,
})

// Parent rows precede their dependants. Names intentionally match both database schemas.
export const TABLES = [
  defineTable('user', 'id name email email_verified image created_at updated_at role plan generation_count monthly_generation_count generation_limit credit_balance daily_free_credits daily_credit_date trial_credits_granted_at payment_customer_id subscription_status subscription_expires_at', {
    timestamps: 'created_at updated_at trial_credits_granted_at subscription_expires_at',
    integers: 'generation_count monthly_generation_count generation_limit credit_balance daily_free_credits',
    booleans: 'email_verified', dates: 'daily_credit_date',
  }),
  defineTable('account', 'id account_id provider_id user_id access_token refresh_token id_token access_token_expires_at refresh_token_expires_at scope password created_at updated_at', { timestamps: 'access_token_expires_at refresh_token_expires_at created_at updated_at' }),
  defineTable('session', 'id expires_at token created_at updated_at ip_address user_agent user_id', { timestamps: 'expires_at created_at updated_at' }),
  defineTable('verification', 'id identifier value expires_at created_at updated_at', { timestamps: 'expires_at created_at updated_at' }),
  defineTable('generation_credit_reservation', 'id user_id credits daily_free_credits daily_credit_date status created_at updated_at', { timestamps: 'created_at updated_at', integers: 'credits daily_free_credits', dates: 'daily_credit_date' }),
  defineTable('video_generation_task', 'id provider_task_id user_id reservation_id workflow_id duration resolution aspect_ratio status result_url provider_error poll_attempts next_poll_at lease_until last_polled_at created_at updated_at completed_at', {
    timestamps: 'next_poll_at lease_until last_polled_at created_at updated_at completed_at', integers: 'duration poll_attempts',
  }),
  defineTable('launch_waitlist', 'user_id bonus_credits joined_at notified_at bonus_granted_at', { timestamps: 'joined_at notified_at bonus_granted_at', integers: 'bonus_credits', primaryKey: 'user_id' }),
  defineTable('referral_visit', 'visit_id visitor_id source entry_path created_at', { timestamps: 'created_at', primaryKey: 'visit_id' }),
]

const FORMAT = 'seedance3-neon-d1-v1'
class MigrationError extends Error {}
const identifier = (value) => `"${value.replaceAll('"', '""')}"`
const sameNames = (actual, expected) => actual.length === expected.length && actual.every((name) => expected.includes(name))

function normalizeValue(table, column, value) {
  if (value === null) return null
  if (value === undefined) throw new MigrationError(`Missing column ${table.name}.${column}`)
  if (table.timestamps.includes(column)) {
    if (typeof value !== 'number' && typeof value !== 'string' && !(value instanceof Date)) throw new MigrationError(`Invalid timestamp ${table.name}.${column}`)
    const millis = typeof value === 'number' || (typeof value === 'string' && /^-?\d+$/.test(value))
      ? Number(value) : new Date(value).getTime()
    if (!Number.isSafeInteger(millis) || !Number.isFinite(new Date(millis).getTime())) throw new MigrationError(`Invalid timestamp ${table.name}.${column}`)
    return millis
  }
  if (table.booleans.includes(column)) {
    if (value === true || value === 1) return 1
    if (value === false || value === 0) return 0
    throw new MigrationError(`Invalid boolean ${table.name}.${column}`)
  }
  if (table.integers.includes(column)) {
    if (!Number.isSafeInteger(value)) throw new MigrationError(`Invalid integer ${table.name}.${column}`)
    return value
  }
  if (table.dates.includes(column)) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) !== value) throw new MigrationError(`Invalid date ${table.name}.${column}`)
    return value
  }
  if (typeof value !== 'string' || value.includes('\u0000') || value.isWellFormed?.() === false) throw new MigrationError(`Invalid text ${table.name}.${column}`)
  return value
}

function normalizeRows(table, rows) {
  if (!Array.isArray(rows)) throw new MigrationError(`Missing table ${table.name}`)
  const ids = new Set()
  return rows.map((row) => {
    if (!row || !sameNames(Object.keys(row), table.columns)) throw new MigrationError(`Column mismatch for table ${table.name}`)
    const normalized = Object.fromEntries(table.columns.map((column) => [column, normalizeValue(table, column, row[column])]))
    const key = normalized[table.primaryKey]
    if (typeof key !== 'string' || ids.has(key)) throw new MigrationError(`Invalid or duplicate primary key in table ${table.name}`)
    ids.add(key)
    return normalized
  }).sort((a, b) => a[table.primaryKey] < b[table.primaryKey] ? -1 : a[table.primaryKey] > b[table.primaryKey] ? 1 : 0)
}

function checksum(table, rows) {
  return createHash('sha256').update(JSON.stringify(rows.map((row) => table.columns.map((column) => row[column])))).digest('hex')
}

function assertReferences(tables) {
  const users = new Set(tables.user.rows.map((row) => row.id))
  const reservations = new Map(tables.generation_credit_reservation.rows.map((row) => [row.id, row]))
  for (const table of TABLES.filter((table) => table.columns.includes('user_id'))) {
    for (const row of tables[table.name].rows) {
      if (!users.has(row.user_id)) throw new MigrationError(`Broken user reference in table ${table.name}`)
      if (table.name === 'video_generation_task' && reservations.get(row.reservation_id)?.user_id !== row.user_id) throw new MigrationError('Broken reservation reference in table video_generation_task')
    }
  }
}

export function createBackup(rawTables, { exportedAt = new Date().toISOString() } = {}) {
  if (!rawTables || !sameNames(Object.keys(rawTables), TABLES.map((table) => table.name))) {
    const missing = TABLES.find((table) => !rawTables?.[table.name])
    throw new MigrationError(missing ? `Missing table ${missing.name}` : 'Application table mismatch')
  }
  const tables = Object.fromEntries(TABLES.map((table) => {
    const rows = normalizeRows(table, rawTables[table.name])
    return [table.name, { columns: [...table.columns], rowCount: rows.length, sha256: checksum(table, rows), rows }]
  }))
  assertReferences(tables)
  return { format: FORMAT, exportedAt, snapshot: 'PostgreSQL REPEATABLE READ, READ ONLY', timestampUnit: 'milliseconds', tables }
}

function validateBackup(backup) {
  if (backup?.format !== FORMAT || backup.timestampUnit !== 'milliseconds') throw new MigrationError('Unsupported backup format')
  if (!backup.tables || !sameNames(Object.keys(backup.tables), TABLES.map((table) => table.name))) throw new MigrationError('Backup table manifest mismatch')
  const raw = Object.fromEntries(TABLES.map((table) => [table.name, backup.tables[table.name]?.rows]))
  const verified = createBackup(raw, { exportedAt: backup.exportedAt })
  for (const table of TABLES) {
    const expected = backup.tables[table.name]
    if (!Array.isArray(expected.columns) || !sameNames(expected.columns, table.columns)) throw new MigrationError(`Backup columns mismatch: ${table.name}`)
    if (expected.rowCount !== verified.tables[table.name].rowCount || expected.sha256 !== verified.tables[table.name].sha256) throw new MigrationError(`Backup checksum mismatch: ${table.name}`)
  }
  return verified
}

function literal(value) {
  if (value === null) return 'NULL'
  if (typeof value === 'number') return String(value)
  // Hex text safely retains line breaks and control characters in a single SQL statement.
  if (/[\u0000-\u001f\u007f]/.test(value)) return `CAST(X'${Buffer.from(value, 'utf8').toString('hex')}' AS TEXT)`
  return `'${value.replaceAll("'", "''")}'`
}

export function convertBackupToSql(input) {
  const backup = validateBackup(input)
  const emptyChecks = TABLES.map((table) => `NOT EXISTS (SELECT 1 FROM ${identifier(table.name)} LIMIT 1)`)
  const tableNames = TABLES.map((table) => literal(table.name)).join(', ')
  const statements = [
    '-- Sensitive migration data: do not commit, log or publish this file.',
    '-- Apply baseline schema only. Accounting triggers MUST be installed after import and verification.',
    'PRAGMA defer_foreign_keys = ON;',
    'CREATE TABLE "__neon_d1_import_guard" ("ok" INTEGER NOT NULL CHECK ("ok" = 1));',
    `INSERT INTO "__neon_d1_import_guard" ("ok") SELECT CASE WHEN ${emptyChecks.join(' AND ')} AND NOT EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'trigger' AND tbl_name IN (${tableNames})) THEN 1 ELSE 0 END;`,
    'DROP TABLE "__neon_d1_import_guard";',
  ]
  for (const table of TABLES) {
    const columns = table.columns.map(identifier).join(', ')
    for (const row of backup.tables[table.name].rows) {
      const statement = `INSERT INTO ${identifier(table.name)} (${columns}) VALUES (${table.columns.map((column) => literal(row[column])).join(', ')});`
      if (Buffer.byteLength(statement) > 100_000) throw new MigrationError(`Row exceeds SQL statement size limit in table ${table.name}`)
      statements.push(statement)
    }
  }
  return `${statements.join('\n')}\n`
}

export function verificationSql() {
  return `${TABLES.map((table) => `SELECT ${literal(table.name)} AS "__migration_table", ${table.columns.map(identifier).join(', ')} FROM ${identifier(table.name)} ORDER BY ${identifier(table.primaryKey)};`).join('\n')}\nPRAGMA foreign_key_check;\n`
}

export function migrationHistorySql() {
  const names = TABLES.map((table) => literal(table.name)).join(', ')
  return `-- Execute only after complete import and both full-data verifications succeed.
CREATE TABLE "__neon_d1_history_guard" ("ok" INTEGER NOT NULL CHECK ("ok" = 1));
INSERT INTO "__neon_d1_history_guard" ("ok") SELECT CASE WHEN
  (SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name IN (${names})) = ${TABLES.length}
  AND (SELECT count(*) FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'generation_credit_reservation' AND name IN ('credit_reservation_debit', 'credit_reservation_settle', 'credit_reservation_refund')) = 3
  THEN 1 ELSE 0 END;
DROP TABLE "__neon_d1_history_guard";
CREATE TABLE IF NOT EXISTS "d1_migrations" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" (name) VALUES ('0001_schema.sql'), ('0002_credit_triggers.sql') ON CONFLICT (name) DO NOTHING;
`
}

export function verifyD1Results(input, results) {
  const backup = validateBackup(input)
  if (!Array.isArray(results) || results.length !== TABLES.length + 1) throw new MigrationError('D1 verification result count mismatch')
  if (results.some((result) => result.success !== true || !Array.isArray(result.results))) throw new MigrationError('D1 verification statement failed')
  if (results.at(-1).results.length) throw new MigrationError('D1 foreign key check failed')
  let rows = 0
  for (const [index, table] of TABLES.entries()) {
    const received = results[index].results.map((row) => {
      const { __migration_table: name, ...data } = row
      if (name !== table.name) throw new MigrationError(`D1 result table mismatch: ${table.name}`)
      return data
    })
    const expected = backup.tables[table.name]
    if (received.length !== expected.rowCount) throw new MigrationError(`D1 row count mismatch: ${table.name}`)
    const normalized = normalizeRows(table, received)
    if (checksum(table, normalized) !== expected.sha256) throw new MigrationError(`D1 checksum mismatch: ${table.name}`)
    rows += received.length
  }
  return { verified: true, tables: TABLES.length, rows }
}

export async function exportSnapshot(sql) {
  // Explicit millisecond epoch projection avoids driver/timezone-dependent date parsing.
  const queries = [sql.query("SELECT c.table_name, c.column_name FROM information_schema.columns c JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE' AND c.table_name <> '__drizzle_migrations' ORDER BY c.table_name, c.ordinal_position")]
  for (const table of TABLES) {
    const columns = table.columns.map((column) => table.timestamps.includes(column)
      ? `trunc(extract(epoch FROM ${identifier(column)}) * 1000)::bigint AS ${identifier(column)}`
      : table.dates.includes(column) ? `${identifier(column)}::text AS ${identifier(column)}` : identifier(column))
    queries.push(sql.query(`SELECT ${columns.join(', ')} FROM public.${identifier(table.name)} ORDER BY ${identifier(table.primaryKey)}`))
  }
  let results
  try {
    results = await sql.transaction(queries, { isolationLevel: 'RepeatableRead', readOnly: true, fetchOptions: { signal: AbortSignal.timeout(60_000) } })
  } catch (error) {
    const status = error?.status ?? error?.statusCode ?? String(error?.message ?? '').match(/\b(40[12349]|50[0234])\b/)?.[1]
    // Never expose a connection string, database hostname, SQL values or a provider response body.
    throw new MigrationError(`Neon export failed${status ? ` (HTTP ${status})` : ''}; no backup was written. Restore source database access before retrying.`)
  }
  if (!Array.isArray(results) || results.length !== queries.length) throw new MigrationError('Incomplete Neon snapshot; no backup was written')
  const schema = results[0]
  if (!Array.isArray(schema)) throw new MigrationError('Missing source schema; no backup was written')
  const names = [...new Set(schema.map((row) => row.table_name))]
  if (!sameNames(names, TABLES.map((table) => table.name))) throw new MigrationError('Source application tables differ from this migration; no backup was written')
  for (const table of TABLES) {
    if (!sameNames(schema.filter((row) => row.table_name === table.name).map((row) => row.column_name), table.columns)) throw new MigrationError(`Source column mismatch: ${table.name}; no backup was written`)
  }
  return createBackup(Object.fromEntries(TABLES.map((table, index) => [table.name, results[index + 1]])))
}

async function writePrivateFile(file, contents) {
  await mkdir(path.dirname(path.resolve(file)), { recursive: true, mode: 0o700 })
  await writeFile(file, contents, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
}

export async function exportSnapshotToFile(sql, file) {
  try {
    await stat(file)
    throw Object.assign(new MigrationError('Output file already exists'), { code: 'EEXIST' })
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const backup = await exportSnapshot(sql)
  await writePrivateFile(file, `${JSON.stringify(backup, null, 2)}\n`)
  return Object.fromEntries(TABLES.map((table) => [table.name, { rowCount: backup.tables[table.name].rowCount, sha256: backup.tables[table.name].sha256 }]))
}

const USAGE = `Usage (all outputs contain private data; use an ignored private directory):
  node --env-file=.env.local scripts/migrate-neon-to-d1.mjs --export .private/neon-to-d1/snapshot.json
  node scripts/migrate-neon-to-d1.mjs --convert snapshot.json --output import.sql
  node scripts/migrate-neon-to-d1.mjs --verification-sql --output verify.sql
  node scripts/migrate-neon-to-d1.mjs --verify snapshot.json --d1-results verify-results.json
  node scripts/migrate-neon-to-d1.mjs --migration-history-sql --output record-history.sql
Export runs one read-only transaction with no retries. Existing files are never overwritten.
This script does not import, alter, or delete remote database data.`

async function main(argv) {
  const options = new Map()
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index]
    if (!['--export', '--convert', '--verify', '--verification-sql', '--migration-history-sql', '--output', '--d1-results', '--help'].includes(key) || options.has(key)) throw new MigrationError('Invalid or repeated command option; use --help')
    if (key === '--help' || key === '--verification-sql' || key === '--migration-history-sql') options.set(key, true)
    else {
      const value = argv[++index]
      if (!value || value.startsWith('--')) throw new MigrationError('Missing command option value; use --help')
      options.set(key, value)
    }
  }
  if (options.has('--help')) { console.log(USAGE); return }
  const modes = ['--export', '--convert', '--verify', '--verification-sql', '--migration-history-sql'].filter((key) => options.has(key))
  if (modes.length !== 1) throw new MigrationError('Select exactly one migration command; use --help')
  const mode = modes[0]
  if (mode === '--export') {
    if (options.size !== 1 || !process.env.DATABASE_URL) throw new MigrationError('Export requires DATABASE_URL in the process environment and only --export')
    const { neon } = await import('@neondatabase/serverless')
    const manifest = await exportSnapshotToFile(neon(process.env.DATABASE_URL), options.get(mode))
    console.log(JSON.stringify({ exported: true, manifest }, null, 2))
  } else if (mode === '--verification-sql' || mode === '--convert' || mode === '--migration-history-sql') {
    if (!options.has('--output') || options.size !== 2) throw new MigrationError('Conversion and verification SQL require --output')
    const contents = mode === '--convert' ? convertBackupToSql(JSON.parse(await readFile(options.get(mode), 'utf8')))
      : mode === '--migration-history-sql' ? migrationHistorySql() : verificationSql()
    await writePrivateFile(options.get('--output'), contents)
    console.log(JSON.stringify({ written: true }))
  } else {
    if (!options.has('--d1-results') || options.size !== 2) throw new MigrationError('Verification requires --d1-results')
    const [backup, results] = await Promise.all([options.get(mode), options.get('--d1-results')].map(async (file) => JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''))))
    console.log(JSON.stringify(verifyD1Results(backup, results)))
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error?.code === 'EEXIST' ? 'Output file already exists; choose a new private output path.' : error instanceof MigrationError ? error.message : 'Migration command failed; private input and provider details omitted.')
    process.exitCode = 1
  })
}
