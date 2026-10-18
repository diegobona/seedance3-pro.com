import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  TABLES, createBackup, convertBackupToSql, exportSnapshot,
  exportSnapshotToFile, migrationHistorySql, verificationSql, verifyD1Results,
} from '../scripts/migrate-neon-to-d1.mjs'

function fixture() {
  const raw = Object.fromEntries(TABLES.map((table) => [table.name, []]))
  for (const table of TABLES) {
    const row = Object.fromEntries(table.columns.map((column) => [column, 'fixture-text']))
    row[table.primaryKey] = table.name === 'launch_waitlist' ? 'user-1' : `${table.name}-1`
    for (const column of table.integers) row[column] = 0
    for (const column of table.timestamps) row[column] = '2026-10-18T12:34:56.123Z'
    if (table.columns.includes('user_id')) row.user_id = 'user-1'
    if (table.columns.includes('daily_credit_date')) row.daily_credit_date = '2026-10-18'
    raw[table.name].push(row)
  }
  Object.assign(raw.user[0], { id: 'user-1', name: "测试 O'Brien\nname", email: 'test@example.invalid', email_verified: true, credit_balance: 17, daily_free_credits: 2 })
  Object.assign(raw.generation_credit_reservation[0], { id: 'reservation-1', credits: 5, daily_free_credits: 1, status: 'reserved' })
  Object.assign(raw.video_generation_task[0], { reservation_id: 'reservation-1', status: 'running', duration: 5, workflow_id: 'workflow', resolution: '480p', aspect_ratio: '16:9', next_poll_at: null })
  Object.assign(raw.account[0], { account_id: 'provider-account', provider_id: 'google', access_token: "private-token'\n\u001ftail", password: 'private-password-hash' })
  raw.launch_waitlist[0].bonus_credits = 5
  return raw
}

function createSqlite() {
  const db = new DatabaseSync(':memory:')
  for (const table of TABLES) {
    db.exec(`CREATE TABLE "${table.name}" (${table.columns.map((column) => `"${column}" ${table.integers.includes(column) || table.timestamps.includes(column) || table.booleans.includes(column) ? 'INTEGER' : 'TEXT'}${column === table.primaryKey ? ' PRIMARY KEY' : ''}`).join(', ')});`)
  }
  return db
}

function readBack(db) {
  return verificationSql().split(';').filter((sql) => sql.trim()).map((sql) => ({ success: true, results: db.prepare(sql).all().map((row) => ({ ...row })) }))
}

test('converts every application table without losing identities, credit amounts, secrets, dates or nulls', () => {
  const backup = createBackup(fixture(), { exportedAt: '2026-10-19T00:00:00.000Z' })
  const db = createSqlite()
  try {
    db.exec(convertBackupToSql(backup))
    assert.equal(db.prepare('SELECT credit_balance FROM "user"').get().credit_balance, 17)
    assert.equal(db.prepare('SELECT email_verified FROM "user"').get().email_verified, 1)
    assert.equal(db.prepare('SELECT created_at FROM "user"').get().created_at, 1792326896123)
    assert.equal(db.prepare('SELECT daily_credit_date FROM "user"').get().daily_credit_date, '2026-10-18')
    assert.equal(db.prepare('SELECT access_token FROM account').get().access_token, "private-token'\n\u001ftail")
    assert.equal(db.prepare('SELECT next_poll_at FROM video_generation_task').get().next_poll_at, null)
    assert.deepEqual(verifyD1Results(backup, readBack(db)), { verified: true, tables: 8, rows: 8 })
  } finally { db.close() }
})

test('imports into the real D1 baseline before triggers without re-debiting existing reservations', async () => {
  const backup = createBackup(fixture())
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(await readFile(new URL('../migrations/d1/0001_schema.sql', import.meta.url), 'utf8'))
    db.exec(convertBackupToSql(backup))
    assert.deepEqual(verifyD1Results(backup, readBack(db)), { verified: true, tables: 8, rows: 8 })
    db.exec(await readFile(new URL('../migrations/d1/0002_credit_triggers.sql', import.meta.url), 'utf8'))
    assert.equal(db.prepare('SELECT credit_balance FROM "user"').get().credit_balance, 17)
    assert.equal(db.prepare('SELECT credits FROM generation_credit_reservation').get().credits, 5)
    assert.deepEqual(verifyD1Results(backup, readBack(db)), { verified: true, tables: 8, rows: 8 })
  } finally { db.close() }
})

test('records manually installed migration files only after baseline and accounting triggers exist', async () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(await readFile(new URL('../migrations/d1/0001_schema.sql', import.meta.url), 'utf8'))
    assert.throws(() => db.exec(migrationHistorySql()), /CHECK constraint failed/)
    assert.equal(db.prepare("SELECT count(*) AS total FROM sqlite_master WHERE name='d1_migrations'").get().total, 0)
    // A remote file import rolls back on failure. Clear this local autocommit guard only.
    db.exec('DROP TABLE "__neon_d1_history_guard"')
    db.exec(await readFile(new URL('../migrations/d1/0002_credit_triggers.sql', import.meta.url), 'utf8'))
    db.exec(migrationHistorySql())
    db.exec(migrationHistorySql())
    assert.deepEqual(db.prepare('SELECT name FROM d1_migrations ORDER BY id').all().map((row) => row.name), ['0001_schema.sql', '0002_credit_triggers.sql'])
  } finally { db.close() }
})

