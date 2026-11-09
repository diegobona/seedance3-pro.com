import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { CREDIT_PACKS, creditPack, creditPackValue } from '../assets/credit-packs.mjs';
import { renderCreditPackCard } from '../assets/credit-pack-cards.mjs';

test('new packs have exact prices, output and default selection', () => {
 assert.deepEqual(CREDIT_PACKS.map(p=>[p.id,p.amount,p.credits,p.videoCount]),[['starter',999,700,140],['creator',1999,1600,320],['studio',4999,4500,900]]);
 assert.deepEqual(CREDIT_PACKS.map(p=>p.bonusCredits),[0,150,850]);
 assert.equal(creditPack().id,'creator');assert.equal(creditPack('unknown').id,'creator');
 assert.deepEqual(CREDIT_PACKS.map(p=>creditPackValue(p).minutes),['11.7','26.7','75.0']);
 assert.deepEqual(CREDIT_PACKS.map(p=>creditPackValue(p).videoPrice),['0.0714','0.0625','0.0555']);
 assert.deepEqual(CREDIT_PACKS.map(p=>creditPackValue(p).unitPrice),['0.014','0.012','0.011']);
 for(const locale of ['en','zh'])for(const pack of CREDIT_PACKS){const html=renderCreditPackCard(pack,locale);assert.ok(html.includes(`<h2>${pack.name}</h2>`));assert.ok(html.includes(`pack=${pack.id}`));assert.ok(html.indexOf('credit-tier-output')<html.indexOf('credit-tier-credits'));assert.ok(html.includes('target="_blank" rel="noopener noreferrer"'));}
});

test('new pack migration preserves old payments and refunds and enforces amount/credit pairs', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys=ON');
    const files = readdirSync('migrations/d1').filter(f => f.endsWith('.sql')).sort();
    for (const file of files.filter(f => f < '0016')) db.exec(readFileSync('migrations/d1/' + file, 'utf8'));
    db.exec(`INSERT INTO "user"(id,name,email,credit_balance) VALUES('tier-user','Test','tiers@example.test',17);
      INSERT INTO stripe_order(id,user_id,price_id,live_mode,amount,credits,status,payment_intent_id,credited_credits)
      VALUES('old','tier-user','price_old',0,499,500,'paid','pi_old',500),('old-pending','tier-user','price_old_creator',0,999,1100,'pending',NULL,0);
      INSERT INTO refund_request(id,order_id,user_id,email,reason,status,notification_sent_at) VALUES('req','old','tier-user','tiers@example.test','Unused credits','approved',123);
      INSERT INTO stripe_payment_refund(id,order_id,amount,currency,status) VALUES('re_old','old',499,'usd','succeeded');`);
    const tables = ['user', 'stripe_order', 'refund_request', 'stripe_payment_refund'];
    const before = tables.map(t => db.prepare(`SELECT * FROM "${t}"`).all());
    db.exec('BEGIN');
    for (const file of files.filter(f => f >= '0016')) db.exec(readFileSync('migrations/d1/' + file, 'utf8'));
    db.exec('COMMIT');
    tables.forEach((t, i) => assert.deepEqual(db.prepare(`SELECT * FROM "${t}"`).all(), before[i]));
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    for (const [amount, credits] of [[1190,1100],[2490,3000],[4990,6500]]) {
      db.prepare('INSERT INTO stripe_order(id,user_id,price_id,live_mode,amount,credits) VALUES(?,?,?,?,?,?)').run(`new-${amount}`, 'tier-user', 'price_new', 0, amount, credits);
      db.prepare("UPDATE stripe_order SET status='paid' WHERE id=?").run(`new-${amount}`);
    }
    assert.equal(db.prepare('SELECT credit_balance FROM "user"').get().credit_balance, 10617);
    db.exec("UPDATE stripe_order SET status='paid' WHERE id='old-pending'");
    assert.equal(db.prepare('SELECT credit_balance FROM "user"').get().credit_balance, 11717);
    assert.throws(() => db.exec("INSERT INTO stripe_order(id,user_id,price_id,live_mode,amount,credits) VALUES('bad','tier-user','price_bad',0,1190,6500)"));
  } finally { db.close(); }
});
