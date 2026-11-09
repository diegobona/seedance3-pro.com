import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

for (const upgrade of ['0017', '0018']) test(`pack migrations from ${upgrade} preserve historical orders, refunds, reversals, delivery state and balances`, () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys=ON');
    const files = readdirSync('migrations/d1').filter(file => file.endsWith('.sql')).sort();
    for (const file of files.filter(file => file < upgrade)) db.exec(readFileSync('migrations/d1/' + file, 'utf8'));
    db.exec(`INSERT INTO "user"(id,name,email,credit_balance,daily_free_credits) VALUES ('migration-owner','Test','migration@example.test',17,0);
      INSERT INTO stripe_order(id,user_id,price_id,live_mode,session_id,payment_intent_id,amount,credits,status,credited_credits,revoked_credits,removed_credits,created_at,updated_at) VALUES
        ('old-pending','migration-owner','price_pending',0,'cs_pending',NULL,1190,1100,'pending',0,0,0,101,102),
        ('old-paid','migration-owner','price_paid',0,'cs_paid','pi_paid',2490,3000,'paid',3000,0,0,201,202),
        ('old-reversed','migration-owner','price_reversed',0,'cs_reversed','pi_reversed',4990,6500,'reversed',6500,6500,103,301,302);
      INSERT INTO stripe_event(id,object_id,kind) VALUES ('evt_old','old-paid','payment');
      INSERT INTO stripe_reversal(payment_intent_id,reason) VALUES ('pi_reversed','charge.refunded');
      INSERT INTO refund_request(id,order_id,user_id,email,reason,status,note,reviewed_by,version,notification_sent_at,notification_attempts,notification_next_at,notification_claim)
        VALUES ('old-request','old-paid','migration-owner','migration@example.test','Unused credit pack','approved','Reviewed','reviewer',3,123,2,456,'claim_1');
      INSERT INTO stripe_payment_refund(id,order_id,amount,currency,status) VALUES ('re_old','old-paid',2490,'usd','succeeded');`);
    if (upgrade === '0018') db.exec(`INSERT INTO stripe_order(id,user_id,price_id,live_mode,session_id,payment_intent_id,amount,credits,status,credited_credits) VALUES
      ('creator-before-bonus','migration-owner','price_creator_old',0,'cs_creator_old',NULL,1999,1450,'pending',0),
      ('studio-before-bonus','migration-owner','price_studio_old',0,'cs_studio_old','pi_studio_old',4999,3650,'paid',3650);
      INSERT INTO refund_request(id,order_id,user_id,email,reason,status)
        VALUES ('studio-old-request','studio-before-bonus','migration-owner','migration@example.test','Unused Studio pack','pending');
      INSERT INTO stripe_payment_refund(id,order_id,amount,currency,status)
        VALUES ('re_studio_old','studio-before-bonus',4999,'usd','pending');`);
    const tables = ['user', 'stripe_order', 'stripe_event', 'stripe_reversal', 'refund_request', 'stripe_payment_refund'];
    const before = Object.fromEntries(tables.map(table => [table, db.prepare(`SELECT * FROM "${table}" ORDER BY 1`).all()]));
    const schemaObjects = db.prepare("SELECT type,name,sql FROM sqlite_master WHERE type IN ('trigger','index') AND sql IS NOT NULL ORDER BY name").all();
    db.exec('BEGIN');
    for (const file of files.filter(file => file >= upgrade)) db.exec(readFileSync('migrations/d1/' + file, 'utf8'));
    db.exec('COMMIT');
    for (const table of tables) assert.deepEqual(db.prepare(`SELECT * FROM "${table}" ORDER BY 1`).all(), before[table], table);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.deepEqual(db.prepare("SELECT type,name,sql FROM sqlite_master WHERE type IN ('trigger','index') AND sql IS NOT NULL ORDER BY name").all(), schemaObjects);
    const insert = db.prepare('INSERT INTO stripe_order(id,user_id,price_id,live_mode,amount,credits,payment_intent_id) VALUES (?,\'migration-owner\',\'price_new\',0,?,?,?)');
    let balance = 17;
    for (const [amount, credits] of [[999, 700], [1999, 1600], [4999, 4500], [1999, 1450], [4999, 3650], [499, 500], [999, 1100], [1190, 1100], [2490, 3000], [4990, 6500]]) {
      const id = `pack_${amount}_${credits}`;
      insert.run(id, amount, credits, `pi_${id}`);
      db.prepare("UPDATE stripe_order SET status='paid' WHERE id=?").run(id);
      balance += credits;
      assert.equal(db.prepare('SELECT credit_balance FROM "user" WHERE id=?').get('migration-owner').credit_balance, balance);
      db.prepare("INSERT INTO stripe_reversal(payment_intent_id,reason) VALUES (?,'charge.refunded')").run(`pi_${id}`);
      balance -= credits;
      assert.equal(db.prepare('SELECT credit_balance FROM "user" WHERE id=?').get('migration-owner').credit_balance, balance);
      assert.equal(db.prepare('SELECT revoked_credits FROM stripe_order WHERE id=?').get(id).revoked_credits, credits);
    }
    for (const [amount, credits] of [[999, 1450], [1999, 700], [4999, 6500], [1, 3650], [999, 1600], [1999, 4500], [4999, 1600]]) {
      assert.throws(() => insert.run(`bad_${amount}_${credits}`, amount, credits, `pi_bad_${amount}_${credits}`), /CHECK constraint failed/);
    }
    db.exec("INSERT INTO stripe_order(id,user_id,price_id,live_mode) VALUES ('default','migration-owner','price_default',0)");
    const defaultOrder = db.prepare("SELECT amount,credits FROM stripe_order WHERE id='default'").get();
    assert.deepEqual({ ...defaultOrder }, { amount: 1999, credits: 1600 });
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally { db.close(); }
});