test('rejects modified backup values and same-count D1 data corruption', () => {
  const backup = createBackup(fixture())
  const tampered = structuredClone(backup)
  tampered.tables.user.rows[0].credit_balance += 1
  assert.throws(() => convertBackupToSql(tampered), /checksum.*user/i)
  const db = createSqlite()
  try {
    db.exec(convertBackupToSql(backup))
    db.exec('UPDATE "user" SET credit_balance = 999')
    assert.throws(() => verifyD1Results(backup, readBack(db)), /checksum.*user/i)
    const results = readBack(db)
    results.at(-1).results.push({ table: 'account', rowid: 1, parent: 'user', fkid: 0 })
    assert.throws(() => verifyD1Results(backup, results), /foreign.key/i)
  } finally { db.close() }
})

test('refuses to replay imports into populated databases or with accounting triggers enabled', () => {
  const backup = createBackup(fixture())
  const sql = convertBackupToSql(backup)
  const db = createSqlite()
  try {
    db.exec(sql)
    assert.throws(() => db.exec(sql), /CHECK constraint failed/)
  } finally { db.close() }
  const withTrigger = createSqlite()
  try {
    withTrigger.exec('CREATE TRIGGER credit_guard AFTER INSERT ON "user" BEGIN SELECT 1; END')
    assert.throws(() => withTrigger.exec(sql), /CHECK constraint failed/)
    assert.equal(withTrigger.prepare('SELECT count(*) AS total FROM "user"').get().total, 0)
  } finally { withTrigger.close() }
})

test('fails closed for missing tables, unknown columns, invalid values and broken source references', () => {
  const missing = fixture()
  delete missing.account
  assert.throws(() => createBackup(missing), /table.*account/i)
  const unknown = fixture()
  unknown.user[0].future_column = 'unmigrated'
  assert.throws(() => createBackup(unknown), /column.*user/i)
  const invalidDate = fixture()
  invalidDate.user[0].daily_credit_date = '2026-02-30'
  assert.throws(() => createBackup(invalidDate), /date/i)
  const invalidTimestamp = fixture()
  invalidTimestamp.user[0].created_at = true
  assert.throws(() => createBackup(invalidTimestamp), /timestamp/i)
  const dangling = fixture()
  dangling.video_generation_task[0].reservation_id = 'missing'
  assert.throws(() => createBackup(dangling), /reference/i)
  const nulText = fixture()
  nulText.account[0].access_token = 'not-valid-postgres-text\u0000tail'
  assert.throws(() => createBackup(nulText), /text/i)
})

test('exports one consistent read-only transaction and stops without a backup when Neon is suspended', async () => {
  const raw = fixture()
  const schema = TABLES.flatMap((table) => table.columns.map((column_name) => ({ table_name: table.name, column_name })))
  let transactions = 0
  const sql = {
    query: (query) => query,
    transaction: async (queries, options) => {
      transactions++
      assert.equal(queries.length, TABLES.length + 1)
      assert.equal(options.isolationLevel, 'RepeatableRead')
      assert.equal(options.readOnly, true)
      assert.ok(queries.every((query) => /^SELECT\b/i.test(query)))
      return [schema, ...TABLES.map((table) => raw[table.name])]
    },
  }
  const backup = await exportSnapshot(sql)
  assert.equal(backup.tables.user.rowCount, 1)
  assert.equal(transactions, 1)
  const directory = await mkdtemp(path.join(os.tmpdir(), 'seedance3-d1-export-'))
  const file = path.join(directory, 'snapshot.json')
  let calls = 0
  await assert.rejects(exportSnapshotToFile({ ...sql, transaction: async () => { calls++; const error = new Error('HTTP 402 private host and sensitive detail'); error.status = 402; throw error } }, file), /Neon export failed.*402/)
  assert.equal(calls, 1)
  await assert.rejects(stat(file), /ENOENT/)
  await exportSnapshotToFile(sql, file)
  const first = await readFile(file, 'utf8')
  const callsBeforeExistingFile = transactions
  await assert.rejects(exportSnapshotToFile(sql, file), /exist/i)
  assert.equal(transactions, callsBeforeExistingFile)
  assert.equal(await readFile(file, 'utf8'), first)
})

test('CLI omits private JSON and connection details from errors', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'seedance3-d1-private-input-'))
  const file = path.join(directory, 'invalid-backup.json')
  const privateMarker = 'PRIVATE_ACCOUNT_TOKEN_MUST_NOT_APPEAR'
  await writeFile(file, `{"password":"${privateMarker}`)
  const result = spawnSync(process.execPath, ['scripts/migrate-neon-to-d1.mjs', '--convert', file, '--output', path.join(directory, 'import.sql')], { cwd: path.resolve(import.meta.dirname, '..'), encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.ok(!`${result.stdout}${result.stderr}`.includes(privateMarker))
  assert.match(result.stderr, /private input.*omitted/i)
  await assert.rejects(stat(path.join(directory, 'import.sql')), /ENOENT/)
})

test('verification rejects missing tables, failed D1 statements and extra rows', () => {
  const backup = createBackup(fixture())
  const db = createSqlite()
  try {
    db.exec(convertBackupToSql(backup))
    const missing = readBack(db)
    missing.splice(2, 1)
    assert.throws(() => verifyD1Results(backup, missing), /result/i)
    const failed = readBack(db)
    failed[0].success = false
    assert.throws(() => verifyD1Results(backup, failed), /failed/i)
    const extra = readBack(db)
    extra[0].results.push({ ...extra[0].results[0], id: 'extra' })
    assert.throws(() => verifyD1Results(backup, extra), /count.*user/i)
  } finally { db.close() }
})
