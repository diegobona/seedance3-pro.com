import assert from 'node:assert/strict'
import test from 'node:test'
import * as databases from '../src/db'

test('database backend selection stages D1 explicitly and fails closed if a selected binding is missing', () => {
  const create = (databases as Record<string, unknown>).createAppDatabase as undefined | ((environment: unknown) => unknown)
  assert.equal(typeof create, 'function', 'an application backend selector is required')
  const db = { prepare() {}, batch() {} }
  assert.equal(create!({ DB: db, DATABASE_BACKEND: 'd1' }), db)
  assert.throws(() => create!({ DATABASE_BACKEND: 'd1', DATABASE_URL: 'postgresql://unused.example/db' }), /D1.*binding/i)
  assert.throws(() => create!({ DATABASE_BACKEND: 'unknown', DB: db }), /backend/i)
  // A staged binding must not switch production until the verified cutover.
  assert.throws(() => create!({ DB: db }), /DATABASE_URL/)
  assert.notEqual(create!({ DB: db, DATABASE_URL: 'postgresql://user:password@unused.example/db', DATABASE_BACKEND: 'neon' }), db)
})
