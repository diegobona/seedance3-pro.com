import assert from 'node:assert/strict'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { PGlite } from '@electric-sql/pglite'
import { TABLES } from '../scripts/migrate-neon-to-d1.mjs'

const loadGuard = () => import('../scripts/neon-cutover-guard.mjs')
const quoted = (name: string) => `"${name.replaceAll('"', '""')}"`

async function fixture() {
  const db = new PGlite()
  for (const table of TABLES) {
    await db.exec(`CREATE TABLE public.${quoted(table.name)} (id text PRIMARY KEY, value text); INSERT INTO public.${quoted(table.name)} VALUES ('existing', 'original');`)
  }
  await db.exec(`CREATE TABLE public.unrelated_table (id text PRIMARY KEY, value text);
    CREATE FUNCTION public.unrelated_trigger() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.value = 'unrelated trigger preserved'; RETURN NEW; END $$;
    CREATE TRIGGER unrelated_trigger BEFORE INSERT ON public.unrelated_table FOR EACH ROW EXECUTE FUNCTION public.unrelated_trigger();
    CREATE TRIGGER unrelated_application_trigger BEFORE INSERT ON public."user" FOR EACH ROW EXECUTE FUNCTION public.unrelated_trigger();`)
  return db
}

async function apply(db: PGlite, action: 'install' | 'remove') {
  const { buildNeonCutoverGuardStatements } = await loadGuard()
  await db.transaction(async (tx) => {
    for (const statement of buildNeonCutoverGuardStatements(action)) await tx.exec(statement)
  })
}

test('source cutover guard blocks every mutation on all application tables while reads and unrelated writes work', async () => {
  const db = await fixture()
  try {
    await apply(db, 'install')
    for (const table of TABLES) {
      for (const mutation of [
        `INSERT INTO public.${quoted(table.name)} VALUES ('new', 'changed')`,
        `INSERT INTO public.${quoted(table.name)} SELECT 'new', 'changed' WHERE false`,
        `UPDATE public.${quoted(table.name)} SET value = 'changed' WHERE false`,
        `DELETE FROM public.${quoted(table.name)} WHERE false`,
        `TRUNCATE public.${quoted(table.name)}`,
      ]) await assert.rejects(db.exec(mutation), (error: { code?: string; message?: string }) => {
        assert.equal(error.code, '25006')
        assert.match(error.message ?? '', /migration/i)
        return true
      })
      assert.deepEqual((await db.query(`SELECT * FROM public.${quoted(table.name)}`)).rows, [{ id: 'existing', value: 'original' }])
    }
    // Read-only source export may inspect DDL; the guard only targets row mutations.
    await db.exec('CREATE TABLE public.export_scratch (id text); DROP TABLE public.export_scratch;')
    await db.exec("INSERT INTO public.unrelated_table VALUES ('unrelated', 'input')")
    assert.deepEqual((await db.query('SELECT value FROM public.unrelated_table')).rows, [{ value: 'unrelated trigger preserved' }])
  } finally { await db.close() }
})

test('guard installation and removal are idempotent and removal restores application writes without removing unrelated triggers', async () => {
  const db = await fixture()
  try {
    await apply(db, 'install')
    await apply(db, 'install')
    assert.equal((await db.query<{ count: number }>("SELECT count(*)::int AS count FROM pg_trigger WHERE tgname = '_seedance3_d1_cutover_readonly' AND NOT tgisinternal")).rows[0].count, TABLES.length)
    await apply(db, 'remove')
    await apply(db, 'remove')
    for (const table of TABLES) {
      await db.exec(`UPDATE public.${quoted(table.name)} SET value = 'restored'; INSERT INTO public.${quoted(table.name)} VALUES ('new', 'new'); DELETE FROM public.${quoted(table.name)} WHERE id = 'new';`)
      assert.deepEqual((await db.query(`SELECT value FROM public.${quoted(table.name)}`)).rows, [{ value: 'restored' }])
      await db.exec(`TRUNCATE public.${quoted(table.name)}`)
    }
    assert.equal((await db.query<{ count: number }>("SELECT count(*)::int AS count FROM pg_proc WHERE proname = '_seedance3_d1_cutover_readonly'")).rows[0].count, 0)
    assert.equal((await db.query<{ count: number }>("SELECT count(*)::int AS count FROM pg_trigger WHERE tgname = 'unrelated_application_trigger' AND NOT tgisinternal")).rows[0].count, 1)
    await db.exec("INSERT INTO public.unrelated_table VALUES ('unrelated', 'input')")
    assert.deepEqual((await db.query('SELECT value FROM public.unrelated_table')).rows, [{ value: 'unrelated trigger preserved' }])
  } finally { await db.close() }
})

test('guard transaction refuses partial installation when an application table is missing', async () => {
  const db = await fixture()
  try {
    await db.exec(`DROP TABLE public.${quoted(TABLES.at(-1)!.name)}`)
    await assert.rejects(apply(db, 'install'), /does not exist/)
    assert.equal((await db.query<{ count: number }>("SELECT count(*)::int AS count FROM pg_trigger WHERE tgname = '_seedance3_d1_cutover_readonly' AND NOT tgisinternal")).rows[0].count, 0)
    await db.exec(`UPDATE public.${quoted(TABLES[0].name)} SET value = 'still writable'`)
  } finally { await db.close() }
})

test('builder rejects unsupported actions and CLI fails without revealing private connection details', async () => {
  const { buildNeonCutoverGuardStatements } = await loadGuard()
  assert.throws(() => Reflect.apply(buildNeonCutoverGuardStatements, null, ['invalid']), /action/i)
  const env = { ...process.env }
  Reflect.deleteProperty(env, 'DATABASE_URL')
  const result = spawnSync(process.execPath, ['scripts/neon-cutover-guard.mjs', '--install'], { encoding: 'utf8', env })
  assert.equal(result.status, 1)
  assert.equal(result.stdout, '')
  assert.match(result.stderr, /guard.*failed/i)
  assert.doesNotMatch(result.stderr, /postgres(?:ql)?:\/\/|SELECT|CREATE|DATABASE_URL=/i)
})
