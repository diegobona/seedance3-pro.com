import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';

test('pack migration preserves existing payments, refunds, delivery state and balances with foreign keys enabled',()=>{
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 const files=readdirSync('migrations/d1').filter(f=>f.endsWith('.sql')).sort();
 for(const file of files.filter(f=>f<'0015')) db.exec(readFileSync('migrations/d1/'+file,'utf8'));
 db.exec(`INSERT INTO "user"(id,name,email,credit_balance,daily_free_credits) VALUES ('migration-user','Test','migration@example.test',17,0);
 INSERT INTO stripe_order(id,user_id,price_id,live_mode,payment_intent_id,status,credited_credits) VALUES('old-order','migration-user','price_old',0,'pi_old','paid',500);
 INSERT INTO refund_request(id,order_id,user_id,email,reason,status,notification_sent_at,notification_attempts) VALUES('request-old','old-order','migration-user','migration@example.test','Unused credit pack','approved',123,2);
 INSERT INTO stripe_payment_refund(id,order_id,amount,currency,status) VALUES('re_old','old-order',499,'usd','succeeded');`);
 const before={};for(const table of ['user','stripe_order','refund_request','stripe_payment_refund'])before[table]=db.prepare(`SELECT * FROM "${table}"`).all();
 db.exec('BEGIN');db.exec(readFileSync('migrations/d1/0015_credit_pack_choices.sql','utf8'));db.exec('COMMIT');
 for(const table of Object.keys(before))assert.deepEqual(db.prepare(`SELECT * FROM "${table}"`).all(),before[table],table);
 assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 assert.throws(()=>db.exec(`INSERT INTO stripe_order(id,user_id,price_id,live_mode,amount,credits) VALUES('bad','migration-user','price_bad',0,499,1100)`));
 db.exec(`INSERT INTO stripe_order(id,user_id,price_id,live_mode,amount,credits) VALUES('new','migration-user','price_new',0,999,1100); UPDATE stripe_order SET status='paid' WHERE id='new';`);
 assert.equal(db.prepare('SELECT credit_balance FROM "user" WHERE id=?').get('migration-user').credit_balance,1117);
 db.close();
});
