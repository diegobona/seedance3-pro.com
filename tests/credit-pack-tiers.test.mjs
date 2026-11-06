import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { CREDIT_PACKS, creditPack, creditPackValue } from '../assets/credit-packs.mjs';
import { renderCreditPackCard } from '../assets/credit-pack-cards.mjs';

test('three new packs match the approved prices, bonuses and video allowances; only $49.90 is popular', () => {
  assert.deepEqual(CREDIT_PACKS.map(({ amount, credits, bonus, popular }) => [amount, credits, bonus, !!popular]), [
    [1190, 1100, 100, false], [2490, 3000, 500, false], [4990, 6500, 1500, true],
  ]);
  assert.equal(creditPack('starter'), null, 'old cached checkout IDs must not silently buy a higher-priced pack');
  assert.equal(creditPack('creator'), null);
});

test('both languages distinguish bonus rates from savings and reserve the popular badge for Pro', () => {
  assert.deepEqual(CREDIT_PACKS.map(pack => creditPackValue(pack).savingsPercent), ['0.0','23.3','29.0']);
  assert.deepEqual(CREDIT_PACKS.map(pack => creditPackValue(pack).bonusPercent), [10,20,30]);
  for (const locale of ['en', 'zh']) {
    for (const pack of CREDIT_PACKS) {
      const html = renderCreditPackCard(pack, locale);
      assert.ok(html.includes((pack.amount / 100).toFixed(2)));
      assert.ok(html.includes(pack.credits.toLocaleString('en-US')));
      assert.equal(html.includes(locale === 'zh' ? '最受欢迎' : 'MOST POPULAR'), pack.popular);
      assert.ok(html.includes(`pack=${pack.id}`));
    }
  }
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
